from pydantic import BaseModel
from typing import Any, Optional
from time import time


class QueryResponse(BaseModel):
    """Ce que le système retourne à l'utilisateur."""
    success: bool
    question: str                        # La question originale
    sql_generated: str                   # Le SQL généré (transparent)
    answer: str                          # Réponse en langage naturel
    data: Optional[list[dict[str, Any]]] # Données brutes (tableau)
    visual: Optional[dict[str, Any]]     # JSON Plotly si demandé
    execution_time_ms: float             # Perf monitoring
    timestamp: float = time()


class ErrorResponse(BaseModel):
    """Format uniforme pour toutes les erreurs."""
    success: bool = False
    error_code: str
    message: str
    detail: Optional[str] = None


class TokenResponse(BaseModel):
    """Réponse après authentification."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # secondes


class HealthResponse(BaseModel):
    """État du système."""
    status: str
    version: str
    database_connected: bool
    claude_api_reachable: bool
