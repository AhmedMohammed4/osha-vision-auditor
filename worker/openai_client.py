"""OpenAI client shared by the video analysis and report workers."""

import os
from functools import lru_cache

from openai import OpenAI

MODEL = os.getenv("OPENAI_MODEL") or "gpt-5.4-mini"


@lru_cache(maxsize=1)
def get_openai_client() -> OpenAI:
    return OpenAI(timeout=20.0, max_retries=1)
