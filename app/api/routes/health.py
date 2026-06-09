from fastapi import APIRouter
from app.models.response import HealthResponse
from app.config import get_settings

router = APIRouter(prefix="/health", tags=["Monitoring"])
settings = get_settings()


@router.get("", response_model=HealthResponse)
async def health_check():
    """
    Endpoint de monitoring.
    Les outils DevOps (Docker, Kubernetes, Render) pingent cet endpoint
    pour savoir si le service est vivant.
    """
    # On testera vraiment la BDD et Claude dans le Module 3
    return HealthResponse(
        status="ok",
        version=settings.APP_VERSION,
        database_connected=True,   # placeholder
        claude_api_reachable=True  # placeholder
    )
