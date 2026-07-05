import os
from sqlalchemy import text, create_engine
from cryptography.fernet import Fernet
from app.services.query_logger import get_engine
from typing import Optional


def _get_cipher() -> Fernet:
    key = os.getenv("ENCRYPTION_KEY", "")
    if not key:
        raise ValueError("ENCRYPTION_KEY manquante dans les variables d'environnement")
    return Fernet(key.encode())


def encrypt_url(url: str) -> str:
    return _get_cipher().encrypt(url.encode()).decode()


def decrypt_url(encrypted: str) -> str:
    return _get_cipher().decrypt(encrypted.encode()).decode()


def init_tenants_table():
    """Crée la table tenants."""
    engine = get_engine()
    url = os.getenv("DATABASE_URL", "")
    is_postgres = "postgresql" in url or "postgres" in url

    id_col = "id SERIAL PRIMARY KEY" if is_postgres else "id INTEGER PRIMARY KEY AUTOINCREMENT"
    ts_col = "created_at TIMESTAMPTZ DEFAULT NOW()" if is_postgres else "created_at TEXT DEFAULT (datetime('now'))"

    with engine.connect() as conn:
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS tenants (
                {id_col},
                {ts_col},
                tenant_id VARCHAR(50) UNIQUE NOT NULL,
                company_name VARCHAR(200) NOT NULL,
                database_url_encrypted TEXT,
                plan VARCHAR(20) DEFAULT 'starter',
                is_active BOOLEAN DEFAULT TRUE,
                max_queries_per_day INTEGER DEFAULT 100
            )
        """))
        conn.commit()


def create_tenant(
    tenant_id: str,
    company_name: str,
    database_url: str,
    plan: str = "starter"
) -> dict:
    """
    Crée un nouveau client.
    1. Teste la connexion à SA base de données
    2. Chiffre l'URL
    3. Sauvegarde
    """
    # Test de connexion AVANT de sauvegarder
    try:
        test_engine = create_engine(database_url, pool_pre_ping=True)
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        test_engine.dispose()
    except Exception as e:
        raise ValueError(f"Connexion à la BDD impossible : {e}")

    # Quotas selon le plan
    quotas = {"starter": 100, "business": 500, "enterprise": 5000}

    engine = get_engine()
    with engine.connect() as conn:
        existing = conn.execute(text(
            "SELECT id FROM tenants WHERE tenant_id = :tid"
        ), {"tid": tenant_id}).fetchone()

        if existing:
            raise ValueError(f"Le tenant '{tenant_id}' existe déjà")

        conn.execute(text("""
            INSERT INTO tenants 
                (tenant_id, company_name, database_url_encrypted, plan, max_queries_per_day)
            VALUES (:tid, :name, :db_url, :plan, :quota)
        """), {
            "tid": tenant_id,
            "name": company_name,
            "db_url": encrypt_url(database_url),
            "plan": plan,
            "quota": quotas.get(plan, 100)
        })
        conn.commit()

    return {
        "message": f"Entreprise '{company_name}' connectée avec succès",
        "tenant_id": tenant_id,
        "plan": plan,
        "connection_test": "OK"
    }


def get_tenant_database_url(tenant_id: str) -> Optional[str]:
    """
    Récupère et déchiffre l'URL BDD d'un tenant.
    C'est LA fonction appelée à chaque requête utilisateur.
    """
    # Le tenant Oramiz utilise la BDD par défaut (démo)
    if tenant_id in ("oramiz", "default", None):
        return None  # None = utiliser DATABASE_URL par défaut

    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(text(
            "SELECT database_url_encrypted, is_active FROM tenants "
            "WHERE tenant_id = :tid"
        ), {"tid": tenant_id}).fetchone()

    if not row:
        return None
    if not row[1]:
        raise ValueError(f"Le compte de cette entreprise est suspendu")
    if not row[0]:
        return None

    return decrypt_url(row[0])


def list_tenants() -> list[dict]:
    """Liste tous les clients (superadmin only)."""
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT tenant_id, company_name, plan, is_active, "
            "max_queries_per_day, created_at FROM tenants ORDER BY created_at DESC"
        )).fetchall()

    return [
        {
            "tenant_id": r[0], "company_name": r[1], "plan": r[2],
            "is_active": r[3], "max_queries_per_day": r[4],
            "created_at": str(r[5])
        }
        for r in rows
    ]