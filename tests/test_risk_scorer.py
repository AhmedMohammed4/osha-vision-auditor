"""Serious hazards must keep their priority even in sparse or long clips."""

import unittest

from worker.risk_scorer import compute_risk_score


class RiskPriorityTests(unittest.TestCase):
    def test_reported_trench_clip_has_high_priority(self):
        findings = (
            [{"violation_type": "excavation_hazard"}] * 4
            + [{"violation_type": "unsafe_ladder"}, {"violation_type": "no_safety_vest"}]
        )
        self.assertEqual(compute_risk_score(findings, 4), 80.0)

    def test_one_serious_observation_cannot_be_diluted_by_other_frames(self):
        for category in ("excavation_hazard", "fall_hazard", "electrical_hazard", "fire_hazard"):
            with self.subTest(category=category):
                findings = [{"violation_type": category}]
                self.assertGreaterEqual(compute_risk_score(findings, 60), 67)
                self.assertEqual(compute_risk_score(findings, 1), compute_risk_score(findings, 60))

    def test_minor_findings_do_not_receive_a_high_severity_floor(self):
        self.assertEqual(compute_risk_score([{"violation_type": "housekeeping_hazard"}], 4), 20.0)

    def test_multiple_hazards_can_raise_priority_above_the_severity_floor(self):
        findings = [{"violation_type": "excavation_hazard"}] * 5
        self.assertEqual(compute_risk_score(findings, 1), 100.0)

    def test_empty_or_unanalyzed_clips_score_zero(self):
        self.assertEqual(compute_risk_score([], 4), 0.0)
        self.assertEqual(compute_risk_score([], 0), 0.0)


if __name__ == "__main__":
    unittest.main()
