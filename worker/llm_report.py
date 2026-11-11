"""Build a safety review report directly from the recorded visual findings."""

from collections import Counter
from typing import Any, Dict, List

from .osha_citations import OSHA_CITATIONS
from .risk_scorer import VIOLATION_WEIGHTS

_CORRECTIVE_ACTIONS = {
    "excavation_hazard": "Have a competent person assess trench conditions and select appropriate cave-in protection before entry.",
    "fall_hazard": "Have a safety reviewer assess the exposed edge or opening and arrange suitable fall protection.",
    "electrical_hazard": "Keep workers clear of the electrical hazard and arrange inspection by a qualified person.",
    "fire_hazard": "Have a safety reviewer address the recorded fire hazard and check access to appropriate fire protection.",
    "no_fall_harness": "Have a safety reviewer verify the fall exposure and select an appropriate fall-protection system.",
    "no_hard_hat": "Verify the recorded head-injury exposure and provide appropriate head protection.",
    "unsafe_ladder": "Inspect the recorded ladder defect or misuse and correct the setup before further use.",
    "scaffold_violation": "Have a competent person inspect the scaffold and correct the recorded protection or access issue.",
    "no_eye_protection": "Select suitable eye or face protection for the visible task and exposure.",
    "no_safety_vest": "Verify public-traffic exposure and provide appropriate high-visibility garments where required.",
    "no_gloves": "Assess the recorded hand exposure and select suitable hand protection for the task.",
    "improper_footwear": "Assess the recorded foot-injury exposure and select appropriate protective footwear.",
    "housekeeping_hazard": "Remove or control the recorded obstruction, debris, or trip hazard.",
    "tool_misuse": "Inspect the recorded tool defect or misuse and correct it before further operation.",
}


def generate_report(
    video_id: str,
    violations: List[Dict[str, Any]],
    risk_score: float,
) -> str:
    """Preserve the pipeline entry point while formatting its accepted evidence."""
    return summarize_findings(violations, risk_score)


def _severity_label(score: float) -> str:
    if score >= 67:
        return "HIGH RISK"
    if score >= 34:
        return "MODERATE RISK"
    return "LOW RISK"


def summarize_findings(violations: List[Dict[str, Any]], risk_score: float) -> str:
    """Include observed evidence, repeated-frame counts, and matching follow-up actions."""
    severity = _severity_label(risk_score)
    if not violations:
        return f"""1. OVERALL RISK ASSESSMENT
The sampled frames received a review priority of {risk_score}/100 ({severity}). This review covers the visible conditions in sampled frames.

2. TOP SAFETY ISSUES
No clear hazards were identified in the sampled frames.

3. RECOMMENDED ACTIONS
Have a safety reviewer verify site conditions and any work areas outside the camera view."""

    type_counts = Counter(finding.get("violation_type", "unknown") for finding in violations)
    first_by_type = {}
    for finding in violations:
        first_by_type.setdefault(finding.get("violation_type", "unknown"), finding)
    categories = sorted(
        type_counts,
        key=lambda category: VIOLATION_WEIGHTS.get(category, VIOLATION_WEIGHTS["default"]),
        reverse=True,
    )

    issues = []
    for category in categories[:3]:
        finding = first_by_type[category]
        label = category.replace("_", " ").title()
        evidence = finding.get("description") or "Review the timestamped evidence frame."
        issues.append(
            f"- {label} at {finding.get('timestamp', 0):.1f}s. {evidence} "
            f"Recorded in {type_counts[category]} sampled frame observation(s)."
        )

    actions = []
    for category in categories[:5]:
        action = _CORRECTIVE_ACTIONS.get(category, "Have a safety reviewer inspect the recorded condition.")
        citation = OSHA_CITATIONS.get(category, {}).get("citation", "site safety requirements")
        actions.append(f"- {action} Review {citation}.")

    lead_hazard = categories[0].replace("_", " ").lower()
    issues_text = "\n".join(issues)
    actions_text = "\n".join(actions)
    return f"""1. OVERALL RISK ASSESSMENT
The sampled frames received a review priority of {risk_score}/100 ({severity}), led by {lead_hazard}. The most serious observed hazard sets the minimum priority. The review recorded {len(violations)} frame observations across {len(type_counts)} categories. Repeated observations may refer to the same hazard.

2. TOP SAFETY ISSUES
{issues_text}

3. RECOMMENDED ACTIONS
{actions_text}"""
