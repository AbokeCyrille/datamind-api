from pydantic import BaseModel, Field
from typing import Optional


class QueryRequest(BaseModel):
    """Ce que l'utilisateur envoie."""
    question: str = Field(
        ...,
        min_length=3,
        max_length=1000,
        description="La question en langage naturel",
        examples=["Montre moi les ventes du mois de janvier par région"]
    )
    generate_visual: bool = Field(
        default=False,
        description="True pour générer un graphique Plotly en plus"
    )
    # Optionnel : l'utilisateur peut préciser la BDD cible
    # si l'entreprise a plusieurs bases de données
    database_alias: Optional[str] = Field(
        default=None,
        description="Alias de la base de données cible (si plusieurs)"
    )


class LoginRequest(BaseModel):
    """Données de connexion pour obtenir un token JWT."""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
