"""
Claude Vision-based OSHA violation detector.

Uses Claude claude-sonnet-4-6 to analyze construction site frames against
the full OSHA 29 CFR 1926 construction safety standard.
"""

import base64
import json
import logging
import os
from typing import Any, Dict, List

import anthropic
import cv2
import numpy as np

from .osha_citations import hydrate_citation

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are an expert OSHA 29 CFR 1926 construction safety inspector analyzing a single video frame from a construction site.

Examine the image carefully and identify ALL visible safety violations. Check across these categories:

**PPE Violations:**
- No hard hat / helmet (29 CFR 1926.100) -> violation_type: "no_hard_hat"
- No eye/face protection when needed (29 CFR 1926.102) -> violation_type: "no_eye_protection"
- No high-visibility safety vest (29 CFR 1926.651(d)) -> violation_type: "no_safety_vest"
- No gloves when handling hazardous materials (29 CFR 1910.138) -> violation_type: "no_gloves"
- Improper footwear / no steel-toed boots (29 CFR 1926.96) -> violation_type: "improper_footwear"

**Fall Protection:**
- Worker at height without harness/fall arrest system (29 CFR 1926.502) -> violation_type: "no_fall_harness"
- Missing/inadequate guardrails on elevated surfaces (29 CFR 1926.502) -> violation_type: "fall_hazard"
- Unprotected floor/wall openings (29 CFR 1926.502) -> violation_type: "fall_hazard"

**Ladders:**
- Unsafe ladder angle, placement, or condition (29 CFR 1926.1053) -> violation_type: "unsafe_ladder"
- Ladder not extending 3 feet above landing (29 CFR 1926.1053) -> violation_type: "unsafe_ladder"

**Scaffolding:**
- Missing guardrails, inadequate planking, or unsafe access (29 CFR 1926.451) -> violation_type: "scaffold_violation"

**Electrical:**
- Exposed/damaged wiring or electrical equipment in wet conditions (29 CFR 1926.403) -> violation_type: "electrical_hazard"

**Housekeeping:**
- Slip/trip hazards (debris, cords, spills) or blocked exits (29 CFR 1926.25) -> violation_type: "housekeeping_hazard"

**Tools & Equipment:**
- Damaged/defective tools or improper tool use (29 CFR 1926.300) -> violation_type: "tool_misuse"

**Excavation:**
- Unprotected trench or workers in excavation without protective system (29 CFR 1926.652) -> violation_type: "excavation_hazard"

**Fire Safety:**
- Blocked fire extinguisher access or improper flammable storage (29 CFR 1926.150) -> violation_type: "fire_hazard"

Respond ONLY with a valid JSON array. Each element must have exactly these fields:
- "violation_type": snake_case string from the list above
- "description": specific description of what you observe in this image
- "osha_citation": the relevant OSHA standard (e.g., "29 CFR 1926.100")
- "severity": one of "critical", "high", "medium", or "low"
- "confidence": float 0.0-1.0

If no violations are visible, respond with: []

Example:
[
  {
    "violation_type": "no_hard_hat",
    "description": "Worker in foreground not wearing hard hat while operating in active construction zone",
    "osha_citation": "29 CFR 1926.100",
    "severity": "high",
    "confidence": 0.95
  }
]"""

_LIVE_SYSTEM_PROMPT = """You are evaluating a single live camera frame for OSHA-related safety monitoring.

First determine whether this image shows an active construction or industrial work context where OSHA construction-style PPE and hazard rules are plausibly relevant.

Set "scene_context" to exactly one of:
- "construction": clear construction site, industrial work area, or active jobsite context
- "non_construction": ordinary home, office, vehicle interior, classroom, or other non-worksite context
- "unclear": not enough visual evidence to be confident either way

Important:
- Do not assume a hard hat, vest, or other PPE is required just because a person is visible.
- In a non-construction scene, missing PPE by itself is not a violation.
- Only report violations that are directly supported by visible evidence in the frame.

Respond ONLY with a valid JSON object with exactly these fields:
- "scene_context": one of "construction", "non_construction", "unclear"
- "scene_confidence": float 0.0-1.0
- "summary": short plain-English sentence describing why you classified the scene that way
- "violations": JSON array, where each element has exactly these fields:
  - "violation_type": snake_case string from the OSHA list below
  - "description": specific description of what you observe in this image
  - "osha_citation": the relevant OSHA standard (e.g., "29 CFR 1926.100")
  - "severity": one of "critical", "high", "medium", or "low"
  - "confidence": float 0.0-1.0

Allowed violation_type values:
- "no_hard_hat"
- "no_eye_protection"
- "no_safety_vest"
- "no_gloves"
- "improper_footwear"
- "no_fall_harness"
- "fall_hazard"
- "unsafe_ladder"
- "scaffold_violation"
- "electrical_hazard"
- "housekeeping_hazard"
- "tool_misuse"
- "excavation_hazard"
- "fire_hazard"

If no violations are visible, use "violations": []"""


def _encode_frame(frame: np.ndarray, timestamp: float) -> str:
    """Resize and JPEG-encode a frame, returning base64 image data."""
    h, w = frame.shape[:2]
    if w > 768:
        scale = 768 / w
        frame = cv2.resize(frame, (768, int(h * scale)), interpolation=cv2.INTER_AREA)

    success, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    if not success:
        raise RuntimeError(f"Failed to encode frame at t={timestamp:.1f}s")

    return base64.standard_b64encode(buffer.tobytes()).decode("utf-8")


def _extract_response_text(response: Any) -> str:
    """Normalize Claude text output and strip markdown fences if present."""
    raw_text = response.content[0].text.strip()
    if raw_text.startswith("```"):
        lines = raw_text.splitlines()
        start = 1
        end = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
        raw_text = "\n".join(lines[start:end]).strip()
    return raw_text


def _invoke_claude(
    image_b64: str,
    system_prompt: str,
    user_text: str,
    *,
    api_key: str,
    max_tokens: int = 1024,
) -> Any:
    """Send an image + prompt to Claude and return the raw response."""
    client = anthropic.Anthropic(api_key=api_key)
    return client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": user_text,
                    },
                ],
            }
        ],
    )


def detect_violations(frame: np.ndarray, timestamp: float) -> List[Dict[str, Any]]:
    """
    Analyze a video frame for OSHA violations using Claude Vision.

    Args:
        frame: BGR numpy array from OpenCV.
        timestamp: Frame timestamp in seconds (for logging).

    Returns:
        List of violation dicts with keys:
            violation_type, description, osha_citation, severity, confidence
        Returns empty list if API key is missing or any error occurs.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY not set - skipping Claude vision analysis.")
        return []

    try:
        image_b64 = _encode_frame(frame, timestamp)
        response = _invoke_claude(
            image_b64,
            _SYSTEM_PROMPT,
            "Analyze this construction site frame for OSHA violations. Respond with JSON only.",
            api_key=api_key,
        )
        raw_text = _extract_response_text(response)
        violations = json.loads(raw_text)

        if not isinstance(violations, list):
            logger.warning(
                f"t={timestamp:.1f}s: Claude returned non-list JSON - treating as no violations"
            )
            return []

        normalized = [hydrate_citation(v) for v in violations if isinstance(v, dict)]
        logger.info(f"t={timestamp:.1f}s: Claude detected {len(normalized)} violation(s)")
        return normalized

    except json.JSONDecodeError as exc:
        logger.error(f"t={timestamp:.1f}s: JSON parse error from Claude: {exc}")
        return []
    except anthropic.APIError as exc:
        logger.error(f"t={timestamp:.1f}s: Anthropic API error: {exc}")
        return []
    except Exception as exc:
        logger.error(f"t={timestamp:.1f}s: Unexpected error in detect_violations: {exc}")
        return []


def analyze_live_frame(frame: np.ndarray, timestamp: float) -> Dict[str, Any]:
    """
    Analyze a live camera frame and return explicit scene/status metadata.

    Returns:
        Dict with:
            status: issues_detected | clear | non_worksite | analysis_failed
            scene_context: construction | non_construction | unclear
            scene_confidence: 0.0-1.0
            summary: plain-English explanation of scene classification
            violations: hydrated violation list
            error: optional machine-readable failure reason
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY not set - live analysis unavailable.")
        return {
            "status": "analysis_failed",
            "scene_context": "unclear",
            "scene_confidence": 0.0,
            "summary": "Live AI analysis is unavailable because ANTHROPIC_API_KEY is not configured.",
            "violations": [],
            "error": "missing_api_key",
        }

    try:
        image_b64 = _encode_frame(frame, timestamp)
        response = _invoke_claude(
            image_b64,
            _LIVE_SYSTEM_PROMPT,
            "Classify the scene context and list any visible OSHA-related violations. Respond with JSON only.",
            api_key=api_key,
            max_tokens=1200,
        )
        raw_text = _extract_response_text(response)
        payload = json.loads(raw_text)

        if not isinstance(payload, dict):
            logger.warning(
                f"t={timestamp:.1f}s: Claude returned non-object JSON for live analysis"
            )
            return {
                "status": "analysis_failed",
                "scene_context": "unclear",
                "scene_confidence": 0.0,
                "summary": "Live AI returned an invalid response.",
                "violations": [],
                "error": "invalid_response_shape",
            }

        raw_context = str(payload.get("scene_context", "unclear")).strip().lower()
        if raw_context not in {"construction", "non_construction", "unclear"}:
            raw_context = "unclear"

        raw_violations = payload.get("violations", [])
        if not isinstance(raw_violations, list):
            raw_violations = []

        violations = [
            hydrate_citation(item)
            for item in raw_violations
            if isinstance(item, dict)
        ]

        try:
            scene_confidence = float(payload.get("scene_confidence", 0.0))
        except (TypeError, ValueError):
            scene_confidence = 0.0
        scene_confidence = max(0.0, min(1.0, scene_confidence))

        summary = str(payload.get("summary", "")).strip()
        if not summary:
            summary = "Scene context was analyzed from the current live frame."

        if violations:
            status = "issues_detected"
        elif raw_context == "non_construction":
            status = "non_worksite"
        else:
            status = "clear"

        logger.info(
            f"t={timestamp:.1f}s: live analysis status={status}, "
            f"scene_context={raw_context}, violations={len(violations)}"
        )

        return {
            "status": status,
            "scene_context": raw_context,
            "scene_confidence": scene_confidence,
            "summary": summary,
            "violations": violations,
            "error": None,
        }

    except json.JSONDecodeError as exc:
        logger.error(f"t={timestamp:.1f}s: JSON parse error from Claude (live): {exc}")
        return {
            "status": "analysis_failed",
            "scene_context": "unclear",
            "scene_confidence": 0.0,
            "summary": "Live AI returned unreadable output.",
            "violations": [],
            "error": "json_decode_error",
        }
    except anthropic.APIError as exc:
        logger.error(f"t={timestamp:.1f}s: Anthropic API error (live): {exc}")
        return {
            "status": "analysis_failed",
            "scene_context": "unclear",
            "scene_confidence": 0.0,
            "summary": "The live AI model is temporarily unavailable.",
            "violations": [],
            "error": "anthropic_api_error",
        }
    except Exception as exc:
        logger.error(f"t={timestamp:.1f}s: Unexpected error in analyze_live_frame: {exc}")
        return {
            "status": "analysis_failed",
            "scene_context": "unclear",
            "scene_confidence": 0.0,
            "summary": "Live frame analysis failed unexpectedly.",
            "violations": [],
            "error": "unexpected_error",
        }
