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
from app.services.tenant_manager import get_tenant_database_url
import time

router = APIRouter(prefix="/query", tags=["Requêtes"])


@router.post("", response_model=QueryResponse)
async def query(
    request: QueryRequest,
    current_user: dict = Depends(get_current_user)
):
    start = time.perf_counter()
    tenant_db_url = get_tenant_database_url(current_user.get("tenant_id"))
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
                # Pas de tokens : le cache ne coûte rien — c'est le but
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

        # ── Étape 1 : Schéma intelligent (BDD du tenant) ──────────────────
        schema = get_smart_schema(request.question, database_url=tenant_db_url)

        # ── Étape 2 : Génération SQL + config + tokens FinOps ─────────────
        config     = generate_sql_and_config(request.question, schema)
        tok_in     = config.pop("_tokens_in", 0)
        tok_out    = config.pop("_tokens_out", 0)
        sql        = config["sql"]
        chart_type = config.get("chart_type", "bar")
        x_col      = config.get("x_col")
        y_col      = config.get("y_col")
        color_col  = config.get("color_col")

        # ── Étape 3 : Exécution SQL (BDD du tenant) ───────────────────────
        data = execute_query(sql, database_url=tenant_db_url)

        # ── Étape 4 : Évaluation qualité SQL (LLMOps) ─────────────────────
        quality = evaluate_sql_quality(request.question, sql, data, schema)
        print(f"[eval] Score qualité SQL : {quality['score']}/100 "
              f"({quality['quality']}) — {quality['issues']}")

        # ── Étape 5 : Réponse naturelle + tokens FinOps ───────────────────
        answer, a_in, a_out = generate_natural_answer(request.question, sql, data)

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

        # ── Étape 8 : Logging MLOps + FinOps ──────────────────────────────
        log_query(
            username=current_user["username"],
            question=request.question,
            sql_generated=sql,
            success=True,
            execution_time_ms=execution_time,
            tokens_input=tok_in + a_in,
            tokens_output=tok_out + a_out,
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