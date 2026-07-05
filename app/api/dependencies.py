from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.auth import decode_token

# Schéma Bearer : lit le header "Authorization: Bearer <token>"
bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> dict:
    """
    Dépendance injectable dans n'importe quelle route.
    Vérifie le token JWT et retourne l'utilisateur connecté.

    Usage dans une route :
        @router.post("/query")
        async def query(user: dict = Depends(get_current_user)):
            ...
    """
    token = credentials.credentials
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token mal formé"
        )

    return {
    "username": username,
    "role": payload.get("role", "user"),
    "tenant_id": payload.get("tenant_id", "default")  # ← AJOUT
            }


async def require_admin(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Dépendance pour les routes réservées aux admins et superadmins."""
    if current_user["role"] not in ["admin", "superadmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs"
        )
    return current_user
