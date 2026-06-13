from fastapi import APIRouter, Depends, HTTPException
from app.models.request import QueryRequest
from app.models.response import QueryResponse
from app.api.dependencies import get_current_user
from app.services.schema_reader import get_smart_schema
from app.services.llm import generate_sql_and_config, generate_natural_answer
from app.services.sql_executor import execute_query
from app.services.visualizer import generate_visual_from_config
from app.services.query_logger import log_query
from app.services.semantic_cache import get_from_cache, save_to_cache
from app.services.sql_evaluator import evaluate_sql_quality
import time

router = APIRouter(prefix="/query", tags=["Requêtes"])


@router.post("", response_model=QueryResponse)
async def query(
    request: QueryRequest,
    current_user: dict = Depends(get_current_user)
):
    start = time.perf_counter()
    sql = None
    chart_type = None

    try:
        # ── Étape 0 : Vérifier le cache sémantique ────────────────────────
        cached = get_from_cache(request.question)
        if cached:
            execution_time = (time.perf_counter() - start) * 1000
            log_query(
                username=current_user["username"],
                question=request.question,
                sql_generated=cached["sql_generated"],
                success=True,
                execution_time_ms=execution_time,
                rows_returned=len(cached["data"]),
                chart_type=cached["chart_type"]
            )
            visual = None
            if request.generate_visual and cached["data"]:
                visual = generate_visual_from_config(
                    data=cached["data"],
                    question=request.question,
                    chart_type=cached["chart_type"]
                )
            return QueryResponse(
                success=True,
                question=request.question,
                sql_generated=cached["sql_generated"],
                answer=cached["answer"],
                data=cached["data"],
                visual=visual,
                execution_time_ms=round(execution_time, 2)
            )

        # ── Étape 1 : Schéma intelligent ──────────────────────────────────
        schema = get_smart_schema(request.question)

        # ── Étape 2 : Génération SQL + config ─────────────────────────────
        config     = generate_sql_and_config(request.question, schema)
        sql        = config["sql"]
        chart_type = config.get("chart_type", "bar")
        x_col      = config.get("x_col")
        y_col      = config.get("y_col")
        color_col  = config.get("color_col")

        # ── Étape 3 : Exécution SQL ────────────────────────────────────────
        data = execute_query(sql)

        # ── Étape 4 : Évaluation qualité SQL (LLMOps) ─────────────────────
        quality = evaluate_sql_quality(request.question, sql, data, schema)
        print(f"[eval] Score qualité SQL : {quality['score']}/100 "
              f"({quality['quality']}) — {quality['issues']}")

        # ── Étape 5 : Réponse naturelle ───────────────────────────────────
        answer = generate_natural_answer(request.question, sql, data)

        # ── Étape 6 : Graphique ───────────────────────────────────────────
        visual = None
        if request.generate_visual and data and chart_type != "none":
            visual = generate_visual_from_config(
                data=data, question=request.question,
                chart_type=chart_type, x_col=x_col,
                y_col=y_col, color_col=color_col
            )

        execution_time = (time.perf_counter() - start) * 1000

        # ── Étape 7 : Mise en cache si qualité suffisante ─────────────────
        if quality["score"] >= 70:
            save_to_cache(request.question, sql, answer, data, chart_type)

        # ── Étape 8 : Logging MLOps ───────────────────────────────────────
        log_query(
            username=current_user["username"],
            question=request.question,
            sql_generated=sql,
            success=True,
            execution_time_ms=execution_time,
            rows_returned=len(data),
            chart_type=chart_type
        )

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
        execution_time = (time.perf_counter() - start) * 1000
        log_query(
            username=current_user.get("username", "unknown"),
            question=request.question,
            sql_generated=sql,
            success=False,
            error_message=str(e),
            execution_time_ms=execution_time,
            chart_type=chart_type
        )
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        execution_time = (time.perf_counter() - start) * 1000
        log_query(
            username=current_user.get("username", "unknown"),
            question=request.question,
            sql_generated=sql,
            success=False,
            error_message=str(e),
            execution_time_ms=execution_time,
            chart_type=chart_type
        )
        raise HTTPException(status_code=500, detail=f"Erreur moteur : {e}")