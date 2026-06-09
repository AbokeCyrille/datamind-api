from fastapi import APIRouter, Depends, HTTPException
from app.models.request import QueryRequest
from app.models.response import QueryResponse
from app.api.dependencies import get_current_user
from app.services.schema_reader import get_db_schema
from app.services.llm import generate_sql, generate_natural_answer
from app.services.sql_executor import execute_query
from app.services.visualizer import generate_visual
import time

router = APIRouter(prefix="/query", tags=["Requêtes"])


@router.post("", response_model=QueryResponse)
async def query(
    request: QueryRequest,
    current_user: dict = Depends(get_current_user)  # ← protégé par JWT
):
    """
    Endpoint principal : question → SQL → données → réponse.
    """
    start = time.perf_counter()

    try:
        # Étape 1 : lire le schéma BDD
        schema = get_db_schema()

        # Étape 2 & 3 : construire le prompt + appeler Claude
        sql = generate_sql(request.question, schema)

        # Étape 4 : exécuter le SQL
        data = execute_query(sql)

        # Étape 5 : formuler la réponse naturelle
        answer = generate_natural_answer(request.question, sql, data)
        # Étape 6 : générer la visualisation
        if request.generate_visual and data:
            visual = generate_visual(data, request.question)

        execution_time = (time.perf_counter() - start) * 1000

        return QueryResponse(
            success=True,
            question=request.question,
            sql_generated=sql,
            answer=answer,
            data=data,
            visual=visual,
            execution_time_ms=round(execution_time, 2)
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur moteur : {e}")