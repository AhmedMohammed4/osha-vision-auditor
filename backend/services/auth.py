"""Validate the signed-in user before allowing an audit to consume resources."""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase_auth.errors import AuthApiError

from .supabase_client import get_supabase

_bearer = HTTPBearer(auto_error=False)


def require_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    if credentials is not None:
        try:
            result = get_supabase().auth.get_user(credentials.credentials)
            if result and result.user:
                return str(result.user.id)
        except AuthApiError as error:
            if error.status not in (400, 401, 403, 404):
                raise HTTPException(503, "Sign-in verification is temporarily unavailable.") from error
        except Exception as error:
            raise HTTPException(503, "Sign-in verification is temporarily unavailable.") from error

    raise HTTPException(
        401,
        "Sign in again to run an audit.",
        headers={"WWW-Authenticate": "Bearer"},
    )
