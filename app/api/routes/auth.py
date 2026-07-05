from fastapi import APIRouter, HTTPException, status
from app.models.request import LoginRequest
from app.models.response import TokenResponse
from app.core.auth import authenticate_user, create_access_token
from app.config import get_settings
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["Authentification"])
settings = get_settings()


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    user = authenticate_user(credentials.username, credentials.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(
    data={
        "sub": user["username"],
        "role": user["role"],
        "tenant_id": user.get("tenant_id", "default")  # ← AJOUT
    },
    expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return TokenResponse(
        access_token=token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )