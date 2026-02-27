# OSHA Vision Auditor — Architecture

## System Overview

```
                    ┌──────────────────────────────┐
                    │   Browser (localhost:3000)    │
                    │   Next.js 14 + React Query   │
                    └──────────┬───────────────────┘
                               │ HTTP
                    ┌──────────▼───────────────────┐
                    │   FastAPI (localhost:8000)    │
                    │   Python 3.11 + Uvicorn      │
                    └──────────┬───────────────────┘
                               │
              ┌────────────────┴─────────────────┐
              │                                  │
   ┌──────────▼──────────┐          ┌────────────▼──────────┐
   │  Supabase Postgres  │          │  Supabase Storage     │
   │  - videos           │          │  - videos/bucket      │
   │  - violations       │          │  - frames/bucket      │
   │  - frames           │          └───────────────────────┘
   └─────────────────────┘
              │
   ┌──────────▼──────────────────────────────────┐
   │   Worker Pipeline (in-process)              │
   │                                              │
   │  1. Download video → tempfile               │
   │  2. OpenCV frame extraction (1 FPS)         │
   │  3. YOLOv8n person detection                │
   │  4. PPE detection (model or heuristic)      │
   │  5. OSHA rule engine → violations           │
   │  6. Upload violation frames                 │
   │  7. Compute risk score                      │
   │  8. Generate LLM report (OpenAI)           │
   │  9. Update DB: status=completed             │
   └─────────────────────────────────────────────┘
```

## Request Flow

### Video Upload
```
POST /api/upload-video
  → validate (size, extension)
  → upload bytes to Supabase Storage bucket: videos
  → INSERT into videos table (status: uploaded)
  → return { video_id }
```

### Video Processing
```
POST /api/process-video/{id}
  → verify video exists, status=uploaded
  → call worker.pipeline.process_video(id)  [synchronous]
    → UPDATE status=processing
    → download video bytes → temp file
    → cv2.VideoCapture → extract 1 FPS
    → for each frame:
        → PPEDetector.detect() → persons[]
        → rule_engine.evaluate_frame() → violations[]
        → upload frame → frame_url
    → INSERT violations[]
    → compute_risk_score()
    → generate_report()
    → UPDATE status=completed, risk_score, report
  → return { message: "completed" }
```

### Dashboard Polling
```
Frontend:
  useQuery([video, id], refetchInterval=2000)
  → GET /api/video/{id}
  → when status=completed: navigate + fetch violations
```

## Key Design Decisions

### Synchronous Processing
Processing is synchronous (blocking) for hackathon simplicity. For production,
this should be replaced with a job queue (Celery + Redis or Supabase Edge Functions).

### PPE Detection Fallback Strategy
1. **Real PPE model** (if `PPE_MODEL_PATH` is set): Load custom YOLOv8 weights
2. **Color heuristic** (default): Analyze HSV color regions of person bounding boxes
   - Head region (top 20%): detect helmet colors
   - Torso region (25-65%): detect hi-viz vest colors

### Risk Score Formula
```
max_possible = total_seconds × 8 (max weight) × 5 (max persons)
actual = Σ weight(violation_type)   where helmet=5, vest=3
score = min(100, (actual / max_possible) × 100)
```

### Frame Sampling
1 frame per second (1 FPS) provides adequate coverage for a 2-minute video
(120 frames total) while keeping processing time manageable on local hardware.

## Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| `backend/main.py` | App setup, CORS, router mounting |
| `backend/routers/video.py` | Upload, process, and fetch endpoints |
| `backend/routers/report.py` | LLM report endpoint |
| `backend/models/schemas.py` | Pydantic type validation |
| `backend/services/supabase_client.py` | DB client singleton |
| `backend/services/storage.py` | Supabase Storage operations |
| `worker/pipeline.py` | Orchestrates full processing flow |
| `worker/detector.py` | YOLOv8 person + PPE detection |
| `worker/rule_engine.py` | OSHA violation rules |
| `worker/risk_scorer.py` | Weighted risk calculation |
| `worker/llm_report.py` | OpenAI safety report generation |
