"""
LLM-powered OSHA safety report generator using OpenAI API.
"""

import logging
import os
from typing import Any, Dict, List

import openai

logger = logging.getLogger(__name__)


def generate_report(
    video_id: str,
    violations: List[Dict[str, Any]],
    risk_score: float,
) -> str:
    """
    Generate a professional OSHA safety report using OpenAI gpt-4o-mini.

    Sends a structured violation summary to the LLM and returns
    a formatted safety report with assessment, issues, and recommendations.

    Args:
        video_id: UUID of the video (for context in logs).
        violations: List of violation dicts from the pipeline.
        risk_score: Computed risk score 0–100.

    Returns:
        Formatted safety report string.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.warning("OPENAI_API_KEY not set — returning default report.")
        return _default_report(violations, risk_score)

    helmet_violations = [v for v in violations if v["violation_type"] == "helmet_violation"]
    vest_violations = [v for v in violations if v["violation_type"] == "vest_violation"]

    # Collect unique timestamps for context (limit to first 10)
    violation_timestamps = sorted(set(v["timestamp"] for v in violations))[:10]
    timestamps_str = ", ".join(f"{t:.1f}s" for t in violation_timestamps)

    severity = _severity_label(risk_score)

    prompt = f"""You are a certified OSHA safety compliance inspector. Analyze the following automated video inspection results and produce a professional safety report.

INSPECTION RESULTS:
- Video ID: {video_id}
- Overall Risk Score: {risk_score}/100 ({severity})
- Total Violations Detected: {len(violations)}
- Hard Hat (Helmet) Violations: {len(helmet_violations)}
- Safety Vest Violations: {len(vest_violations)}
- Violation Timestamps: {timestamps_str if timestamps_str else "None"}

Provide a structured report with EXACTLY these three sections:

1. OVERALL RISK ASSESSMENT
Write 2–3 sentences assessing the overall safety compliance level based on the score and violation counts.

2. TOP SAFETY ISSUES
List the 3 most critical safety issues identified as bullet points. Be specific to the violations found.

3. RECOMMENDED ACTIONS
List 5 concrete, actionable recommendations to improve compliance. Reference relevant OSHA standards where applicable (e.g., 29 CFR 1926.100 for head protection).

Keep the tone professional and concise. Do not include introductory text before section 1."""

    try:
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            temperature=0.3,
        )
        report_text = response.choices[0].message.content.strip()
        logger.info(f"LLM report generated for video {video_id} ({len(report_text)} chars)")
        return report_text

    except Exception as exc:
        logger.error(f"OpenAI API error for video {video_id}: {exc}")
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
    Fallback report when OpenAI API is unavailable.
    Produces a deterministic text-based report from violation data.
    """
    helmet_count = sum(1 for v in violations if v["violation_type"] == "helmet_violation")
    vest_count = sum(1 for v in violations if v["violation_type"] == "vest_violation")
    severity = _severity_label(risk_score)

    return f"""1. OVERALL RISK ASSESSMENT
This worksite inspection recorded a risk score of {risk_score}/100, classified as {severity}. A total of {len(violations)} violations were detected, indicating {'significant' if risk_score >= 50 else 'moderate'} non-compliance with OSHA PPE requirements.

2. TOP SAFETY ISSUES
• Hard Hat Violations: {helmet_count} instances of workers observed without proper head protection, violating OSHA 29 CFR 1926.100.
• Safety Vest Violations: {vest_count} instances of workers without high-visibility vests, violating OSHA 29 CFR 1926.65.
• Systematic PPE Non-Compliance: Recurring violations suggest inadequate enforcement of PPE policies on-site.

3. RECOMMENDED ACTIONS
• Immediately brief all on-site workers on mandatory PPE requirements before resuming operations.
• Conduct a PPE inventory audit to ensure adequate supply of hard hats and safety vests for all personnel.
• Appoint a dedicated Safety Officer to perform daily PPE compliance checks at site entry points.
• Implement a written PPE program per OSHA 29 CFR 1910.132 with documented enforcement procedures.
• Schedule quarterly OSHA safety training sessions for all workers and supervisors to reinforce compliance culture."""
