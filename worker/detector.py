"""Analyze sampled worksite video frames with OpenAI vision."""

import base64
import logging
from typing import Any, Dict, List, Literal

import cv2
import numpy as np
from pydantic import BaseModel, Field

from .openai_client import MODEL, get_openai_client
from .osha_citations import OSHA_CITATIONS, hydrate_citation

logger = logging.getLogger(__name__)


class _Violation(BaseModel):
    violation_type: str
    description: str
    osha_citation: str
    severity: Literal["critical", "high", "medium", "low"]
    confidence: float = Field(ge=0, le=1)


class _FrameAnalysis(BaseModel):
    violations: list[_Violation]


_SYSTEM_PROMPT = """Review a single worksite video frame for visible safety hazards.

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

Use the listed violation types. Describe the visible evidence, cite the relevant
standard, and assign a severity and confidence. Include only findings supported
by the frame. If no hazards are visible, return an empty violations list."""


def detect_violations(frame: np.ndarray, timestamp: float) -> List[Dict[str, Any]]:
    """Return the findings for a frame, raising if the frame cannot be analyzed."""
    # Keep image input small enough for interactive processing.
    h, w = frame.shape[:2]
    if max(h, w) > 768:
        scale = 768 / max(h, w)
        frame = cv2.resize(frame, (max(1, int(w * scale)), max(1, int(h * scale))), interpolation=cv2.INTER_AREA)

    success, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    if not success:
        raise RuntimeError(f"Failed to encode frame at {timestamp:.1f}s")

    image_b64 = base64.standard_b64encode(buffer.tobytes()).decode("utf-8")
    response = get_openai_client().responses.parse(
        model=MODEL,
        instructions=_SYSTEM_PROMPT,
        input=[
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": "Analyze this worksite frame."},
                    {
                        "type": "input_image",
                        "image_url": f"data:image/jpeg;base64,{image_b64}",
                        "detail": "high",
                    },
                ],
            }
        ],
        text_format=_FrameAnalysis,
        max_output_tokens=1024,
        store=False,
    )
    analysis = response.output_parsed
    if response.status != "completed" or analysis is None:
        raise RuntimeError(f"OpenAI did not return a complete analysis for frame {timestamp:.1f}s")

    findings = []
    for violation in analysis.violations:
        if violation.violation_type not in OSHA_CITATIONS:
            raise RuntimeError(f"OpenAI returned an unknown finding type for frame {timestamp:.1f}s")
        findings.append(hydrate_citation(violation.model_dump()))
    logger.info("Frame %.1fs: found %d violation(s)", timestamp, len(findings))
    return findings
