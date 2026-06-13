import re
from typing import Any


def evaluate_sql_quality(
    question: str,
    sql: str,
    data: list[dict[str, Any]],
    schema: str
) -> dict:
    """
    Évalue la qualité du SQL généré sur 100 points.
    
    Critères :
    - Syntaxe de base (30 pts)
    - Tables du schéma utilisées (25 pts)
    - Résultats non vides (20 pts)
    - Cohérence question/SQL (25 pts)
    """
    score = 0
    issues = []
    
    sql_upper = sql.upper().strip()
    
    # ── Critère 1 : Syntaxe de base (30 pts) ──────────────────────────────
    if sql_upper.startswith("SELECT"):
        score += 10
    else:
        issues.append("SQL ne commence pas par SELECT")
    
    if "FROM" in sql_upper:
        score += 10
    else:
        issues.append("Pas de clause FROM")
    
    if sql.strip().endswith(";"):
        score += 5
    
    # Vérifie pas de mots dangereux
    dangerous = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE"]
    if not any(kw in sql_upper for kw in dangerous):
        score += 5
    else:
        issues.append("SQL contient des opérations dangereuses")
    
    # ── Critère 2 : Tables du schéma (25 pts) ─────────────────────────────
    # Extrait les noms de tables du schéma
    schema_tables = re.findall(r'Table:\s*(\w+)', schema, re.IGNORECASE)
    
    # Vérifie que les tables du SQL existent dans le schéma
    tables_in_sql = re.findall(r'FROM\s+(\w+)|JOIN\s+(\w+)', sql_upper)
    tables_used = [t[0] or t[1] for t in tables_in_sql]
    
    valid_tables = 0
    for table in tables_used:
        if any(table.lower() == st.lower() for st in schema_tables):
            valid_tables += 1
    
    if tables_used:
        table_score = int((valid_tables / len(tables_used)) * 25)
        score += table_score
        if valid_tables < len(tables_used):
            issues.append(f"Tables non trouvées dans le schéma : {tables_used}")
    else:
        issues.append("Aucune table détectée dans le SQL")
    
    # ── Critère 3 : Résultats (20 pts) ────────────────────────────────────
    if data and len(data) > 0:
        score += 20
    elif data is not None and len(data) == 0:
        score += 5  # SQL valide mais pas de données
        issues.append("Aucun résultat retourné")
    else:
        issues.append("Erreur d'exécution SQL")
    
    # ── Critère 4 : Cohérence question/SQL (25 pts) ───────────────────────
    question_lower = question.lower()
    
    # Vérifie les mots clés de la question dans le SQL
    coherence_score = 0
    
    # Agrégations
    if any(w in question_lower for w in ["total", "somme", "sum", "combien"]):
        if "SUM(" in sql_upper or "COUNT(" in sql_upper:
            coherence_score += 8
    
    # Groupements
    if any(w in question_lower for w in ["par", "by", "groupe", "chaque"]):
        if "GROUP BY" in sql_upper:
            coherence_score += 8
    
    # Filtres temporels
    if any(w in question_lower for w in ["janvier", "février", "mars", "avril",
                                          "mai", "juin", "juillet", "août",
                                          "septembre", "octobre", "novembre",
                                          "décembre", "mois", "année", "2024"]):
        if "WHERE" in sql_upper:
            coherence_score += 9
    
    # Tri/classement
    if any(w in question_lower for w in ["top", "meilleur", "plus", "classement"]):
        if "ORDER BY" in sql_upper or "LIMIT" in sql_upper:
            coherence_score += 9
    
    score += min(coherence_score, 25)
    
    # ── Score final ────────────────────────────────────────────────────────
    quality_label = (
        "excellent" if score >= 85 else
        "bon"       if score >= 70 else
        "moyen"     if score >= 50 else
        "faible"
    )
    
    return {
        "score": min(score, 100),
        "quality": quality_label,
        "issues": issues,
        "tables_detected": tables_used,
        "rows_returned": len(data) if data else 0
    }