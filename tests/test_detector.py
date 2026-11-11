"""Regression checks for unsupported PPE findings before they affect audit results."""

import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

import numpy as np

from worker.detector import _FrameAnalysis, _Violation, _WorkerPPE, detect_violations


class DetectorEvidenceTests(unittest.TestCase):
    def worker(self, worker_id=0, **statuses):
        return _WorkerPPE(
            worker_id=worker_id,
            **dict.fromkeys(
                ("hard_hat", "eye_protection", "safety_vest", "gloves", "footwear", "fall_harness"),
                "unclear",
            ) | statuses,
        )

    def candidate(self, violation_type="no_hard_hat", **overrides):
        return _Violation(**{
            "violation_type": violation_type,
            "worker_id": 0,
            "requirement_evident": True,
            "description": "Worker's bare head is visible beneath falling debris.",
            "osha_citation": "",
            "severity": "high",
            "confidence": 0.95,
            **overrides,
        })

    def analyze(self, workers, violations, public_traffic_visible=False):
        client = Mock()
        client.responses.parse.return_value = SimpleNamespace(
            status="completed",
            output_parsed=_FrameAnalysis(
                public_traffic_visible=public_traffic_visible, workers=workers, violations=violations,
            ),
        )
        with patch("worker.detector.get_openai_client", return_value=client):
            return detect_violations(np.zeros((48, 64, 3), dtype=np.uint8), 2.0)

    def test_visible_helmet_blocks_a_contradictory_missing_helmet_finding(self):
        findings = self.analyze([self.worker(hard_hat="present")], [self.candidate()])
        self.assertEqual(findings, [])

    def test_obscured_ppe_is_never_treated_as_missing(self):
        for category in (
            "no_hard_hat", "no_eye_protection", "no_safety_vest", "no_gloves",
            "improper_footwear", "no_fall_harness",
        ):
            with self.subTest(category=category):
                self.assertEqual(self.analyze([self.worker()], [self.candidate(category)]), [])

    def test_ppe_findings_follow_the_identified_worker(self):
        findings = self.analyze(
            [self.worker(0, hard_hat="present"), self.worker(1, hard_hat="absent")],
            [self.candidate(worker_id=0), self.candidate(worker_id=1)],
        )
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0]["violation_type"], "no_hard_hat")

    def test_missing_worker_reference_cannot_support_a_ppe_finding(self):
        for worker_id in (None, 99):
            with self.subTest(worker_id=worker_id):
                findings = self.analyze(
                    [self.worker(hard_hat="absent")], [self.candidate(worker_id=worker_id)],
                )
                self.assertEqual(findings, [])

    def test_uncertain_findings_are_excluded_from_scoring_and_reports(self):
        findings = self.analyze(
            [self.worker(footwear="absent")],
            [self.candidate("improper_footwear", confidence=0.51)],
        )
        self.assertEqual(findings, [])

    def test_confidence_cannot_override_an_admission_of_uncertain_evidence(self):
        findings = self.analyze([], [self.candidate(
            "unsafe_ladder", worker_id=None,
            description="The ladder support conditions are not visibly secured.",
        )])
        self.assertEqual(findings, [])

    def test_missing_vest_requires_visible_public_traffic_exposure(self):
        worker = self.worker(safety_vest="absent")
        candidate = self.candidate("no_safety_vest")
        self.assertEqual(self.analyze([worker], [candidate]), [])
        self.assertEqual(len(self.analyze([worker], [candidate], public_traffic_visible=True)), 1)

    def test_visible_absence_alone_does_not_establish_a_requirement(self):
        for category, field in (
            ("no_safety_vest", "safety_vest"),
            ("no_fall_harness", "fall_harness"),
            ("no_gloves", "gloves"),
        ):
            with self.subTest(category=category):
                findings = self.analyze(
                    [self.worker(**{field: "absent"})],
                    [self.candidate(category, requirement_evident=False)],
                )
                self.assertEqual(findings, [])

    def test_supported_finding_keeps_the_existing_pipeline_payload(self):
        findings = self.analyze([self.worker(hard_hat="absent")], [self.candidate()])
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0]["osha_citation"], "29 CFR 1926.100(a)")
        self.assertEqual(findings[0]["confidence"], 0.95)
        self.assertNotIn("worker_id", findings[0])
        self.assertNotIn("requirement_evident", findings[0])

    def test_non_ppe_hazard_can_have_no_worker_reference(self):
        findings = self.analyze([], [self.candidate("unsafe_ladder", worker_id=None)])
        self.assertEqual(len(findings), 1)

    def test_no_findings_is_a_valid_analysis(self):
        self.assertEqual(self.analyze([], []), [])

    def test_duplicate_worker_ids_do_not_produce_ambiguous_findings(self):
        with self.assertRaisesRegex(RuntimeError, "duplicate worker IDs"):
            self.analyze(
                [self.worker(0, hard_hat="present"), self.worker(0, hard_hat="absent")],
                [self.candidate()],
            )


if __name__ == "__main__":
    unittest.main()
