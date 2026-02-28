"""
OSHA Vision Auditor — FastAPI Backend Entry Point

Run with:
    cd backend
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

import logging
import os
import sys

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables — resolve path relative to this file so it works
# regardless of which directory uvicorn is launched from
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(_env_path)

# ---------------------------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="OSHA Vision Auditor API",
    description="Automated OSHA compliance inspection from worksite videos.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS — allow frontend dev server
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "http://localhost:3003",
        "http://127.0.0.1:3003",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
from backend.routers.video import router as video_router   # noqa: E402
from backend.routers.report import router as report_router  # noqa: E402

app.include_router(video_router, prefix="/api", tags=["Video"])
app.include_router(report_router, prefix="/api", tags=["Report"])


# ---------------------------------------------------------------------------
# Startup / health check
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def on_startup() -> None:
    """Validate required environment variables on startup."""
    required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
    missing = [key for key in required if not os.getenv(key)]
    if missing:
        logger.error(f"Missing required environment variables: {missing}")
        logger.error("Please copy backend/.env.example to backend/.env and fill in values.")
    else:
        logger.info("OSHA Vision Auditor API started successfully.")
        logger.info(f"Claude Vision detection: {'enabled' if os.getenv('ANTHROPIC_API_KEY') else 'DISABLED — set ANTHROPIC_API_KEY in backend/.env'}")


@app.get("/health", tags=["Health"])
def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "service": "OSHA Vision Auditor API"}
