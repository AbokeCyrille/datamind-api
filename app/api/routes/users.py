from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.api.dependencies import get_current_user, require_admin
from app.services.user_manager import (
    get_all_users, create_user, toggle_user_active
)

router = APIRouter(prefix="/users", tags=["Utilisateurs"])


class CreateUserRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str = "user"
    tenant_id: str = "default"


@router.get("")
async def list_users(current_user: dict = Depends(require_admin)):
    """
    Liste les utilisateurs.
    Superadmin → tous les utilisateurs.
    Admin → seulement son tenant.
    """
    if current_user["role"] == "superadmin":
        return get_all_users()
    else:
        return get_all_users(tenant_id=current_user.get("tenant_id"))


@router.post("")
async def add_user(
    request: CreateUserRequest,
    current_user: dict = Depends(require_admin)
):
    """Crée un nouvel utilisateur."""
    # Un admin ne peut créer que dans son tenant
    if current_user["role"] != "superadmin":
        request.tenant_id = current_user.get("tenant_id", "default")
        if request.role == "superadmin":
            raise HTTPException(
                status_code=403,
                detail="Vous ne pouvez pas créer un superadmin"
            )
    try:
        return create_user(
            username=request.username,
            email=request.email,
            password=request.password,
            role=request.role,
            tenant_id=request.tenant_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{username}/toggle")
async def toggle_user(
    username: str,
    current_user: dict = Depends(require_admin)
):
    """Active ou désactive un utilisateur."""
    if username == current_user["username"]:
        raise HTTPException(
            status_code=400,
            detail="Vous ne pouvez pas vous désactiver vous-même"
        )
    return toggle_user_active(username)