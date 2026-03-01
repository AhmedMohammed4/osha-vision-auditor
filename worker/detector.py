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
- No hard hat / helmet (29 CFR 1926.100) → violation_type: "no_hard_hat"
- No eye/face protection when needed (29 CFR 1926.102) → violation_type: "no_eye_protection"
- No high-visibility safety vest (29 CFR 1926.651(d)) → violation_type: "no_safety_vest"
- No gloves when handling hazardous materials (29 CFR 1910.138) → violation_type: "no_gloves"
- Improper footwear / no steel-toed boots (29 CFR 1926.96) → violation_type: "improper_footwear"

**Fall Protection:**
- Worker at height without harness/fall arrest system (29 CFR 1926.502) → violation_type: "no_fall_harness"
- Missing/inadequate guardrails on elevated surfaces (29 CFR 1926.502) → violation_type: "fall_hazard"
- Unprotected floor/wall openings (29 CFR 1926.502) → violation_type: "fall_hazard"

**Ladders:**
- Unsafe ladder angle, placement, or condition (29 CFR 1926.1053) → violation_type: "unsafe_ladder"
- Ladder not extending 3 feet above landing (29 CFR 1926.1053) → violation_type: "unsafe_ladder"

**Scaffolding:**
- Missing guardrails, inadequate planking, or unsafe access (29 CFR 1926.451) → violation_type: "scaffold_violation"

**Electrical:**
- Exposed/damaged wiring or electrical equipment in wet conditions (29 CFR 1926.403) → violation_type: "electrical_hazard"

**Housekeeping:**
- Slip/trip hazards (debris, cords, spills) or blocked exits (29 CFR 1926.25) → violation_type: "housekeeping_hazard"

**Tools & Equipment:**
- Damaged/defective tools or improper tool use (29 CFR 1926.300) → violation_type: "tool_misuse"

**Excavation:**
- Unprotected trench or workers in excavation without protective system (29 CFR 1926.652) → violation_type: "excavation_hazard"

**Fire Safety:**
- Blocked fire extinguisher access or improper flammable storage (29 CFR 1926.150) → violation_type: "fire_hazard"

Respond ONLY with a valid JSON array. Each element must have exactly these fields:
- "violation_type": snake_case string from the list above
- "description": specific description of what you observe in this image
- "osha_citation": the relevant OSHA standard (e.g., "29 CFR 1926.100")
- "severity": one of "critical", "high", "medium", or "low"
- "confidence": float 0.0–1.0

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
        logger.warning("ANTHROPIC_API_KEY not set — skipping Claude vision analysis.")
        return []

    # Resize to max 768px wide — reduces token cost ~60% vs full HD
    h, w = frame.shape[:2]
    if w > 768:
        scale = 768 / w
        frame = cv2.resize(frame, (768, int(h * scale)), interpolation=cv2.INTER_AREA)

    # JPEG-encode frame and convert to base64
    success, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    if not success:
        logger.error(f"Failed to encode frame at t={timestamp:.1f}s")
        return []

    image_b64 = base64.standard_b64encode(buffer.tobytes()).decode("utf-8")

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=_SYSTEM_PROMPT,
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
                            "text": "Analyze this construction site frame for OSHA violations. Respond with JSON only.",
                        },
                    ],
                }
            ],
        )

        raw_text = response.content[0].text.strip()

        # Strip markdown code fences if Claude includes them
        if raw_text.startswith("```"):
            lines = raw_text.splitlines()
            # Remove opening fence (```json or ```) and closing fence (```)
            start = 1
            end = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
            raw_text = "\n".join(lines[start:end]).strip()

        violations = json.loads(raw_text)

        if not isinstance(violations, list):
            logger.warning(
                f"t={timestamp:.1f}s: Claude returned non-list JSON — treating as no violations"
            )
            return []

        normalized = [hydrate_citation(v) for v in violations if isinstance(v, dict)]

        logger.info(
            f"t={timestamp:.1f}s: Claude detected {len(normalized)} violation(s)"
        )
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
