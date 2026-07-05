import os
from sqlalchemy import text
from app.services.query_logger import get_engine
from app.core.auth import hash_password, verify_password
from typing import Optional


def init_users_table():
    """Crée la table users en base de données."""
    engine = get_engine()
    url = os.getenv("DATABASE_URL", "")
    is_postgres = "postgresql" in url or "postgres" in url

    id_col = "id SERIAL PRIMARY KEY" if is_postgres else "id INTEGER PRIMARY KEY AUTOINCREMENT"
    ts_col = "created_at TIMESTAMPTZ DEFAULT NOW()" if is_postgres else "created_at TEXT DEFAULT (datetime('now'))"

    with engine.connect() as conn:
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS users (
                {id_col},
                {ts_col},
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(200),
                hashed_password TEXT NOT NULL,
                role VARCHAR(20) DEFAULT 'user',
                tenant_id VARCHAR(50) DEFAULT 'default',
                is_active BOOLEAN DEFAULT TRUE
            )
        """))
        conn.commit()

    # Crée le super admin par défaut si la table est vide
    _seed_default_users()


def _seed_default_users():
    """Insère les utilisateurs par défaut."""
    engine = get_engine()
    with engine.connect() as conn:
        count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
        if count == 0:
            users = [
                {
                    "username": "admin",
                    "email": "admin@oramiz.com",
                    "password": "admin123",
                    "role": "superadmin",
                    "tenant_id": "oramiz"
                },
                {
                    "username": "analyst",
                    "email": "analyst@client.com",
                    "password": "analyst123",
                    "role": "user",
                    "tenant_id": "client_001"
                },
                {
                    "username": "dsi_orange",
                    "email": "dsi@orange.ci",
                    "password": "orange123",
                    "role": "admin",
                    "tenant_id": "orange_ci"
                }
            ]
            for u in users:
                conn.execute(text("""
                    INSERT INTO users (username, email, hashed_password, role, tenant_id)
                    VALUES (:username, :email, :password, :role, :tenant_id)
                """), {
                    "username": u["username"],
                    "email": u["email"],
                    "password": hash_password(u["password"]),
                    "role": u["role"],
                    "tenant_id": u["tenant_id"]
                })
            conn.commit()
            print("[users] Utilisateurs par défaut créés")


def authenticate_user_db(username: str, password: str) -> Optional[dict]:
    """Vérifie les credentials depuis la BDD."""
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(text(
            "SELECT id, username, hashed_password, role, tenant_id, is_active "
            "FROM users WHERE username = :username"
        ), {"username": username}).fetchone()

    if not row:
        return None
    if not row[5]:  # is_active
        return None
    if not verify_password(password, row[2]):
        return None

    return {
        "id": row[0],
        "username": row[1],
        "role": row[3],
        "tenant_id": row[4]
    }


def get_all_users(tenant_id: str = None) -> list[dict]:
    """Retourne tous les utilisateurs (filtré par tenant si fourni)."""
    engine = get_engine()
    with engine.connect() as conn:
        if tenant_id:
            rows = conn.execute(text(
                "SELECT id, username, email, role, tenant_id, is_active, created_at "
                "FROM users WHERE tenant_id = :tenant_id ORDER BY created_at DESC"
            ), {"tenant_id": tenant_id}).fetchall()
        else:
            rows = conn.execute(text(
                "SELECT id, username, email, role, tenant_id, is_active, created_at "
                "FROM users ORDER BY created_at DESC"
            )).fetchall()

    return [
        {
            "id": r[0], "username": r[1], "email": r[2],
            "role": r[3], "tenant_id": r[4],
            "is_active": r[5], "created_at": str(r[6])
        }
        for r in rows
    ]


def create_user(
    username: str,
    email: str,
    password: str,
    role: str = "user",
    tenant_id: str = "default"
) -> dict:
    """Crée un nouvel utilisateur."""
    engine = get_engine()
    with engine.connect() as conn:
        # Vérifie que le username n'existe pas déjà
        existing = conn.execute(text(
            "SELECT id FROM users WHERE username = :username"
        ), {"username": username}).fetchone()

        if existing:
            raise ValueError(f"L'utilisateur '{username}' existe déjà")

        conn.execute(text("""
            INSERT INTO users (username, email, hashed_password, role, tenant_id)
            VALUES (:username, :email, :password, :role, :tenant_id)
        """), {
            "username": username,
            "email": email,
            "password": hash_password(password),
            "role": role,
            "tenant_id": tenant_id
        })
        conn.commit()

    return {"message": f"Utilisateur '{username}' créé avec succès", "role": role}


def toggle_user_active(username: str) -> dict:
    """Active ou désactive un utilisateur."""
    engine = get_engine()
    with engine.connect() as conn:
        conn.execute(text("""
            UPDATE users
            SET is_active = NOT is_active
            WHERE username = :username
        """), {"username": username})
        conn.commit()
    return {"message": f"Statut de '{username}' modifié"}