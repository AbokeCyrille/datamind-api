from sqlalchemy import create_engine, inspect, text
from app.config import get_settings
import re

settings = get_settings()
_engines = {}


def get_engine(database_url: str = None):
    url = database_url or settings.DATABASE_URL
    if url not in _engines:
        _engines[url] = create_engine(
            url, pool_pre_ping=True, pool_recycle=3600
        )
    return _engines[url]


def get_all_tables(database_url: str = None) -> list[str]:
    """Retourne la liste de toutes les tables de la BDD."""
    engine = get_engine(database_url)
    inspector = inspect(engine)
    return inspector.get_table_names()


def get_full_schema(database_url: str = None) -> str:
    """
    Lit le schéma complet.
    Utilisé pour les petites BDD (< 20 tables).
    """
    try:
        engine = get_engine(database_url)
        inspector = inspect(engine)
        return _build_schema_text(inspector, inspector.get_table_names())
    except Exception as e:
        raise ConnectionError(f"Impossible de lire le schéma BDD : {e}")


def get_smart_schema(question: str, database_url: str = None) -> str:
    """
    Sélection intelligente des tables selon la question.

    Stratégie :
    - Si < 20 tables → schéma complet (pas besoin de filtrer)
    - Si 20-100 tables → sélection par mots-clés
    - Si 100+ tables → sélection par mots-clés stricte (top 5 tables)

    C'est le même principe que RAG mais sans vector DB —
    on utilise la correspondance de mots-clés pour commencer.
    """
    try:
        engine = get_engine(database_url)
        inspector = inspect(engine)
        all_tables = inspector.get_table_names()

        # Petite BDD : on envoie tout
        if len(all_tables) <= 20:
            return _build_schema_text(inspector, all_tables)

        # Grande BDD : sélection intelligente
        relevant_tables = _select_relevant_tables(
            question, all_tables, inspector,
            max_tables=5 if len(all_tables) > 100 else 8
        )

        # Toujours au moins 3 tables (pour ne pas être trop restrictif)
        if len(relevant_tables) < 3:
            relevant_tables = all_tables[:3]

        schema = _build_schema_text(inspector, relevant_tables)

        # Avertit Claude du contexte partiel
        if len(relevant_tables) < len(all_tables):
            schema = (
                f"[Note: BDD contient {len(all_tables)} tables. "
                f"Tables sélectionnées pour cette question: "
                f"{', '.join(relevant_tables)}]\n\n" + schema
            )

        return schema

    except Exception as e:
        raise ConnectionError(f"Impossible de lire le schéma BDD : {e}")


def _select_relevant_tables(
    question: str,
    all_tables: list[str],
    inspector,
    max_tables: int = 8
) -> list[str]:
    """
    Sélectionne les tables les plus pertinentes pour une question.

    Méthode de scoring :
    1. Correspondance directe : le nom de la table est dans la question
    2. Correspondance partielle : un mot de la question est dans le nom
    3. Tables liées par clés étrangères aux tables déjà sélectionnées
    """
    question_lower = question.lower()
    # Extrait les mots significatifs (ignore les mots communs)
    stop_words = {"le", "la", "les", "de", "du", "des", "un", "une",
                  "et", "en", "par", "pour", "sur", "dans", "avec",
                  "moi", "me", "je", "tu", "il", "nous", "vous",
                  "que", "qui", "quoi", "quel", "quelle", "comment",
                  "montre", "affiche", "donne", "fais", "liste",
                  "total", "tous", "toutes", "quel", "quelle"}
    words = {w for w in re.findall(r'\b\w+\b', question_lower)
             if len(w) > 2 and w not in stop_words}

    scores = {}
    for table in all_tables:
        score = 0
        table_lower = table.lower()

        # Score élevé : nom exact de la table dans la question
        if table_lower in question_lower:
            score += 10

        # Score moyen : un mot de la question dans le nom de la table
        for word in words:
            if word in table_lower:
                score += 5

        # Score faible : un mot du nom de la table dans la question
        table_words = re.findall(r'\w+', table_lower)
        for tw in table_words:
            if tw in question_lower and len(tw) > 3:
                score += 3

        # Vérifie aussi les colonnes de la table
        try:
            columns = inspector.get_columns(table)
            for col in columns:
                col_name = col['name'].lower()
                if col_name in question_lower and len(col_name) > 3:
                    score += 2
                for word in words:
                    if word in col_name:
                        score += 1
        except Exception:
            pass

        scores[table] = score

    # Trie par score décroissant
    sorted_tables = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    selected = [t for t, s in sorted_tables[:max_tables] if s > 0]

    # Si aucune table ne matche, prend les plus probables par défaut
    if not selected:
        selected = [t for t, _ in sorted_tables[:3]]

    # Ajoute les tables liées par FK aux tables déjà sélectionnées
    selected = _add_related_tables(selected, all_tables, inspector, max_tables)

    return selected


def _add_related_tables(
    selected: list[str],
    all_tables: list[str],
    inspector,
    max_tables: int
) -> list[str]:
    """
    Ajoute les tables liées par clés étrangères.
    Ex: si 'ventes' est sélectionnée et qu'elle a une FK vers 'clients',
    on ajoute automatiquement 'clients'.
    """
    related = set(selected)

    for table in list(selected):
        if len(related) >= max_tables:
            break
        try:
            fks = inspector.get_foreign_keys(table)
            for fk in fks:
                referred = fk.get('referred_table')
                if referred and referred in all_tables:
                    related.add(referred)
        except Exception:
            pass

    return list(related)


def _build_schema_text(inspector, tables: list[str]) -> str:
    """Construit le texte de schéma lisible par Claude."""
    schema_parts = []

    for table_name in tables:
        try:
            columns = inspector.get_columns(table_name)
            pk      = inspector.get_pk_constraint(table_name)
            fks     = inspector.get_foreign_keys(table_name)
            pk_cols = pk.get('constrained_columns', [])

            col_lines = []
            for col in columns:
                is_pk  = col['name'] in pk_cols
                marker = " [PK]" if is_pk else ""
                nullable = "" if col.get('nullable', True) else " NOT NULL"
                col_lines.append(
                    f"  - {col['name']}{marker} ({str(col['type'])}{nullable})"
                )

            fk_lines = []
            for fk in fks:
                fk_lines.append(
                    f"  → {fk['constrained_columns']} "
                    f"→ {fk['referred_table']}.{fk['referred_columns']}"
                )

            block = f"Table: {table_name}\n" + "\n".join(col_lines)
            if fk_lines:
                block += "\n  Relations FK:\n" + "\n".join(fk_lines)

            schema_parts.append(block)
        except Exception:
            pass

    return "\n\n".join(schema_parts)


def test_db_connection(database_url: str = None) -> bool:
    try:
        engine = get_engine(database_url)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False