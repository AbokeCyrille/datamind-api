from sqlalchemy import text
from app.services.query_logger import get_engine
from datetime import datetime, timedelta


def get_dashboard_metrics(days: int = 7) -> dict:
    """
    Calcule les KPIs pour le dashboard admin.
    Utilisé par les ingénieurs Google/Meta pour surveiller leurs LLMs.
    """
    engine = get_engine()
    
    with engine.connect() as conn:
        # Total requêtes
        total = conn.execute(text(
            "SELECT COUNT(*) FROM query_logs WHERE timestamp > NOW() - INTERVAL ':days days'",
        ).bindparams(days=days)).scalar() or 0

        # Taux de succès
        success = conn.execute(text(
            "SELECT COUNT(*) FROM query_logs WHERE success = true AND timestamp > NOW() - INTERVAL ':days days'"
        ).bindparams(days=days)).scalar() or 0

        # Latence moyenne
        avg_latency = conn.execute(text(
            "SELECT AVG(execution_time_ms) FROM query_logs WHERE success = true AND timestamp > NOW() - INTERVAL ':days days'"
        ).bindparams(days=days)).scalar() or 0

        # Coût total
        total_cost = conn.execute(text(
            "SELECT SUM(cost_usd) FROM query_logs WHERE timestamp > NOW() - INTERVAL ':days days'"
        ).bindparams(days=days)).scalar() or 0

        # Top questions
        top_questions = conn.execute(text("""
            SELECT question, COUNT(*) as count
            FROM query_logs
            WHERE timestamp > NOW() - INTERVAL ':days days'
            GROUP BY question
            ORDER BY count DESC
            LIMIT 5
        """).bindparams(days=days)).fetchall()

        # Évolution quotidienne
        daily = conn.execute(text("""
            SELECT 
                DATE(timestamp) as day,
                COUNT(*) as total,
                SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count,
                AVG(execution_time_ms) as avg_latency,
                SUM(cost_usd) as daily_cost
            FROM query_logs
            WHERE timestamp > NOW() - INTERVAL ':days days'
            GROUP BY DATE(timestamp)
            ORDER BY day
        """).bindparams(days=days)).fetchall()

        # Types de graphiques les plus utilisés
        charts = conn.execute(text("""
            SELECT chart_type, COUNT(*) as count
            FROM query_logs
            WHERE chart_type IS NOT NULL
            AND timestamp > NOW() - INTERVAL ':days days'
            GROUP BY chart_type
            ORDER BY count DESC
        """).bindparams(days=days)).fetchall()

        # Utilisateurs actifs
        active_users = conn.execute(text("""
            SELECT username, COUNT(*) as queries, SUM(cost_usd) as cost
            FROM query_logs
            WHERE timestamp > NOW() - INTERVAL ':days days'
            GROUP BY username
            ORDER BY queries DESC
        """).bindparams(days=days)).fetchall()

    success_rate = (success / total * 100) if total > 0 else 0
    error_rate = 100 - success_rate

    return {
        "period_days": days,
        "total_queries": total,
        "success_rate": round(success_rate, 1),
        "error_rate": round(error_rate, 1),
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
        "alerts": _check_alerts(error_rate, avg_latency, total_cost)
    }


def _check_alerts(error_rate: float, avg_latency: float, total_cost: float) -> list:
    """Génère des alertes automatiques si les seuils sont dépassés."""
    alerts = []
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
            "action": "Activer le cache sémantique"
        })
    return alerts