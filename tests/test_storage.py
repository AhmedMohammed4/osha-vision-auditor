"""Preserve playback content types for uploaded videos and live recordings."""

import unittest
from unittest.mock import Mock, patch

from backend.services.storage import upload_video


class VideoStorageTests(unittest.TestCase):
    def test_non_mp4_uploads_keep_their_video_content_type(self):
        for filename, content_type in (
            ("clip.mp4", "video/mp4"),
            ("clip.mov", "video/quicktime"),
            ("recording.webm", "video/webm"),
            ("clip.mkv", "video/x-matroska"),
        ):
            with self.subTest(filename=filename):
                client = Mock()
                bucket = client.storage.from_.return_value
                bucket.get_public_url.return_value = "https://example.test/video"
                with patch("backend.services.storage.get_supabase", return_value=client):
                    self.assertEqual(upload_video(b"video", filename), "https://example.test/video")
                self.assertEqual(bucket.upload.call_args.kwargs["file_options"]["content-type"], content_type)


if __name__ == "__main__":
    unittest.main()
