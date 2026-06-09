from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── Application ──────────────────────────────────────────
    APP_NAME: str = "Text-to-SQL Enterprise"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # ── Sécurité JWT ─────────────────────────────────────────
    # Génère une clé solide avec : openssl rand -hex 32
    SECRET_KEY: str = "change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── Claude API ───────────────────────────────────────────
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-sonnet-4-5"
    CLAUDE_MAX_TOKENS: int = 2048

    # ── Base de données (connexion client) ───────────────────
    # Format : dialect+driver://user:password@host:port/dbname
    # Exemples :
    #   PostgreSQL : postgresql+psycopg2://user:pass@localhost/mydb
    #   MySQL      : mysql+pymysql://user:pass@localhost/mydb
    #   SQL Server : mssql+pyodbc://user:pass@host/db?driver=ODBC+Driver+17
    DATABASE_URL: str = ""

    # ── Rate limiting ────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 20

    class Config:
        # Lit automatiquement le fichier .env à la racine
        env_file = ".env"
        case_sensitive = True


# lru_cache évite de relire le .env à chaque requête
@lru_cache()
def get_settings() -> Settings:
    return Settings()
