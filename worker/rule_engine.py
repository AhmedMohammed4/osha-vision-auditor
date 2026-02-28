"""
OSHA rule engine — pass-through for Claude Vision violations.

Claude already identifies violations directly; this module is retained
for compatibility but is no longer called by the pipeline.
"""

import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


def evaluate_frame(violations: List[Dict[str, Any]], timestamp: float) -> List[Dict[str, Any]]:
    """
    Attach timestamp to each violation from Claude Vision output.

    Args:
        violations: List of violation dicts returned by detect_violations().
        timestamp: Frame timestamp in seconds.

    Returns:
        Same violations with 'timestamp' key attached.
    """
    for v in violations:
        v["timestamp"] = timestamp
    return violations
