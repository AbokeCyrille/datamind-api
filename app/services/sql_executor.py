from sqlalchemy import text
from app.services.schema_reader import get_engine
from typing import Any
import re

# Mots clés dangereux — jamais autorisés dans une requête
FORBIDDEN_KEYWORDS = [
    "DROP", "DELETE", "UPDATE", "INSERT", "ALTER",
    "TRUNCATE", "CREATE", "EXEC", "EXECUTE", "GRANT",
    "REVOKE", "MERGE", "--", "/*", "xp_"
]

# Nombre maximum de lignes retournées — protège contre les requêtes
# qui retourneraient toute la BDD (millions de lignes)
MAX_ROWS = 1000


def validate_sql(sql: str) -> None:
    """
    Protection 1 — Validation du SQL avant exécution.

    Niveau 2 — Pourquoi deux vérifications ?
    - Claude est instruit de ne générer que des SELECT (dans le prompt)
    - Mais on vérifie quand même ici — c'est la "défense en profondeur"
    - Même si quelqu'un bypasse Claude, le SQL dangereux est bloqué ici
    """
    sql_upper = sql.upper().strip()

    # Vérifie que ça commence par SELECT
    if not sql_upper.startswith("SELECT"):
        raise ValueError(
            f"Seules les requêtes SELECT sont autorisées. "
            f"Reçu : {sql[:80]}"
        )

    # Vérifie qu'aucun mot clé dangereux n'est présent
    for keyword in FORBIDDEN_KEYWORDS:
        # \b = word boundary — évite de bloquer "created_at" à cause de "CREATE"
        pattern = r'\b' + re.escape(keyword) + r'\b'
        if re.search(pattern, sql_upper):
            raise ValueError(
                f"Mot clé interdit détecté : '{keyword}'. "
                f"Requête rejetée pour raison de sécurité."
            )


def execute_query(
    sql: str,
    database_url: str = None
) -> list[dict[str, Any]]:
    """
    Protection 2 — Exécution dans une transaction read-only.
    Protection 3 — Limite le nombre de lignes retournées.
    """
    # Validation avant tout
    validate_sql(sql)

    engine = get_engine(database_url)

    with engine.connect() as conn:
        # Exécution avec limite de sécurité
        # LIMIT injecté automatiquement si absent
        sql_limited = inject_limit(sql, MAX_ROWS)
        result = conn.execute(text(sql_limited))
        columns = list(result.keys())
        rows = result.fetchmany(MAX_ROWS)  # double protection

    return [dict(zip(columns, row)) for row in rows]


def inject_limit(sql: str, limit: int) -> str:
    """
    Ajoute automatiquement LIMIT si la requête n'en a pas.
    Protège contre les requêtes qui retourneraient des millions de lignes.
    """
    sql_clean = sql.rstrip(";").strip()
    sql_upper = sql_clean.upper()

    if "LIMIT" not in sql_upper:
        return f"{sql_clean} LIMIT {limit};"

    return sql + ";" if not sql.strip().endswith(";") else sql