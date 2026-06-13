import anthropic
import re
import json
from app.config import get_settings

settings = get_settings()
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def build_prompt(question: str, schema: str) -> str:
    return f"""Tu es un expert SQL et data visualization travaillant pour une entreprise.
Tu as accès à la base de données suivante :

{schema}

RÈGLES STRICTES :
1. Génère UNIQUEMENT une requête SELECT
2. Utilise uniquement les tables et colonnes listées ci-dessus
3. Fais des JOIN si nécessaire selon les clés étrangères
4. Retourne UNIQUEMENT un JSON valide, rien d'autre

FORMAT DE RÉPONSE OBLIGATOIRE (JSON pur, sans markdown) :
{{
  "sql": "SELECT ... FROM ... WHERE ...;",
  "chart_type": "bar|line|pie|donut|area|scatter|bubble|funnel|heatmap|treemap|waterfall|bar_h|grouped|stacked|none",
  "x_col": "nom_colonne_axe_x_ou_labels",
  "y_col": "nom_colonne_axe_y_ou_valeurs",
  "color_col": "nom_colonne_pour_couleur_ou_null"
}}

RÈGLES CHART :
- "none" si pas de graphique pertinent
- x_col = colonne catégorielle (texte, date, région, ville...)
- y_col = colonne numérique (montant, count, total...)
- Choisis le type le plus adapté à la question

Question : {question}"""


def generate_sql_and_config(question: str, schema: str) -> dict:
    """
    Appelle Claude et retourne SQL + config graphique.
    Claude décide lui-même du meilleur graphique.
    """
    prompt = build_prompt(question, schema)

    message = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=settings.CLAUDE_MAX_TOKENS,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = message.content[0].text.strip()

    # Nettoie si Claude ajoute des balises markdown
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw).strip()

    try:
        config = json.loads(raw)
        # Valide que le SQL est présent
        if "sql" not in config:
            raise ValueError("Pas de SQL dans la réponse")
        return config
    except json.JSONDecodeError:
        # Fallback : essaie d'extraire le SQL manuellement
        sql_match = re.search(r'SELECT.*?;', raw, re.DOTALL | re.IGNORECASE)
        sql = sql_match.group(0) if sql_match else raw
        return {
            "sql": sql,
            "chart_type": "bar",
            "x_col": None,
            "y_col": None,
            "color_col": None
        }


def generate_natural_answer(
    question: str,
    sql: str,
    data: list[dict]
) -> str:
    """Formule une réponse en langage naturel depuis les données."""
    if not data:
        return "Aucun résultat trouvé pour cette question."

    data_preview = data[:50]

    prompt = f"""Un utilisateur a posé cette question : "{question}"
La requête SQL générée était : {sql}
Données retournées : {data_preview}

Formule une réponse claire et concise en français.
Mentionne les chiffres clés. Sois direct et professionnel.
Maximum 5 phrases."""

    message = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text.strip()