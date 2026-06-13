from fastapi import APIRouter, Depends, HTTPException
from app.api.dependencies import require_admin
from app.services.metrics import get_dashboard_metrics
from app.services.query_logger import init_logs_table

router = APIRouter(prefix="/admin", tags=["Administration"])


@router.get("/metrics")
async def get_metrics(
    days: int = 7,
    admin: dict = Depends(require_admin)
):
    """
    Dashboard MLOps — réservé aux admins Oramiz.
    Retourne toutes les métriques des N derniers jours.
    """
    try:
        return get_dashboard_metrics(days=days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/init-logs")
async def initialize_logs(admin: dict = Depends(require_admin)):
    """Initialise la table de logs en production."""
    try:
        init_logs_table()
        return {"message": "Table query_logs créée avec succès"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))