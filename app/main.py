from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.services.semantic_cache import init_cache_table
import time
import os

from app.config import get_settings
from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.api.routes.query import router as query_router
from app.api.routes.admin import router as admin_router
from app.api.routes.users import router as users_router

settings = get_settings()
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Solution Text-to-SQL Enterprise.",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Configure DATABASE_URL puis initialise les tables."""

    # 1. Corrige l'URL PostgreSQL
    database_url = os.getenv("DATABASE_URL", "")
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
        os.environ["DATABASE_URL"] = database_url
    print(f"[startup] DATABASE_URL : {database_url[:30]}...")

    # 2. Logs
    from app.services.query_logger import init_logs_table
    try:
        init_logs_table()
        print("[startup] Table query_logs initialisée")
    except Exception as e:
        print(f"[startup] Erreur init logs: {e}")

    # 3. Cache sémantique
    try:
        init_cache_table()
        print("[startup] Table query_cache initialisée")
    except Exception as e:
        print(f"[startup] Erreur init cache: {e}")

    # 4. Users
    from app.services.user_manager import init_users_table
    try:
        init_users_table()
        print("[startup] Table users initialisée")
    except Exception as e:
        print(f"[startup] Erreur init users: {e}")
        

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Process-Time-Ms"] = f"{duration_ms:.2f}"
    print(f"[{request.method}] {request.url.path} — {duration_ms:.0f}ms")
    return response

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

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(query_router)
app.include_router(admin_router)
app.include_router(users_router)

@app.get("/", tags=["Root"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }