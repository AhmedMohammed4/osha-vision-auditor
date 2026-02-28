"""Supabase client factory for backend services."""

import os
from supabase import create_client, Client


def get_supabase() -> Client:
    """
    Returns a fresh Supabase client using service role key.
    Using service role key bypasses Row Level Security for backend operations.
    A new client is created each call to avoid stale HTTP/2 connections in
    background tasks.
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        raise EnvironmentError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment."
        )

    return create_client(url, key)
