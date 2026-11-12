"""Validate API entry points with isolated database and worker dependencies."""

import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

import httpx

from backend.main import app
from backend.services.auth import require_user_id


class AuditApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.video_id = "00000000-0000-4000-8000-000000000001"
        self.query = Mock()
        for operation in ("select", "eq", "limit", "order", "single", "update", "insert", "is_"):
            getattr(self.query, operation).return_value = self.query
        self.query.execute.return_value = SimpleNamespace(data=[])
        self.database = Mock()
        self.database.table.return_value = self.query
        self.worker = Mock()
        for target, value in (
            ("backend.routers.video.get_supabase", self.database),
            ("backend.routers.report.get_supabase", self.database),
        ):
            patcher = patch(target, return_value=value)
            patcher.start()
            self.addCleanup(patcher.stop)
        patcher = patch("backend.routers.video.process_video", self.worker)
        patcher.start()
        self.addCleanup(patcher.stop)
        app.dependency_overrides[require_user_id] = lambda: "user-id"
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")

    async def asyncTearDown(self):
        await self.client.aclose()
        app.dependency_overrides.clear()

    def video(self, status):
        return {
            "id": self.video_id, "owner_id": "user-id", "filename": "clip.mp4",
            "status": status, "run_id": None,
        }

    async def test_health(self):
        response = await self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    async def test_unsigned_uploads_and_processing_are_rejected(self):
        app.dependency_overrides.clear()
        for route in ("/api/upload-video", f"/api/process-video/{self.video_id}", "/api/demo"):
            with self.subTest(route=route):
                method = "GET" if route == "/api/demo" else "POST"
                response = await self.client.request(method, route)
                self.assertEqual(response.status_code, 401)
        self.database.table.assert_not_called()

    async def test_supported_upload_formats_record_the_signed_in_owner(self):
        with patch("backend.routers.video.upload_video", return_value="https://example.test/video"):
            for extension in ("mp4", "mov", "avi", "webm", "mkv"):
                with self.subTest(extension=extension):
                    response = await self.client.post(
                        "/api/upload-video", files={"file": (f"clip.{extension}", b"video", "video/mp4")},
                    )
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(response.json()["status"], "uploaded")
                    self.assertEqual(self.query.insert.call_args.args[0]["owner_id"], "user-id")

    async def test_unsupported_and_empty_uploads_are_rejected(self):
        for filename, data in (("clip.txt", b"text"), ("clip.mp4", b"")):
            with self.subTest(filename=filename):
                response = await self.client.post("/api/upload-video", files={"file": (filename, data)})
                self.assertEqual(response.status_code, 400)
        self.database.table.assert_not_called()

    async def test_identical_reuploads_reuse_completed_results_without_storage_or_model_calls(self):
        with patch("backend.routers.video.upload_video", return_value="https://example.test/video") as storage:
            first = await self.client.post("/api/upload-video", files={"file": ("clip.mp4", b"same clip")})
            video_id = first.json()["video_id"]
            self.query.execute.return_value = SimpleNamespace(data=[{
                **self.video("completed"), "id": video_id,
            }])
            second = await self.client.post("/api/upload-video", files={"file": ("renamed.mp4", b"same clip")})
        self.assertEqual(second.json(), {"video_id": video_id, "status": "completed"})
        storage.assert_called_once()
        self.query.insert.assert_called_once()
        self.worker.assert_not_called()
        self.query.eq.assert_any_call("owner_id", "user-id")

    async def test_changed_content_and_different_owners_get_independent_audits(self):
        with patch("backend.routers.video.upload_video", return_value="https://example.test/video"):
            first = await self.client.post("/api/upload-video", files={"file": ("clip.mp4", b"first clip")})
            second = await self.client.post("/api/upload-video", files={"file": ("clip.mp4", b"other clip")})
            app.dependency_overrides[require_user_id] = lambda: "other-user"
            third = await self.client.post("/api/upload-video", files={"file": ("clip.mp4", b"first clip")})
        self.assertEqual(len({response.json()["video_id"] for response in (first, second, third)}), 3)

    async def test_analysis_rule_changes_invalidate_reuse(self):
        with patch("backend.routers.video.upload_video", return_value="https://example.test/video"):
            first = await self.client.post("/api/upload-video", files={"file": ("clip.mp4", b"same clip")})
            with patch("backend.routers.video.AUDIT_VERSION", "new-analysis-rules"):
                second = await self.client.post("/api/upload-video", files={"file": ("clip.mp4", b"same clip")})
        self.assertNotEqual(first.json()["video_id"], second.json()["video_id"])

    async def test_simultaneous_upload_insert_conflict_returns_the_existing_audit(self):
        self.query.execute.side_effect = [
            SimpleNamespace(data=[]),
            RuntimeError("duplicate upload ID"),
            SimpleNamespace(data=[self.video("uploaded")]),
        ]
        with patch("backend.routers.video.upload_video", return_value="https://example.test/video"):
            response = await self.client.post("/api/upload-video", files={"file": ("clip.mp4", b"same clip")})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "uploaded")

    async def test_cancelled_uploads_get_a_fresh_record_that_can_be_reused(self):
        self.query.execute.side_effect = [
            SimpleNamespace(data=[self.video("cancelled")]),
            SimpleNamespace(data=[]),
            SimpleNamespace(data=[]),
        ]
        with patch("backend.routers.video.upload_video", return_value="https://example.test/video") as storage:
            response = await self.client.post("/api/upload-video", files={"file": ("clip.mp4", b"same clip")})
            video_id = response.json()["video_id"]
            self.query.execute.side_effect = [
                SimpleNamespace(data=[self.video("cancelled")]),
                SimpleNamespace(data=[{**self.video("completed"), "id": video_id}]),
            ]
            repeated = await self.client.post("/api/upload-video", files={"file": ("clip.mp4", b"same clip")})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "uploaded")
        self.assertEqual(repeated.json(), {"video_id": video_id, "status": "completed"})
        storage.assert_called_once()

    async def test_failed_uploads_can_reuse_their_record_for_retry(self):
        self.query.execute.return_value = SimpleNamespace(data=[self.video("failed")])
        with patch("backend.routers.video.upload_video") as storage:
            response = await self.client.post("/api/upload-video", files={"file": ("clip.mp4", b"same clip")})
        self.assertEqual(response.json()["status"], "failed")
        storage.assert_not_called()

    async def test_unknown_owned_video_returns_404(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            response = await self.client.post(f"/api/process-video/{self.video_id}")
        self.assertEqual(response.status_code, 404)
        self.query.eq.assert_any_call("owner_id", "user-id")
        self.worker.assert_not_called()

    async def test_repeated_start_requests_schedule_only_one_worker(self):
        self.query.execute.side_effect = [
            SimpleNamespace(data=[self.video("uploaded")]),
            SimpleNamespace(data=[self.video("processing")]),
            SimpleNamespace(data=[self.video("processing")]),
        ]
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            first = await self.client.post(f"/api/process-video/{self.video_id}")
            second = await self.client.post(f"/api/process-video/{self.video_id}")
        self.assertEqual((first.status_code, second.status_code), (200, 200))
        self.worker.assert_called_once()

    async def test_completed_audit_is_not_billed_for_again(self):
        self.query.execute.return_value = SimpleNamespace(data=[self.video("completed")])
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            response = await self.client.post(f"/api/process-video/{self.video_id}")
        self.assertEqual(response.status_code, 200)
        self.worker.assert_not_called()

    async def test_cancelled_audit_cannot_restart(self):
        self.query.execute.return_value = SimpleNamespace(data=[self.video("cancelled")])
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            response = await self.client.post(f"/api/process-video/{self.video_id}")
        self.assertEqual(response.status_code, 409)
        self.worker.assert_not_called()

    async def test_cancelling_a_running_audit(self):
        self.query.execute.return_value = SimpleNamespace(data=[self.video("cancelled")])
        response = await self.client.post(f"/api/video/{self.video_id}/cancel")
        self.assertEqual(response.status_code, 200)
        self.query.eq.assert_any_call("owner_id", "user-id")

    async def test_saved_demo_available_and_missing(self):
        self.query.execute.return_value = SimpleNamespace(data=[{"id": self.video_id}])
        response = await self.client.get("/api/demo")
        self.assertEqual(response.json(), {"video_id": self.video_id})
        self.query.execute.return_value = SimpleNamespace(data=[])
        response = await self.client.get("/api/demo")
        self.assertEqual(response.status_code, 404)

    async def test_saved_report_is_served_without_regeneration(self):
        self.query.execute.return_value = SimpleNamespace(data={
            **self.video("completed"), "report": "Recorded evidence report.",
        })
        response = await self.client.get(f"/api/video/{self.video_id}/report")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["report"], "Recorded evidence report.")
        self.query.update.assert_not_called()

    async def test_unfinished_audits_do_not_produce_completed_reports(self):
        self.query.execute.return_value = SimpleNamespace(data={**self.video("processing"), "report": None})
        response = await self.client.get(f"/api/video/{self.video_id}/report")
        self.assertEqual(response.status_code, 409)


if __name__ == "__main__":
    unittest.main()
