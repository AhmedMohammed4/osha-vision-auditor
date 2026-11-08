"""
Generate a safety report from the video analysis with OpenAI.
"""

import logging
import os
from collections import Counter
from typing import Any, Dict, List

from openai import OpenAIError

from .openai_client import MODEL, get_openai_client

logger = logging.getLogger(__name__)


def generate_report(
    video_id: str,
    violations: List[Dict[str, Any]],
    risk_score: float,
) -> str:
    """
    Generate a safety report using OpenAI.

    Sends a structured violation summary and returns a formatted
    safety report with assessment, issues, and recommendations.

    Args:
        video_id: UUID of the video (for context in logs).
        violations: List of violation dicts from the pipeline.
        risk_score: Computed risk score 0–100.

    Returns:
        Formatted safety report string.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.warning("OPENAI_API_KEY is missing. Using the findings summary.")
        return summarize_findings(violations, risk_score)

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

    prompt = f"""Summarize the following automated worksite video findings for a safety reviewer.

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
Write 2–3 sentences about the risk score and hazards identified in the sampled frames.

2. TOP SAFETY ISSUES
List up to 3 of the most critical findings as bullet points. If there are no findings, say so. Do not infer overall compliance from a lack of findings.

3. RECOMMENDED ACTIONS
List up to 5 concrete follow-up actions based on the findings. Reference the provided OSHA standards where applicable.

Keep the tone professional and concise. Do not include introductory text before section 1."""

    try:
        response = get_openai_client().responses.create(
            model=MODEL,
            input=prompt,
            max_output_tokens=600,
            store=False,
        )
        report_text = response.output_text.strip()
        if response.status == "completed" and report_text:
            logger.info("OpenAI report generated for video %s", video_id)
            return report_text
        logger.warning("OpenAI report was incomplete for video %s", video_id)
    except OpenAIError:
        logger.exception("OpenAI report request failed for video %s", video_id)
    return summarize_findings(violations, risk_score)


def _severity_label(score: float) -> str:
    """Map numeric risk score to a human-readable severity label."""
    if score >= 67:
        return "HIGH RISK"
    elif score >= 34:
        return "MODERATE RISK"
    else:
        return "LOW RISK"


def summarize_findings(violations: List[Dict[str, Any]], risk_score: float) -> str:
    """
    Fallback report when OpenAI is unavailable.
    Produces a deterministic text-based report from violation data.
    """
    severity = _severity_label(risk_score)
    type_counts = Counter(v.get("violation_type", "unknown") for v in violations)

    if not violations:
        return f"""1. OVERALL RISK ASSESSMENT
The automated review scored the sampled frames {risk_score}/100 ({severity}). Report generation was unavailable, so this summary uses the recorded findings.

2. TOP SAFETY ISSUES
• The review recorded no findings in the sampled frames.

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
    return f"""1. OVERALL RISK ASSESSMENT
The automated review scored the sampled frames {risk_score}/100 ({severity}) and recorded {len(violations)} findings across {len(type_counts)} categories. Report generation was unavailable, so this summary uses the recorded findings.

2. TOP SAFETY ISSUES
{issues_text}

3. RECOMMENDED ACTIONS
• Immediately conduct a site-wide safety briefing addressing all detected violation types before resuming operations.
• Perform a PPE inventory audit to ensure adequate supply of required protective equipment for all personnel.
• Appoint a dedicated Safety Officer to perform daily compliance checks at site entry points and during operations.
• Implement a written safety program per 29 CFR 1910.132 with documented enforcement procedures and disciplinary actions.
• Schedule quarterly OSHA safety training sessions covering all violation categories identified in this inspection."""
