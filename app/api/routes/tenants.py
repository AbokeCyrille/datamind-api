from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.api.dependencies import get_current_user
from app.services.tenant_manager import create_tenant, list_tenants

router = APIRouter(prefix="/tenants", tags=["Entreprises"])


class CreateTenantRequest(BaseModel):
    tenant_id: str          # ex: "orange_ci"
    company_name: str       # ex: "Orange Côte d'Ivoire"
    database_url: str       # ex: "oracle+cx_oracle://user:pass@host/db"
    plan: str = "starter"   # starter | business | enterprise


async def require_superadmin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "superadmin":
        raise HTTPException(
            status_code=403,
            detail="Réservé au superadmin Oramiz"
        )
    return current_user


@router.get("")
async def get_tenants(admin: dict = Depends(require_superadmin)):
    """Liste toutes les entreprises clientes."""
    return list_tenants()


@router.post("")
async def add_tenant(
    request: CreateTenantRequest,
    admin: dict = Depends(require_superadmin)
):
    """
    Connecte une nouvelle entreprise — ZÉRO CODE.
    Le système teste la connexion avant de valider.
    """
    try:
        return create_tenant(
            tenant_id=request.tenant_id,
            company_name=request.company_name,
            database_url=request.database_url,
            plan=request.plan
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))