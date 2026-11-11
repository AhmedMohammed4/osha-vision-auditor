"""Reports must preserve the detected evidence and the corrected risk priority."""

import unittest
from unittest.mock import patch

from worker.llm_report import generate_report
from worker.risk_scorer import compute_risk_score


class ReportEvidenceTests(unittest.TestCase):
    def test_trench_report_uses_high_priority_and_exact_recorded_evidence(self):
        finding = {
            "violation_type": "excavation_hazard",
            "timestamp": 2.0,
            "description": "A worker stands beside exposed vertical soil walls.",
        }
        findings = [finding] * 4
        with patch("worker.openai_client.get_openai_client", side_effect=AssertionError("Unexpected API call")):
            report = generate_report("video-id", findings, compute_risk_score(findings, 4))
        self.assertIn("80.0/100 (HIGH RISK)", report)
        self.assertIn(finding["description"], report)
        self.assertIn("29 CFR 1926.652(a)(1)", report)
        self.assertNotIn("LOW RISK", report)
        self.assertNotIn("helmet", report)
        self.assertNotIn("vest", report)

    def test_older_findings_can_be_summarized_without_descriptions(self):
        report = generate_report("older-video", [{"violation_type": "unsafe_ladder"}], 60)
        self.assertIn("Review the timestamped evidence frame.", report)

    def test_empty_findings_do_not_claim_full_site_compliance(self):
        report = generate_report("empty-video", [], 0)
        self.assertIn("No clear hazards were identified in the sampled frames.", report)
        self.assertNotIn("in compliance", report)


if __name__ == "__main__":
    unittest.main()
