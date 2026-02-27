"""
YOLOv8-based PPE detector for OSHA compliance checking.

Uses YOLOv8n (COCO) for person detection. For PPE (helmet/vest),
attempts to load a custom PPE model if PPE_MODEL_PATH is set.
Falls back to color-heuristic analysis when no custom model is available.
"""

import logging
import os
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import cv2
import numpy as np
from ultralytics import YOLO

logger = logging.getLogger(__name__)

# COCO class index for "person"
PERSON_CLASS_ID = 0


@dataclass
class PersonDetection:
    """Detection result for a single person in a frame."""
    bbox: Tuple[int, int, int, int]  # x1, y1, x2, y2
    confidence: float
    has_helmet: bool
    has_vest: bool


class PPEDetector:
    """
    Detects persons and evaluates PPE compliance per frame.

    If a custom PPE model path is provided via PPE_MODEL_PATH env var,
    it will be used for helmet/vest detection. Otherwise, a color-based
    heuristic analyzes person bounding boxes.
    """

    def __init__(self, ppe_model_path: Optional[str] = None):
        """
        Initialize detector with YOLOv8n and optional PPE model.

        Args:
            ppe_model_path: Path to custom PPE YOLOv8 weights (.pt file).
                            If None or path doesn't exist, uses heuristic mode.
        """
        logger.info("Loading YOLOv8n person detection model...")
        self.person_model = YOLO("yolov8n.pt")

        self.ppe_model: Optional[YOLO] = None
        self.ppe_classes: dict = {}

        if ppe_model_path and os.path.exists(ppe_model_path):
            logger.info(f"Loading custom PPE model from: {ppe_model_path}")
            self.ppe_model = YOLO(ppe_model_path)
            # Build class name → index mapping for the PPE model
            self.ppe_classes = {
                name.lower(): idx
                for idx, name in self.ppe_model.names.items()
            }
            logger.info(f"PPE model classes: {self.ppe_classes}")
        else:
            logger.info(
                "No PPE model found — using color heuristic mode. "
                "Set PPE_MODEL_PATH in .env to use real PPE weights."
            )

    def detect(self, frame: np.ndarray, timestamp: float) -> List[PersonDetection]:
        """
        Run detection on a single frame and return per-person PPE status.

        Args:
            frame: BGR numpy array from OpenCV.
            timestamp: Frame timestamp in seconds (for logging).

        Returns:
            List of PersonDetection instances.
        """
        results = self.person_model(frame, verbose=False, conf=0.4)
        person_boxes = [
            box
            for box in results[0].boxes
            if int(box.cls[0]) == PERSON_CLASS_ID
        ]

        detections: List[PersonDetection] = []
        for person_box in person_boxes:
            x1, y1, x2, y2 = map(int, person_box.xyxy[0].tolist())
            # Clamp to frame bounds
            h_frame, w_frame = frame.shape[:2]
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w_frame, x2), min(h_frame, y2)

            if x2 <= x1 or y2 <= y1:
                continue

            if self.ppe_model is not None:
                has_helmet, has_vest = self._detect_ppe_model(frame, x1, y1, x2, y2)
            else:
                has_helmet, has_vest = self._detect_ppe_heuristic(frame, x1, y1, x2, y2)

            detections.append(
                PersonDetection(
                    bbox=(x1, y1, x2, y2),
                    confidence=round(float(person_box.conf[0]), 3),
                    has_helmet=has_helmet,
                    has_vest=has_vest,
                )
            )

        logger.debug(
            f"t={timestamp:.1f}s: {len(detections)} persons detected"
        )
        return detections

    def _detect_ppe_model(
        self, frame: np.ndarray, x1: int, y1: int, x2: int, y2: int
    ) -> Tuple[bool, bool]:
        """
        Use the custom PPE model to detect helmet/vest within a person crop.

        Args:
            frame: Full BGR frame.
            x1, y1, x2, y2: Person bounding box coordinates.

        Returns:
            Tuple of (has_helmet, has_vest).
        """
        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            return False, False

        results = self.ppe_model(crop, verbose=False, conf=0.35)
        detected_classes = set()
        for box in results[0].boxes:
            cls_name = self.ppe_model.names[int(box.cls[0])].lower()
            detected_classes.add(cls_name)

        # Common PPE model class name variations
        helmet_names = {"hardhat", "helmet", "hard_hat", "hard-hat", "head_protection"}
        vest_names = {"safety_vest", "vest", "hi-vis", "hiviz", "reflective_vest", "safety-vest"}

        has_helmet = bool(detected_classes & helmet_names)
        has_vest = bool(detected_classes & vest_names)
        return has_helmet, has_vest

    def _detect_ppe_heuristic(
        self, frame: np.ndarray, x1: int, y1: int, x2: int, y2: int
    ) -> Tuple[bool, bool]:
        """
        Color-based PPE heuristic when no custom model is available.

        Analyzes:
        - Top 20% of person bbox for hard hat colors (yellow, white, orange, red, blue).
        - Middle 40% (torso) for hi-viz vest colors (yellow-green, orange).

        Args:
            frame: Full BGR frame.
            x1, y1, x2, y2: Person bounding box coordinates.

        Returns:
            Tuple of (has_helmet, has_vest).
        """
        person_h = y2 - y1

        # Head / helmet region: top 20% of bounding box
        head_y2 = y1 + max(1, int(person_h * 0.22))
        head_region = frame[y1:head_y2, x1:x2]

        # Torso / vest region: 25%–65% of bounding box height
        vest_y1 = y1 + int(person_h * 0.25)
        vest_y2 = y1 + int(person_h * 0.65)
        vest_region = frame[vest_y1:vest_y2, x1:x2]

        has_helmet = _has_hardhat_color(head_region)
        has_vest = _has_hiviz_color(vest_region)
        return has_helmet, has_vest


# ---------------------------------------------------------------------------
# Color-analysis helpers
# ---------------------------------------------------------------------------

def _has_hardhat_color(region: np.ndarray) -> bool:
    """
    Detect hard hat presence using HSV color thresholds.

    Checks for common hard hat colors: yellow, white, orange, red, blue.

    Args:
        region: BGR numpy image crop of the head area.

    Returns:
        True if hard hat colors cover >15% of the region.
    """
    if region.size == 0 or region.shape[0] < 3 or region.shape[1] < 3:
        return False

    hsv = cv2.cvtColor(region, cv2.COLOR_BGR2HSV)

    # Yellow hard hat
    yellow = cv2.inRange(hsv, (15, 100, 100), (35, 255, 255))
    # White hard hat
    white = cv2.inRange(hsv, (0, 0, 180), (180, 40, 255))
    # Orange hard hat
    orange = cv2.inRange(hsv, (5, 120, 120), (15, 255, 255))
    # Red hard hat (two ranges for red hue wrap)
    red1 = cv2.inRange(hsv, (0, 120, 100), (5, 255, 255))
    red2 = cv2.inRange(hsv, (175, 120, 100), (180, 255, 255))
    # Blue hard hat
    blue = cv2.inRange(hsv, (100, 100, 100), (130, 255, 255))

    combined = (
        cv2.bitwise_or(yellow, white)
    )
    combined = cv2.bitwise_or(combined, orange)
    combined = cv2.bitwise_or(combined, red1)
    combined = cv2.bitwise_or(combined, red2)
    combined = cv2.bitwise_or(combined, blue)

    coverage = np.sum(combined > 0) / combined.size
    return coverage > 0.15


def _has_hiviz_color(region: np.ndarray) -> bool:
    """
    Detect hi-visibility safety vest using HSV color thresholds.

    Checks for high-saturation yellow-green and orange (ANSI/ISEA 107 colors).

    Args:
        region: BGR numpy image crop of the torso area.

    Returns:
        True if hi-viz colors cover >10% of the region.
    """
    if region.size == 0 or region.shape[0] < 3 or region.shape[1] < 3:
        return False

    hsv = cv2.cvtColor(region, cv2.COLOR_BGR2HSV)

    # Hi-viz yellow-green (lime green)
    hiviz_yellow = cv2.inRange(hsv, (25, 140, 140), (45, 255, 255))
    # Hi-viz orange
    hiviz_orange = cv2.inRange(hsv, (5, 140, 140), (20, 255, 255))

    combined = cv2.bitwise_or(hiviz_yellow, hiviz_orange)
    coverage = np.sum(combined > 0) / combined.size
    return coverage > 0.10
