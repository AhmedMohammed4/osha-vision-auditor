"""
LLM-powered OSHA safety report generator using Claude API.
"""

import logging
import os
from collections import Counter
from typing import Any, Dict, List

import anthropic

logger = logging.getLogger(__name__)


def generate_report(
    video_id: str,
    violations: List[Dict[str, Any]],
    risk_score: float,
) -> str:
    """
    Generate a professional OSHA safety report using Claude claude-sonnet-4-6.

    Sends a structured violation summary to Claude and returns a formatted
    safety report with assessment, issues, and recommendations.

    Args:
        video_id: UUID of the video (for context in logs).
        violations: List of violation dicts from the pipeline.
        risk_score: Computed risk score 0–100.

    Returns:
        Formatted safety report string.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY not set — returning default report.")
        return _default_report(violations, risk_score)

    # Count violations by type for the prompt
    type_counts = Counter(v.get("violation_type", "unknown") for v in violations)
    violation_summary = "\n".join(
        f"- {vtype.replace('_', ' ').title()}: {count} instance(s)"
        for vtype, count in sorted(type_counts.items(), key=lambda x: -x[1])
    ) or "- None detected"

    # Collect unique OSHA citations referenced
    citations = sorted(set(
        v.get("osha_citation", "") for v in violations if v.get("osha_citation")
    ))
    citations_str = ", ".join(citations) if citations else "None"

    # Sample timestamps for context (first 10 unique)
    violation_timestamps = sorted(set(v.get("timestamp", 0) for v in violations))[:10]
    timestamps_str = ", ".join(f"{t:.1f}s" for t in violation_timestamps) or "None"

    severity = _severity_label(risk_score)

    prompt = f"""You are a certified OSHA safety compliance inspector. Analyze the following automated video inspection results and produce a professional safety report.

INSPECTION RESULTS:
- Video ID: {video_id}
- Overall Risk Score: {risk_score}/100 ({severity})
- Total Violations Detected: {len(violations)}
- Violation Breakdown:
{violation_summary}
- OSHA Standards Referenced: {citations_str}
- Violation Timestamps: {timestamps_str}

Provide a structured report with EXACTLY these three sections:

1. OVERALL RISK ASSESSMENT
Write 2–3 sentences assessing the overall safety compliance level based on the score and violation types found.

2. TOP SAFETY ISSUES
List the 3 most critical safety issues identified as bullet points. Be specific to the violations found and reference the OSHA standards involved.

3. RECOMMENDED ACTIONS
List 5 concrete, actionable recommendations to improve compliance. Reference relevant OSHA standards where applicable (e.g., 29 CFR 1926.100 for head protection).

Keep the tone professional and concise. Do not include introductory text before section 1."""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        report_text = response.content[0].text.strip()
        logger.info(f"LLM report generated for video {video_id} ({len(report_text)} chars)")
        return report_text

    except anthropic.APIError as exc:
        logger.error(f"Anthropic API error for video {video_id}: {exc}")
        return _default_report(violations, risk_score)
    except Exception as exc:
        logger.error(f"Unexpected error generating report for video {video_id}: {exc}")
        return _default_report(violations, risk_score)


def _severity_label(score: float) -> str:
    """Map numeric risk score to a human-readable severity label."""
    if score >= 67:
        return "HIGH RISK"
    elif score >= 34:
        return "MODERATE RISK"
    else:
        return "LOW RISK"


def _default_report(violations: List[Dict[str, Any]], risk_score: float) -> str:
    """
    Fallback report when Claude API is unavailable.
    Produces a deterministic text-based report from violation data.
    """
    severity = _severity_label(risk_score)
    type_counts = Counter(v.get("violation_type", "unknown") for v in violations)

    if not violations:
        return f"""1. OVERALL RISK ASSESSMENT
This worksite inspection recorded a risk score of {risk_score}/100, classified as {severity}. No violations were detected during the inspected period, indicating strong compliance with OSHA 29 CFR 1926 construction safety standards.

2. TOP SAFETY ISSUES
• No violations detected — all observed workers and conditions met OSHA safety requirements.
• No PPE deficiencies identified during this inspection period.
• No environmental or equipment hazards observed.

3. RECOMMENDED ACTIONS
• Continue enforcing mandatory PPE policies at all site entry points per 29 CFR 1926.100.
• Conduct periodic unannounced inspections to maintain compliance standards.
• Document this inspection result as part of your ongoing OSHA safety records.
• Schedule routine OSHA safety refresher training to sustain the compliance culture.
• Review and update the written PPE program per 29 CFR 1910.132 annually."""

    top_violations = type_counts.most_common(3)
    issues_text = "\n".join(
        f"• {vtype.replace('_', ' ').title()}: {count} instance(s) detected"
        for vtype, count in top_violations
    )
    compliance_label = "significant" if risk_score >= 50 else "moderate"

    return f"""1. OVERALL RISK ASSESSMENT
This worksite inspection recorded a risk score of {risk_score}/100, classified as {severity}. A total of {len(violations)} violations were detected across {len(type_counts)} violation categories, indicating {compliance_label} non-compliance with OSHA 29 CFR 1926 construction safety standards.

2. TOP SAFETY ISSUES
{issues_text}

3. RECOMMENDED ACTIONS
• Immediately conduct a site-wide safety briefing addressing all detected violation types before resuming operations.
• Perform a PPE inventory audit to ensure adequate supply of required protective equipment for all personnel.
• Appoint a dedicated Safety Officer to perform daily compliance checks at site entry points and during operations.
• Implement a written safety program per 29 CFR 1910.132 with documented enforcement procedures and disciplinary actions.
• Schedule quarterly OSHA safety training sessions covering all violation categories identified in this inspection."""
