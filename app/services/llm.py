import anthropic
import re
from app.config import get_settings

settings = get_settings()
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def build_prompt(question: str, schema: str) -> str:
    """
    Construit le prompt système envoyé à Claude.

    Niveau 2 — Pourquoi cette structure ?
    - On donne un RÔLE à Claude → il adopte le comportement d'un expert
    - On lui donne le SCHÉMA → il connaît les vraies tables et colonnes
    - On lui donne des RÈGLES → il ne génère que du SQL, rien d'autre
    - On lui donne la QUESTION → il peut répondre précisément
    """
    return f"""Tu es un expert SQL travaillant pour une entreprise.
Tu as accès à la base de données suivante :

{schema}

RÈGLES STRICTES :
1. Génère UNIQUEMENT la requête SQL, sans explication
2. La requête doit commencer par SELECT (pas de DELETE, UPDATE, DROP)
3. Utilise uniquement les tables et colonnes listées ci-dessus
4. Si la question est ambiguë, génère la requête la plus probable
5. Termine toujours par un point-virgule

Question : {question}

SQL :"""


def generate_sql(question: str, schema: str) -> str:
    """
    Appelle Claude API et retourne le SQL généré.
    """
    prompt = build_prompt(question, schema)

    message = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=settings.CLAUDE_MAX_TOKENS,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    raw_response = message.content[0].text.strip()

    # Nettoie si Claude ajoute des balises markdown (```sql ... ```)
    sql = re.sub(r"```sql\s*", "", raw_response)
    sql = re.sub(r"```\s*", "", sql).strip()

    return sql


def generate_natural_answer(question: str, sql: str, data: list[dict]) -> str:
    """
    Prend les données brutes de la BDD et demande à Claude
    de formuler une réponse en langage naturel.
    """
    if not data:
        return "Aucun résultat trouvé pour cette question."

    # On limite à 50 lignes pour ne pas exploser le contexte
    data_preview = data[:50]

    prompt = f"""Un utilisateur a posé cette question : "{question}"

La requête SQL générée était : {sql}

Voici les données retournées par la base de données :
{data_preview}

Formule une réponse claire et concise en français, en langage naturel.
Mentionne les chiffres clés. Sois direct et professionnel."""

    message = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=500,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    return message.content[0].text.strip()