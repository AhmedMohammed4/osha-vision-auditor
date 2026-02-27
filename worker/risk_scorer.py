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
    "helmet_violation": 5.0,
    "vest_violation": 3.0,
}

# Maximum weight sum per person per frame (used for normalization baseline)
_MAX_WEIGHT_PER_PERSON = sum(VIOLATION_WEIGHTS.values())  # 8.0

# Conservative assumed max persons per frame for normalization
_MAX_PERSONS_PER_FRAME = 5


def compute_risk_score(violations: List[Dict[str, Any]], total_sampled_seconds: int) -> float:
    """
    Compute a normalized risk score between 0 and 100.

    Formula:
        max_possible = total_seconds × max_weight_per_person × max_persons_per_frame
        actual       = sum of weights for each detected violation
        score        = min(100, (actual / max_possible) × 100)

    Args:
        violations: List of violation dicts (each has 'violation_type' key).
        total_sampled_seconds: Number of seconds processed (frames sampled).

    Returns:
        Float in [0.0, 100.0].
    """
    if total_sampled_seconds <= 0:
        return 0.0

    max_possible = (
        total_sampled_seconds * _MAX_WEIGHT_PER_PERSON * _MAX_PERSONS_PER_FRAME
    )
    actual = sum(
        VIOLATION_WEIGHTS.get(v.get("violation_type", ""), 1.0)
        for v in violations
    )

    score = min(100.0, round((actual / max_possible) * 100.0, 1))
    logger.info(
        f"Risk score: {score} "
        f"(actual={actual:.1f}, max_possible={max_possible:.1f}, "
        f"violations={len(violations)}, seconds={total_sampled_seconds})"
    )
    return score
