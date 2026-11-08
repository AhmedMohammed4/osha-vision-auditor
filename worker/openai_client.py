"""OpenAI client shared by the video analysis and report workers."""

import os
from functools import lru_cache

from openai import APIConnectionError, APIStatusError, OpenAI

MODEL = os.getenv("OPENAI_MODEL") or "gpt-5.4-mini"


@lru_cache(maxsize=1)
def get_openai_client() -> OpenAI:
    return OpenAI(timeout=20.0, max_retries=1)


def analysis_failure_message(error: Exception) -> str:
    """Turn provider failures into messages safe to store with an audit."""
    if isinstance(error, APIConnectionError):
        return "Video analysis could not finish. OpenAI could not be reached."
    if not isinstance(error, APIStatusError):
        return "Video analysis could not finish."

    if error.status_code == 401:
        detail = "OpenAI rejected the API key."
    elif error.status_code in (403, 404):
        detail = "The OpenAI project could not access the selected model."
    elif error.code in ("insufficient_quota", "credit_balance_exhausted", "billing_hard_limit_reached"):
        detail = "The OpenAI project has no available API credits."
    elif error.status_code == 429:
        detail = "OpenAI rate-limited this request. Try again shortly."
    else:
        detail = f"OpenAI returned HTTP {error.status_code}."
    return f"Video analysis could not finish. {detail}"
