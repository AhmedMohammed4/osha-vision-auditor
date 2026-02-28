"""
OSHA risk score calculator.

Produces a normalized 0–100 score based on weighted violation counts
relative to the total opportunity for violations in the video.
"""

import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

# Weights reflect relative severity of each violation type
VIOLATION_WEIGHTS: Dict[str, float] = {
    # Critical
    "fall_hazard": 9.0,
    "electrical_hazard": 9.0,
    "excavation_hazard": 8.0,
    "fire_hazard": 7.5,
    # High
    "no_fall_harness": 7.0,
    "no_hard_hat": 6.0,
    "unsafe_ladder": 6.0,
    "scaffold_violation": 5.0,
    # Medium
    "no_eye_protection": 4.0,
    "no_safety_vest": 3.0,
    "no_gloves": 3.0,
    "improper_footwear": 3.0,
    # Low
    "housekeeping_hazard": 2.0,
    "tool_misuse": 2.0,
    # Default fallback for unknown/new violation types
    "default": 3.0,
}

# Maximum weight used for normalization baseline
_MAX_WEIGHT_PER_FRAME = max(VIOLATION_WEIGHTS[k] for k in VIOLATION_WEIGHTS if k != "default")

# Conservative assumed max violations per frame for normalization
_MAX_VIOLATIONS_PER_FRAME = 4


def compute_risk_score(violations: List[Dict[str, Any]], total_sampled_frames: int) -> float:
    """
    Compute a normalized risk score between 0 and 100.

    Formula:
        max_possible = total_frames × max_weight_per_frame × max_violations_per_frame
        actual       = sum of weights for each detected violation
        score        = min(100, (actual / max_possible) × 100)

    Args:
        violations: List of violation dicts (each has 'violation_type' key).
        total_sampled_frames: Number of frames sampled during processing.

    Returns:
        Float in [0.0, 100.0].
    """
    if total_sampled_frames <= 0:
        return 0.0

    max_possible = (
        total_sampled_frames * _MAX_WEIGHT_PER_FRAME * _MAX_VIOLATIONS_PER_FRAME
    )
    actual = sum(
        VIOLATION_WEIGHTS.get(
            v.get("violation_type", ""),
            VIOLATION_WEIGHTS["default"]
        )
        for v in violations
    )

    score = min(100.0, round((actual / max_possible) * 100.0, 1))
    logger.info(
        f"Risk score: {score} "
        f"(actual={actual:.1f}, max_possible={max_possible:.1f}, "
        f"violations={len(violations)}, frames={total_sampled_frames})"
    )
    return score
