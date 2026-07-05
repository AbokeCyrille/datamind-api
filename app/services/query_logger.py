from sqlalchemy import create_engine, text
from datetime import datetime, timezone
from app.config import get_settings
import os

settings = get_settings()


def get_engine():
    url = os.getenv("DATABASE_URL", settings.DATABASE_URL)
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return create_engine(url, pool_pre_ping=True)


def init_logs_table():
    """Crée la table de logs — compatible SQLite et PostgreSQL."""
    engine = get_engine()
    url = os.getenv("DATABASE_URL", settings.DATABASE_URL)
    
    # Détecte le type de BDD
    is_postgres = "postgresql" in url or "postgres" in url
    
    if is_postgres:
        id_col = "id SERIAL PRIMARY KEY"
        ts_col = "timestamp TIMESTAMPTZ DEFAULT NOW()"
    else:
        id_col = "id INTEGER PRIMARY KEY AUTOINCREMENT"
        ts_col = "timestamp TEXT DEFAULT (datetime('now'))"

    with engine.connect() as conn:
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS query_logs (
                {id_col},
                {ts_col},
                username VARCHAR(100),
                question TEXT,
                sql_generated TEXT,
                success BOOLEAN,
                error_message TEXT,
                execution_time_ms FLOAT,
                tokens_input INTEGER DEFAULT 0,
                tokens_output INTEGER DEFAULT 0,
                cost_usd FLOAT DEFAULT 0,
                rows_returned INTEGER DEFAULT 0,
                chart_type VARCHAR(50),
                database_url_hash VARCHAR(20)
            )
        """))
        conn.commit()

def log_query(
    username: str,
    question: str,
    sql_generated: str = None,
    success: bool = True,
    error_message: str = None,
    execution_time_ms: float = 0,
    tokens_input: int = 0,
    tokens_output: int = 0,
    rows_returned: int = 0,
    chart_type: str = None
):
    """
    Enregistre une requête dans la table query_logs.
    
    Niveau 2 — Pourquoi logger tout ça ?
    - execution_time_ms → détecte les requêtes lentes
    - tokens_input/output → calcule le coût réel Claude
    - success/error → calcule le taux d'erreur
    - chart_type → sait quels graphiques sont les plus utilisés
    """
    # Coût estimé Claude Sonnet : ~$3/MTok input, ~$15/MTok output
    cost_usd = (tokens_input * 3 / 1_000_000) + (tokens_output * 15 / 1_000_000)
    
    # Hash de l'URL pour identifier le client sans exposer les credentials
    db_url = os.getenv("DATABASE_URL", "")
    db_hash = str(hash(db_url))[-8:]

    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO query_logs (
                    username, question, sql_generated, success,
                    error_message, execution_time_ms,
                    tokens_input, tokens_output, cost_usd,
                    rows_returned, chart_type, database_url_hash
                ) VALUES (
                    :username, :question, :sql, :success,
                    :error, :exec_time,
                    :tok_in, :tok_out, :cost,
                    :rows, :chart, :db_hash
                )
            """), {
                "username": username,
                "question": question[:500],  # limite la taille
                "sql": sql_generated,
                "success": success,
                "error": error_message,
                "exec_time": execution_time_ms,
                "tok_in": tokens_input,
                "tok_out": tokens_output,
                "cost": cost_usd,
                "rows": rows_returned,
                "chart": chart_type,
                "db_hash": db_hash
            })
            conn.commit()
    except Exception as e:
        # Ne jamais faire crasher l'app à cause des logs
        print(f"[logger] Erreur logging : {e}")