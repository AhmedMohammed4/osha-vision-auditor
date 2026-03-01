"""Authoritative OSHA 29 CFR citation helpers for detected violation types."""

from typing import Dict


OSHA_CITATIONS: Dict[str, Dict[str, str]] = {
    "no_hard_hat": {
        "citation": "29 CFR 1926.100(a)",
        "text": "Employees working in areas with possible head injury from impact, falling objects, or electrical hazards must wear protective helmets.",
    },
    "no_eye_protection": {
        "citation": "29 CFR 1926.102(a)(1)",
        "text": "Eye and face protection must be provided and used when operations present potential eye or face injury from physical, chemical, or radiation hazards.",
    },
    "no_safety_vest": {
        "citation": "29 CFR 1926.651(d)",
        "text": "Workers exposed to public vehicle traffic must wear warning vests or other suitable high-visibility garments.",
    },
    "no_gloves": {
        "citation": "29 CFR 1910.138(a)",
        "text": "Employers must select and require appropriate hand protection where employee hands are exposed to hazards.",
    },
    "improper_footwear": {
        "citation": "29 CFR 1926.96(a)",
        "text": "Protective footwear must be used wherever there is danger of foot injuries from falling or rolling objects or puncture hazards.",
    },
    "no_fall_harness": {
        "citation": "29 CFR 1926.501(b)(1)",
        "text": "Employees on walking/working surfaces with unprotected sides or edges 6 feet or more above lower levels must be protected from falling.",
    },
    "fall_hazard": {
        "citation": "29 CFR 1926.501(b)",
        "text": "Specific fall protection systems (guardrails, safety nets, or personal fall arrest) are required where listed fall exposures exist.",
    },
    "unsafe_ladder": {
        "citation": "29 CFR 1926.1053(b)(1)",
        "text": "Portable ladders used for upper landing access must extend at least 3 feet above the upper landing surface and be used per safe setup requirements.",
    },
    "scaffold_violation": {
        "citation": "29 CFR 1926.451(g)(1)",
        "text": "Each employee on a scaffold more than 10 feet above a lower level must be protected from falling by guardrails and/or personal fall arrest systems.",
    },
    "electrical_hazard": {
        "citation": "29 CFR 1926.403(b)(1)",
        "text": "Electrical equipment must be free from recognized hazards likely to cause death or serious physical harm to employees.",
    },
    "housekeeping_hazard": {
        "citation": "29 CFR 1926.25(a)",
        "text": "Construction sites must be kept clear of debris and unnecessary materials to prevent unsafe conditions such as slip and trip hazards.",
    },
    "tool_misuse": {
        "citation": "29 CFR 1926.300(b)(1)",
        "text": "Employers are responsible for safe condition and use of tools and equipment used by employees.",
    },
    "excavation_hazard": {
        "citation": "29 CFR 1926.652(a)(1)",
        "text": "Each employee in an excavation must be protected from cave-ins by an adequate protective system unless the excavation is in stable rock or meets specific depth/condition exceptions.",
    },
    "fire_hazard": {
        "citation": "29 CFR 1926.150(a)(1)",
        "text": "An approved fire extinguisher must be provided and immediately available at the job site for fire protection.",
    },
}


def hydrate_citation(violation: Dict[str, object]) -> Dict[str, object]:
    """Ensure citation fields are present on a violation payload."""
    violation_type = str(violation.get("violation_type", ""))
    fallback = OSHA_CITATIONS.get(violation_type)
    if not fallback:
        return violation

    if not violation.get("osha_citation"):
        violation["osha_citation"] = fallback["citation"]

    if not violation.get("osha_reference_text"):
        violation["osha_reference_text"] = fallback["text"]

    return violation
