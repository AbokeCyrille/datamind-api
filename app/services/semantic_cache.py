import json
import hashlib
import math
from typing import Any
from sqlalchemy import text
from app.services.query_logger import get_engine


def init_cache_table():
    """Crée la table de cache si elle n'existe pas."""
    engine = get_engine()
    import os
    url = os.getenv("DATABASE_URL", "")
    is_postgres = "postgresql" in url or "postgres" in url
    
    id_col = "id SERIAL PRIMARY KEY" if is_postgres else "id INTEGER PRIMARY KEY AUTOINCREMENT"
    ts_col = "created_at TIMESTAMPTZ DEFAULT NOW()" if is_postgres else "created_at TEXT DEFAULT (datetime('now'))"
    
    with engine.connect() as conn:
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS query_cache (
                {id_col},
                {ts_col},
                question_hash VARCHAR(64) UNIQUE,
                question_original TEXT,
                question_vector TEXT,
                sql_generated TEXT,
                answer TEXT,
                data TEXT,
                chart_type VARCHAR(50),
                hit_count INTEGER DEFAULT 0
            )
        """))
        conn.commit()


def _simple_vectorize(text_input: str) -> list[float]:
    """
    Vectorisation légère sans dépendance externe.
    
    Niveau 2 — Pourquoi c'est suffisant ici ?
    En production on utiliserait OpenAI Embeddings ou sentence-transformers.
    Pour notre MVP, cette approche basée sur les mots suffit car les questions
    Data sont souvent similaires syntaxiquement.
    """
    words = text_input.lower().split()
    
    # Vocabulaire de base pour les questions data
    vocab = [
        "ventes", "clients", "achats", "produits", "région", "ville",
        "total", "somme", "count", "moyenne", "max", "min",
        "janvier", "février", "mars", "avril", "mai", "juin",
        "juillet", "août", "septembre", "octobre", "novembre", "décembre",
        "2024", "2023", "mois", "année", "trimestre",
        "top", "meilleur", "plus", "moins", "classement",
        "par", "group", "vendeur", "segment", "évolution"
    ]
    
    vector = [1.0 if w in words else 0.0 for w in vocab]
    return vector


def _cosine_similarity(v1: list[float], v2: list[float]) -> float:
    """Calcule la similarité cosinus entre deux vecteurs."""
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)


def get_from_cache(question: str, threshold: float = 0.92) -> dict | None:
    """
    Cherche une réponse similaire dans le cache.
    Retourne None si aucune correspondance trouvée.
    """
    try:
        engine = get_engine()
        question_vec = _simple_vectorize(question)
        
        with engine.connect() as conn:
            rows = conn.execute(text(
                "SELECT question_original, question_vector, sql_generated, "
                "answer, data, chart_type, id FROM query_cache"
            )).fetchall()
        
        best_match = None
        best_score = 0.0
        
        for row in rows:
            cached_vec = json.loads(row[1])
            similarity = _cosine_similarity(question_vec, cached_vec)
            
            if similarity > best_score:
                best_score = similarity
                best_match = row
        
        if best_match and best_score >= threshold:
            # Incrémente le compteur de hits
            with engine.connect() as conn:
                conn.execute(text(
                    "UPDATE query_cache SET hit_count = hit_count + 1 WHERE id = :id"
                ), {"id": best_match[6]})
                conn.commit()
            
            print(f"[cache] HIT — similarité {best_score:.3f} pour '{question[:40]}'")
            
            return {
                "sql_generated": best_match[2],
                "answer": f"[Cache] {best_match[3]}",
                "data": json.loads(best_match[4]),
                "chart_type": best_match[5],
                "from_cache": True,
                "similarity": round(best_score, 3)
            }
        
        return None
        
    except Exception as e:
        print(f"[cache] Erreur lecture : {e}")
        return None


def save_to_cache(
    question: str,
    sql: str,
    answer: str,
    data: list[dict],
    chart_type: str
):
    """Sauvegarde une réponse dans le cache."""
    try:
        engine = get_engine()
        question_hash = hashlib.sha256(question.encode()).hexdigest()
        question_vec = json.dumps(_simple_vectorize(question))
        
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO query_cache 
                    (question_hash, question_original, question_vector,
                     sql_generated, answer, data, chart_type)
                VALUES 
                    (:hash, :question, :vector, :sql, :answer, :data, :chart)
                ON CONFLICT (question_hash) DO NOTHING
            """), {
                "hash": question_hash,
                "question": question,
                "vector": question_vec,
                "sql": sql,
                "answer": answer,
                "data": json.dumps(data[:100]),
                "chart": chart_type
            })
            conn.commit()
        
        print(f"[cache] SAVED — '{question[:40]}'")
        
    except Exception as e:
        print(f"[cache] Erreur sauvegarde : {e}")