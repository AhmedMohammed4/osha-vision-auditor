"""Supabase client singleton for backend services."""

import os
import functools
from supabase import create_client, Client


@functools.lru_cache(maxsize=1)
def get_supabase() -> Client:
    """
    Returns a cached Supabase client instance using service role key.
    Using service role key bypasses Row Level Security for backend operations.
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        raise EnvironmentError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment."
        )

    return create_client(url, key)
