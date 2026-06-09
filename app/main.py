from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import time

from app.config import get_settings
from app.api.routes import health
from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.api.routes.query import router as query_router
# Module 3 : on ajoutera query et schema ici

settings = get_settings()

# ── Rate Limiter ───────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── Application ───────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    Solution Text-to-SQL Enterprise.
    Posez vos questions en langage naturel, obtenez des données et des visuels.
    """,
    # En production, désactiver la doc publique :
    # docs_url=None, redoc_url=None
    docs_url="/docs",
    redoc_url="/redoc"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ───────────────────────────────────────────────────────────────────────
# En production : remplacer ["*"] par les domaines autorisés
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Middleware de logging des temps de réponse ─────────────────────────────────
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Mesure et logue le temps de traitement de chaque requête."""
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Process-Time-Ms"] = f"{duration_ms:.2f}"
    print(f"[{request.method}] {request.url.path} — {duration_ms:.0f}ms")
    return response


# ── Gestion globale des erreurs non catchées ───────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error_code": "INTERNAL_ERROR",
            "message": "Une erreur interne est survenue.",
            "detail": str(exc) if settings.DEBUG else None
        }
    )


# ── Enregistrement des routes ──────────────────────────────────────────────────
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(query_router)
# app.include_router(query.router)   ← Module 3
# app.include_router(schema.router)  ← Module 4


# ── Route racine ──────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }
