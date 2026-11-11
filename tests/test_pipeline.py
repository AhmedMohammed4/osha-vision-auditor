"""Exercise actual video decoding and the full worker flow without paid API calls."""

import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

import cv2
import numpy as np

from worker import pipeline


class PipelineCompatibilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.folder = tempfile.TemporaryDirectory()
        cls.clips = {}
        for extension, codec in (
            ("mp4", "mp4v"), ("mov", "mp4v"), ("avi", "MJPG"),
            ("webm", "VP80"), ("mkv", "MJPG"),
        ):
            path = Path(cls.folder.name) / f"clip.{extension}"
            writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*codec), 5.0, (64, 48))
            if not writer.isOpened():
                raise RuntimeError(f"Cannot create {extension} compatibility fixture")
            for frame_number in range(15):
                writer.write(np.full((48, 64, 3), frame_number * 10, dtype=np.uint8))
            writer.release()
            cls.clips[extension] = path.read_bytes()

    @classmethod
    def tearDownClass(cls):
        cls.folder.cleanup()

    def setUp(self):
        self.client = Mock()
        self.client.rpc.return_value.execute.return_value = SimpleNamespace(data=True)
        self.detector = Mock(return_value=[])
        self.updates = Mock(return_value=True)
        for name, replacement in (
            ("get_supabase", Mock(return_value=self.client)),
            ("detect_violations", self.detector),
            ("update_run", self.updates),
            ("upload_frame", Mock(return_value="https://example.test/frame.jpg")),
        ):
            patcher = patch.object(pipeline, name, replacement)
            patcher.start()
            self.addCleanup(patcher.stop)

    def process(self, data, filename="clip.mp4"):
        with patch.object(pipeline, "download_video", return_value=data):
            pipeline.process_video("video-id", "run-id", filename)

    def test_supported_containers_decode_and_finish_with_no_findings(self):
        for extension, data in self.clips.items():
            with self.subTest(extension=extension):
                self.client.reset_mock()
                self.detector.reset_mock()
                self.process(data, f"clip.{extension}")
                self.assertEqual(self.detector.call_count, 2)
                _, result = self.client.rpc.call_args.args
                self.assertEqual(result["p_findings"], [])
                self.assertEqual(result["p_risk_score"], 0)
                self.assertIn("No clear hazards", result["p_report"])

    def test_real_frames_with_a_supported_hazard_produce_evidence_and_high_priority(self):
        self.detector.side_effect = lambda frame, timestamp: [{
            "violation_type": "excavation_hazard", "confidence": 0.97,
            "description": "Worker beside exposed vertical soil walls.",
        }]
        self.process(self.clips["mp4"])
        _, result = self.client.rpc.call_args.args
        self.assertEqual(result["p_risk_score"], 80)
        self.assertEqual([item["timestamp"] for item in result["p_findings"]], [0.0, 2.0])
        self.assertTrue(all(item["frame_url"] for item in result["p_findings"]))
        self.assertIn("HIGH RISK", result["p_report"])

    def test_browser_recordings_without_frame_counts_use_sequential_decoding(self):
        open_video = pipeline._open_video

        def without_frame_count(path):
            capture = open_video(path)
            proxy = Mock(wraps=capture)
            proxy.get.side_effect = lambda field: (
                float("nan") if field == cv2.CAP_PROP_FRAME_COUNT else capture.get(field)
            )
            return proxy

        with patch.object(pipeline, "_open_video", side_effect=without_frame_count):
            self.process(self.clips["webm"], "recording.webm")
        self.assertEqual(self.detector.call_count, 2)
        self.client.rpc.assert_called_once()

    def test_corrupt_video_is_failed_without_calling_the_model(self):
        self.process(b"not a decodable video")
        self.detector.assert_not_called()
        self.client.rpc.assert_not_called()
        self.assertEqual(self.updates.call_args.kwargs["status"], "failed")
        self.assertIn("could not be opened", self.updates.call_args.kwargs["report"])

    def test_overlong_video_is_rejected_before_analysis(self):
        capture = Mock()
        capture.get.side_effect = {cv2.CAP_PROP_FPS: 1, cv2.CAP_PROP_FRAME_COUNT: 121}.get
        with patch.object(pipeline, "_open_video", return_value=capture):
            self.process(self.clips["mp4"])
        self.detector.assert_not_called()
        self.assertEqual(self.updates.call_args.kwargs["status"], "failed")
        self.assertIn("no longer than 2 minutes", self.updates.call_args.kwargs["report"])

    def test_cancelled_run_stops_before_spending_on_analysis(self):
        self.updates.return_value = False
        self.process(self.clips["mp4"])
        self.detector.assert_not_called()
        self.client.rpc.assert_not_called()

    def test_cancellation_during_a_batch_cannot_publish_results(self):
        self.updates.side_effect = [True, False]
        self.process(self.clips["mp4"])
        self.client.rpc.assert_not_called()

    def test_model_failure_is_recorded_as_failure_and_never_as_a_clean_audit(self):
        self.detector.side_effect = TimeoutError("service timeout")
        self.process(self.clips["mp4"])
        self.client.rpc.assert_not_called()
        self.assertEqual(self.updates.call_args.kwargs["status"], "failed")


if __name__ == "__main__":
    unittest.main()
