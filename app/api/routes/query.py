from fastapi import APIRouter, Depends, HTTPException
from app.models.request import QueryRequest
from app.models.response import QueryResponse
from app.api.dependencies import get_current_user
from app.services.schema_reader import get_smart_schema
from app.services.llm import generate_sql_and_config, generate_natural_answer
from app.services.sql_executor import execute_query
from app.services.visualizer import generate_visual_from_config
import time

router = APIRouter(prefix="/query", tags=["Requêtes"])


@router.post("", response_model=QueryResponse)
async def query(
    request: QueryRequest,
    current_user: dict = Depends(get_current_user)
):
    start = time.perf_counter()

    try:
        # Étape 1 : schéma intelligent
        schema = get_smart_schema(request.question)

        # Étape 2 : Claude génère SQL + chart config en un seul appel
        config = generate_sql_and_config(request.question, schema)
        sql         = config["sql"]
        chart_type  = config.get("chart_type", "bar")
        x_col       = config.get("x_col")
        y_col       = config.get("y_col")
        color_col   = config.get("color_col")

        # Étape 3 : exécution SQL
        data = execute_query(sql)

        # Étape 4 : réponse naturelle
        answer = generate_natural_answer(request.question, sql, data)

        # Étape 5 : graphique avec la config de Claude
        visual = None
        if request.generate_visual and data and chart_type != "none":
            visual = generate_visual_from_config(
                data=data,
                question=request.question,
                chart_type=chart_type,
                x_col=x_col,
                y_col=y_col,
                color_col=color_col
            )

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