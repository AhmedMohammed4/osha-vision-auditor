# OSHA Vision Auditor

AI-powered worksite safety compliance inspector. Upload a construction site video and automatically detect OSHA PPE violations (missing hard hats, safety vests), get a risk score, and receive an AI-generated safety report.

---

## Features

- **Video Upload** — Drag-and-drop with size validation
- **YOLOv8 Detection** — Person detection + PPE color analysis
- **OSHA Rule Engine** — Modular rule system for helmet and vest violations
- **Risk Scoring** — Weighted 0–100 score based on violation severity
- **AI Safety Report** — OpenAI-generated OSHA compliance report
- **Interactive Dashboard** — Video player with clickable violation timestamps
- **Violations Timeline** — Visual timeline of when violations occurred
- **Supabase Backend** — PostgreSQL + Storage for all data

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.11+ | [python.org](https://www.python.org/downloads/) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) |
| FFmpeg | Latest | See below |
| Supabase account | — | [supabase.com](https://supabase.com) |

### FFmpeg Installation

**Windows:**
```powershell
winget install ffmpeg
# or download from https://ffmpeg.org/download.html and add to PATH
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt install ffmpeg
```

---

## Step 1 — Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project.

2. Open the **SQL Editor** and run the entire contents of `supabase/schema.sql`.

3. Go to **Storage** → click **New bucket**:
   - Name: `videos` → enable **Public bucket** → Save
   - Name: `frames` → enable **Public bucket** → Save

4. Go to **Settings → API** and copy:
   - `Project URL` → your `SUPABASE_URL`
   - `anon public` key → your `SUPABASE_ANON_KEY`
   - `service_role` key → your `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 2 — Backend Setup

```bash
cd osha-vision-auditor/backend

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

Edit `backend/.env`:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key    # optional — fallback report used if missing
PPE_MODEL_PATH=                       # optional — see PPE Model section below
VIDEO_MAX_DURATION=120
```

Start the backend (run from the **project root** `osha-vision-auditor/`):
```bash
cd ..  # go back to osha-vision-auditor/ if you're in backend/
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Verify at: http://localhost:8000/docs

---

## Step 3 — Frontend Setup

Open a **new terminal**:

```bash
cd osha-vision-auditor/frontend

npm install

cp .env.example .env.local
```

Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the frontend:
```bash
npm run dev
```

Open: http://localhost:3000

---

## Step 4 — PPE Model (Optional but Recommended)

By default, the system uses a **color-heuristic** to detect helmets and vests — good for demo purposes. For better accuracy, use a real PPE model:

**Option A — Download from Hugging Face:**
```bash
pip install huggingface_hub
python -c "
from huggingface_hub import hf_hub_download
path = hf_hub_download('keremberke/yolov8n-hard-hat-detection', 'best.pt')
print(path)
"
```

Copy the printed path to `backend/.env`:
```env
PPE_MODEL_PATH=/path/to/best.pt
```

**Option B — Use any YOLOv8 PPE model** that detects classes including: `hardhat`, `helmet`, `safety_vest`, or `vest`.

---

## Demo Instructions

1. Find a construction site video (YouTube, stock footage, or your own):
   - 30–120 seconds long
   - Workers visible with or without helmets/vests
   - Good for testing: any clip where some workers lack PPE

2. Download as MP4 (e.g., using `yt-dlp`)

3. Upload via the web interface at http://localhost:3000

4. Watch the processing animation (~30–60 seconds for a 1-minute video)

5. Explore the dashboard:
   - Click violation markers on the timeline
   - Click timestamps in the violations table to seek the video
   - Expand the AI Safety Report section

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload-video` | Upload video file (multipart/form-data) |
| `POST` | `/api/process-video/{id}` | Start synchronous processing |
| `GET` | `/api/video/{id}` | Get video status and metadata |
| `GET` | `/api/video/{id}/violations` | Get all violations |
| `GET` | `/api/video/{id}/report` | Get or generate safety report |
| `GET` | `/health` | Health check |

Interactive docs: http://localhost:8000/docs

---

## Project Structure

```
osha-vision-auditor/
├── backend/                    # FastAPI backend
│   ├── main.py                # App entry point
│   ├── routers/
│   │   ├── video.py           # Upload, process, fetch endpoints
│   │   └── report.py          # LLM report endpoint
│   ├── models/schemas.py      # Pydantic models
│   ├── services/
│   │   ├── supabase_client.py # DB client
│   │   └── storage.py         # Supabase Storage helpers
│   ├── requirements.txt
│   └── .env.example
│
├── worker/                     # Processing pipeline
│   ├── pipeline.py            # Orchestrator: process_video()
│   ├── detector.py            # YOLOv8 PPE detection
│   ├── rule_engine.py         # OSHA violation rules
│   ├── risk_scorer.py         # Risk score calculation
│   └── llm_report.py          # OpenAI report generation
│
├── frontend/                   # Next.js 14 frontend
│   ├── app/
│   │   ├── page.tsx           # Upload page
│   │   └── dashboard/[id]/    # Video dashboard
│   ├── components/
│   │   ├── VideoUploader.tsx  # Drag-and-drop uploader
│   │   ├── VideoPlayer.tsx    # react-player wrapper
│   │   ├── RiskMeter.tsx      # SVG gauge
│   │   ├── ViolationsTimeline.tsx
│   │   ├── ViolationsTable.tsx
│   │   └── ProcessingStatus.tsx
│   ├── lib/
│   │   ├── api.ts             # Axios API calls
│   │   └── supabase.ts        # Supabase JS client
│   ├── types/index.ts
│   └── .env.example
│
├── supabase/schema.sql         # Database schema
├── docs/architecture.md        # Architecture diagrams
└── README.md
```

---

## Risk Score Explanation

| Score | Level | Meaning |
|-------|-------|---------|
| 0–33 | 🟢 Low | Minor PPE gaps |
| 34–66 | 🟡 Moderate | Significant non-compliance |
| 67–100 | 🔴 High | Severe, immediate action required |

**Weights used:**
- Hard hat violation: **5 points**
- Safety vest violation: **3 points**

---

## Troubleshooting

**Backend won't start:**
- Ensure `backend/.env` exists and has valid Supabase credentials
- Confirm Python 3.11+ is active in your venv

**"OpenCV failed to open video":**
- Ensure FFmpeg is installed and on PATH
- Try converting your video: `ffmpeg -i input.mov output.mp4`

**No violations detected:**
- Without a real PPE model, the heuristic works best on videos where workers wear clearly visible colored hard hats and hi-viz vests
- Set `PPE_MODEL_PATH` for production-grade detection

**Supabase upload fails:**
- Verify the `videos` and `frames` buckets exist and are set to **Public**
- Confirm `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) is in `backend/.env`

---

## License

MIT — built for hackathon demonstration purposes.
