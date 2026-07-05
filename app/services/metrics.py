from sqlalchemy import text
from app.services.query_logger import get_engine
import os


def get_dashboard_metrics(days: int = 7) -> dict:
    engine = get_engine()
    url = os.getenv("DATABASE_URL", "")
    is_postgres = "postgresql" in url or "postgres" in url

    # Filtre de date compatible SQLite et PostgreSQL
    if is_postgres:
        date_filter = f"timestamp > NOW() - INTERVAL '{days} days'"
    else:
        date_filter = f"timestamp > datetime('now', '-{days} days')"

    with engine.connect() as conn:

        total = conn.execute(text(
            f"SELECT COUNT(*) FROM query_logs WHERE {date_filter}"
        )).scalar() or 0

        success = conn.execute(text(
            f"SELECT COUNT(*) FROM query_logs WHERE success = 1 AND {date_filter}"
        )).scalar() or 0

        avg_latency = conn.execute(text(
            f"SELECT AVG(execution_time_ms) FROM query_logs WHERE success = 1 AND {date_filter}"
        )).scalar() or 0

        total_cost = conn.execute(text(
            f"SELECT SUM(cost_usd) FROM query_logs WHERE {date_filter}"
        )).scalar() or 0

        top_questions = conn.execute(text(f"""
            SELECT question, COUNT(*) as count
            FROM query_logs
            WHERE {date_filter}
            GROUP BY question
            ORDER BY count DESC
            LIMIT 5
        """)).fetchall()

        if is_postgres:
            daily_sql = f"""
                SELECT 
                    DATE(timestamp) as day,
                    COUNT(*) as total,
                    SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count,
                    AVG(execution_time_ms) as avg_latency,
                    SUM(cost_usd) as daily_cost
                FROM query_logs
                WHERE {date_filter}
                GROUP BY DATE(timestamp)
                ORDER BY day
            """
        else:
            daily_sql = f"""
                SELECT 
                    DATE(timestamp) as day,
                    COUNT(*) as total,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
                    AVG(execution_time_ms) as avg_latency,
                    SUM(cost_usd) as daily_cost
                FROM query_logs
                WHERE {date_filter}
                GROUP BY DATE(timestamp)
                ORDER BY day
            """
        daily = conn.execute(text(daily_sql)).fetchall()

        charts = conn.execute(text(f"""
            SELECT chart_type, COUNT(*) as count
            FROM query_logs
            WHERE chart_type IS NOT NULL AND {date_filter}
            GROUP BY chart_type
            ORDER BY count DESC
        """)).fetchall()

        active_users = conn.execute(text(f"""
            SELECT username, COUNT(*) as queries, SUM(cost_usd) as cost
            FROM query_logs
            WHERE {date_filter}
            GROUP BY username
            ORDER BY queries DESC
        """)).fetchall()

    success_rate = (success / total * 100) if total > 0 else 0

    return {
        "period_days": days,
        "total_queries": total,
        "success_rate": round(success_rate, 1),
        "error_rate": round(100 - success_rate, 1),
        "avg_latency_ms": round(avg_latency, 0),
        "total_cost_usd": round(total_cost, 4),
        "top_questions": [{"question": r[0], "count": r[1]} for r in top_questions],
        "daily_stats": [
            {
                "day": str(r[0]),
                "total": r[1],
                "success": r[2],
                "avg_latency": round(r[3] or 0, 0),
                "cost": round(r[4] or 0, 4)
            } for r in daily
        ],
        "chart_types": [{"type": r[0], "count": r[1]} for r in charts],
        "active_users": [
            {"username": r[0], "queries": r[1], "cost": round(r[2] or 0, 4)}
            for r in active_users
        ],
        "alerts": _check_alerts(100 - success_rate, avg_latency, total_cost, total)
    }


def _check_alerts(error_rate, avg_latency, total_cost, total_queries=0) -> list:
    """Alertes automatiques — jamais d'alerte sans activité."""
    alerts = []
    
    # 0 requête ≠ 100% d'erreur — pas d'alerte sur du vide
    if total_queries == 0:
        return alerts
    
    if error_rate > 10:
        alerts.append({
            "level": "critical",
            "message": f"Taux d'erreur élevé : {error_rate:.1f}%",
            "action": "Vérifier les logs d'erreur"
        })
    if avg_latency > 10000:
        alerts.append({
            "level": "warning",
            "message": f"Latence élevée : {avg_latency:.0f}ms",
            "action": "Optimiser les prompts Claude"
        })
    if total_cost > 5:
        alerts.append({
            "level": "warning",
            "message": f"Coût API élevé : ${total_cost:.2f}",
            "action": "Vérifier le cache sémantique"
        })
    return alerts