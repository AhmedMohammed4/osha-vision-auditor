"""
OSHA rule engine for evaluating PPE compliance violations.

Rules are defined as a list of dicts so new rules can be added
without modifying any other module.
"""

import logging
from typing import Any, Callable, Dict, List

from .detector import PersonDetection

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Rule definitions
# Each rule has:
#   id           - unique identifier
#   violation_type - stored in the database violations.violation_type column
#   condition    - callable(PersonDetection) -> bool, True means violation exists
#   description  - human-readable description
# ---------------------------------------------------------------------------

VIOLATION_RULES: List[Dict[str, Any]] = [
    {
        "id": "no_helmet",
        "violation_type": "helmet_violation",
        "condition": lambda p: not p.has_helmet,
        "description": "Worker detected without hard hat / helmet",
    },
    {
        "id": "no_vest",
        "violation_type": "vest_violation",
        "condition": lambda p: not p.has_vest,
        "description": "Worker detected without high-visibility safety vest",
    },
]


def evaluate_frame(
    persons: List[PersonDetection], timestamp: float
) -> List[Dict[str, Any]]:
    """
    Apply all OSHA rules to detected persons in a single frame.

    Args:
        persons: List of PersonDetection instances for this frame.
        timestamp: Frame timestamp in seconds.

    Returns:
        List of violation dicts with keys:
            timestamp, violation_type, confidence, frame_url (always None here,
            populated later in the pipeline after frame upload).
    """
    violations: List[Dict[str, Any]] = []

    for person in persons:
        for rule in VIOLATION_RULES:
            condition: Callable[[PersonDetection], bool] = rule["condition"]
            if condition(person):
                violations.append(
                    {
                        "timestamp": timestamp,
                        "violation_type": rule["violation_type"],
                        "confidence": person.confidence,
                        "frame_url": None,  # filled in by pipeline.py
                    }
                )
                logger.debug(
                    f"Violation at t={timestamp:.1f}s: {rule['violation_type']} "
                    f"(confidence={person.confidence:.3f})"
                )

    return violations
