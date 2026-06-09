from sqlalchemy import create_engine, inspect, text
from app.config import get_settings
from functools import lru_cache

settings = get_settings()

# Cache des engines — on ne recrée pas la connexion à chaque requête
# C'est comme garder la porte ouverte au lieu de la rouvrir à chaque fois
_engines = {}

def get_engine(database_url: str = None):
    url = database_url or settings.DATABASE_URL
    if url not in _engines:
        _engines[url] = create_engine(
            url,
            pool_pre_ping=True,   # vérifie que la connexion est vivante
            pool_recycle=3600,    # recrée la connexion après 1h
        )
    return _engines[url]


def get_db_schema(database_url: str = None) -> str:
    """
    Lit la structure complète de la BDD.
    Filtre les tables système pour ne donner à Claude
    que les tables métier du client.
    """
    try:
        engine = get_engine(database_url)
        inspector = inspect(engine)
        schema_parts = []

        tables = inspector.get_table_names()
        if not tables:
            raise ValueError("Aucune table trouvée dans la base de données.")

        for table_name in tables:
            columns = inspector.get_columns(table_name)
            # Récupère aussi les clés étrangères pour aider Claude
            foreign_keys = inspector.get_foreign_keys(table_name)

            col_lines = []
            for col in columns:
                pk = inspector.get_pk_constraint(table_name)
                is_pk = col['name'] in pk.get('constrained_columns', [])
                pk_marker = " [PK]" if is_pk else ""
                col_lines.append(
                    f"  - {col['name']}{pk_marker} ({str(col['type'])})"
                )

            fk_lines = []
            for fk in foreign_keys:
                fk_lines.append(
                    f"  → {fk['constrained_columns']} "
                    f"référence {fk['referred_table']}.{fk['referred_columns']}"
                )

            block = f"Table: {table_name}\n" + "\n".join(col_lines)
            if fk_lines:
                block += "\n  Relations:\n" + "\n".join(fk_lines)

            schema_parts.append(block)

        return "\n\n".join(schema_parts)

    except Exception as e:
        raise ConnectionError(f"Impossible de lire le schéma BDD : {e}")


def test_db_connection(database_url: str = None) -> bool:
    try:
        engine = get_engine(database_url)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False