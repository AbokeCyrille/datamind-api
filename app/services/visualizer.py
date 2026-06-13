import json
import re
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from typing import Any


# DÉTECTION DES MOTS-CLÉS DANS LA QUESTION


KEYWORDS = {
    "pie": [
        "circulaire", "camembert", "pie", "donut", "part", "parts",
        "proportion", "pourcentage", "%", "répartition des",
        "distribution", "top", "domination"
    ],
    "line": [
        "évolution", "evolution", "tendance", "trend", "temporel",
        "au fil", "progression", "croissance", "historique", "série"
    ],
    "area": [
        "aire", "area", "volume", "cumul", "cumulé", "cumulatif"
    ],
    "bar_h": [
        "classement", "ranking", "top ", "palmarès", "palmares",
        "leaderboard", "meilleur", "pire", "plus grand", "plus petit"
    ],
    "funnel": [
        "entonnoir", "funnel", "pipeline", "conversion", "étape", "etape"
    ],
    "scatter": [
        "corrélation", "correlation", "relation entre", "nuage",
        "scatter", "dispersion"
    ],
    "heatmap": [
        "heatmap", "chaleur", "carte de chaleur", "matrice",
        "intensité", "intensite", "densité"
    ],
    "treemap": [
        "treemap", "hiérarchie", "hierarchie", "arbre", "imbriqué"
    ],
    "waterfall": [
        "waterfall", "cascade", "variation", "delta", "écart",
        "budget", "p&l", "résultat net"
    ],
    "bubble": [
        "bulle", "bubble", "taille proportionnelle"
    ],
    "stacked": [
        "empilé", "empile", "stacked", "composition", "cumulé par"
    ],
    "grouped": [
        "groupé", "groupe", "grouped", "côte à côte", "côte-à-côte",
        "comparaison entre", "vs", "versus"
    ],
}

def detect_chart_type_from_question(question: str) -> str | None:
    """Analyse la question et retourne le type de graphique demandé."""
    q = question.lower()
    for chart_type, keywords in KEYWORDS.items():
        for kw in keywords:
            if kw in q:
                return chart_type
    return None


# ─────────────────────────────────────────────────────────────────────────────
# ANALYSE DE LA STRUCTURE DES DONNÉES
# ─────────────────────────────────────────────────────────────────────────────

def analyze_dataframe(df: pd.DataFrame) -> dict:
    """Analyse les colonnes et retourne leur classification."""
    text_cols  = [c for c in df.columns if df[c].dtype == object]
    num_cols   = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
    date_cols  = [
        c for c in df.columns
        if any(kw in c.lower() for kw in
               ["date", "mois", "month", "année", "annee", "year",
                "trimestre", "quarter", "semaine", "week", "jour", "day"])
    ]
    # Essaie aussi de détecter les dates par valeur
    for c in text_cols:
        if c not in date_cols:
            sample = df[c].dropna().head(3).tolist()
            if any(re.search(r'\d{4}|\bjanvier\b|\bfévrier\b|\bfevrier\b|'
                             r'\bmars\b|\bavril\b|\bmai\b|\bjuin\b|'
                             r'\bjuillet\b|\baoût\b|\baout\b|\bseptembre\b|'
                             r'\boctobre\b|\bnovembre\b|\bdécembre\b|\bdecembre\b',
                             str(v), re.I) for v in sample):
                date_cols.append(c)

    return {
        "text_cols":  text_cols,
        "num_cols":   num_cols,
        "date_cols":  date_cols,
        "n_rows":     len(df),
        "n_cols":     len(df.columns),
        "n_categories": len(df[text_cols[0]].unique()) if text_cols else 0,
    }


# ─────────────────────────────────────────────────────────────────────────────
# THÈME COMMUN PLOTLY (dark premium)
# ─────────────────────────────────────────────────────────────────────────────

COLORS = ["#d4a843", "#7c5cbf", "#00d4ff", "#00ff88",
          "#ff4466", "#f0c060", "#9d7fe0", "#00b4d8"]


BASE_LAYOUT = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font=dict(family="Space Mono, monospace", color="#8892a4", size=11),
    margin=dict(l=60, r=30, t=60, b=60),
    legend=dict(
        bgcolor="rgba(17,24,39,0.8)",
        bordercolor="rgba(212,168,67,0.2)",
        borderwidth=1,
        font=dict(size=10)
    ),
    xaxis=dict(
        gridcolor="rgba(255,255,255,0.04)",
        zerolinecolor="rgba(255,255,255,0.08)",
        linecolor="rgba(255,255,255,0.08)"
    ),
    yaxis=dict(
        gridcolor="rgba(255,255,255,0.04)",
        zerolinecolor="rgba(255,255,255,0.08)",
        linecolor="rgba(255,255,255,0.08)",
        rangemode="tozero",      # ← Force l'axe Y à partir de 0
        automargin=True          # ← Évite que les barres soient coupées
    ),
    colorway=COLORS,
    autosize=True,
)

def apply_theme(fig, title: str = "") -> dict:
    """Applique le thème dark premium et retourne le dict JSON."""
    layout = dict(BASE_LAYOUT)
    layout["title"] = dict(
        text=title[:60] + ("..." if len(title) > 60 else ""),
        font=dict(size=13, color="#d4a843", family="Syne, sans-serif"),
        x=0.02
    )
    fig.update_layout(**layout)
    return json.loads(fig.to_json())


# ─────────────────────────────────────────────────────────────────────────────
# GÉNÉRATEURS PAR TYPE
# ─────────────────────────────────────────────────────────────────────────────

def make_bar(df, info, question, horizontal=False) -> dict:
    x_col = info["date_cols"][0] if info["date_cols"] else (
            info["text_cols"][0] if info["text_cols"] else df.columns[0])
    y_col = info["num_cols"][0] if info["num_cols"] else df.columns[-1]
    orientation = "h" if horizontal else "v"
    if horizontal:
        fig = px.bar(df, x=y_col, y=x_col, orientation="h",
                     color_discrete_sequence=COLORS)
    else:
        fig = px.bar(df, x=x_col, y=y_col,
                     color=x_col if info["n_categories"] <= 12 else None,
                     color_discrete_sequence=COLORS)
    return apply_theme(fig, question)


def make_grouped_bar(df, info, question) -> dict:
    text_cols = info["text_cols"]
    num_col   = info["num_cols"][0] if info["num_cols"] else df.columns[-1]
    if len(text_cols) >= 2:
        fig = px.bar(df, x=text_cols[0], y=num_col, color=text_cols[1],
                     barmode="group", color_discrete_sequence=COLORS)
    else:
        fig = px.bar(df, x=text_cols[0] if text_cols else df.columns[0],
                     y=num_col, barmode="group",
                     color_discrete_sequence=COLORS)
    return apply_theme(fig, question)


def make_stacked_bar(df, info, question) -> dict:
    text_cols = info["text_cols"]
    num_col   = info["num_cols"][0] if info["num_cols"] else df.columns[-1]
    if len(text_cols) >= 2:
        fig = px.bar(df, x=text_cols[0], y=num_col, color=text_cols[1],
                     barmode="stack", color_discrete_sequence=COLORS)
    else:
        fig = px.bar(df, x=text_cols[0] if text_cols else df.columns[0],
                     y=num_col, barmode="stack",
                     color_discrete_sequence=COLORS)
    return apply_theme(fig, question)


def make_pie(df, info, question, donut=False) -> dict:
    name_col  = info["text_cols"][0]  if info["text_cols"]  else df.columns[0]
    value_col = info["num_cols"][0]   if info["num_cols"]   else df.columns[-1]
    hole = 0.45 if donut else 0
    fig = go.Figure(go.Pie(
        labels=df[name_col],
        values=df[value_col],
        hole=hole,
        marker=dict(colors=COLORS, line=dict(color="#080a0f", width=2)),
        textfont=dict(size=11),
        hovertemplate="%{label}<br>%{value:,.0f}<br>%{percent}<extra></extra>"
    ))
    return apply_theme(fig, question)


def make_line(df, info, question) -> dict:
    x_col = (info["date_cols"][0] if info["date_cols"] else
             info["text_cols"][0] if info["text_cols"] else df.columns[0])
    y_cols = info["num_cols"] if info["num_cols"] else [df.columns[-1]]
    fig = go.Figure()
    for i, y_col in enumerate(y_cols[:4]):
        fig.add_trace(go.Scatter(
            x=df[x_col], y=df[y_col], mode="lines+markers",
            name=y_col, line=dict(color=COLORS[i % len(COLORS)], width=2),
            marker=dict(size=6),
            hovertemplate=f"{y_col}: %{{y:,.0f}}<extra></extra>"
        ))
    return apply_theme(fig, question)


def make_area(df, info, question) -> dict:
    x_col = (info["date_cols"][0] if info["date_cols"] else
             info["text_cols"][0] if info["text_cols"] else df.columns[0])
    y_cols = info["num_cols"] if info["num_cols"] else [df.columns[-1]]
    fig = go.Figure()
    for i, y_col in enumerate(y_cols[:3]):
        fig.add_trace(go.Scatter(
            x=df[x_col], y=df[y_col], mode="lines",
            fill="tozeroy" if i == 0 else "tonexty",
            name=y_col,
            line=dict(color=COLORS[i % len(COLORS)], width=2),
            fillcolor=COLORS[i % len(COLORS)].replace("#", "rgba(").rstrip(")") + ",0.15)"
                if COLORS[i % len(COLORS)].startswith("#") else COLORS[i % len(COLORS)]
        ))
    return apply_theme(fig, question)


def make_scatter(df, info, question) -> dict:
    num_cols = info["num_cols"]
    if len(num_cols) < 2:
        return make_bar(df, info, question)
    x_col, y_col = num_cols[0], num_cols[1]
    color_col = info["text_cols"][0] if info["text_cols"] else None
    fig = px.scatter(df, x=x_col, y=y_col, color=color_col,
                     color_discrete_sequence=COLORS,
                     trendline="ols" if len(df) > 3 else None)
    return apply_theme(fig, question)


def make_bubble(df, info, question) -> dict:
    num_cols = info["num_cols"]
    if len(num_cols) < 3:
        return make_scatter(df, info, question)
    x_col, y_col, size_col = num_cols[0], num_cols[1], num_cols[2]
    color_col = info["text_cols"][0] if info["text_cols"] else None
    fig = px.scatter(df, x=x_col, y=y_col, size=size_col,
                     color=color_col, color_discrete_sequence=COLORS,
                     size_max=60)
    return apply_theme(fig, question)


def make_funnel(df, info, question) -> dict:
    name_col  = info["text_cols"][0]  if info["text_cols"]  else df.columns[0]
    value_col = info["num_cols"][0]   if info["num_cols"]   else df.columns[-1]
    df_sorted = df.sort_values(value_col, ascending=False)
    fig = go.Figure(go.Funnel(
        y=df_sorted[name_col],
        x=df_sorted[value_col],
        marker=dict(color=COLORS[:len(df_sorted)]),
        textinfo="value+percent initial"
    ))
    return apply_theme(fig, question)


def make_heatmap(df, info, question) -> dict:
    num_cols  = info["num_cols"]
    text_cols = info["text_cols"]
    if len(text_cols) >= 2 and num_cols:
        pivot = df.pivot_table(index=text_cols[0], columns=text_cols[1],
                               values=num_cols[0], aggfunc="sum").fillna(0)
        fig = go.Figure(go.Heatmap(
            z=pivot.values, x=list(pivot.columns), y=list(pivot.index),
            colorscale=[[0, "#0d1117"], [0.5, "#7c5cbf"], [1, "#d4a843"]],
            hovertemplate="%{y} / %{x}<br>%{z:,.0f}<extra></extra>"
        ))
    else:
        # Fallback : matrice de corrélation si que des numériques
        corr = df[num_cols].corr() if len(num_cols) > 1 else df[num_cols]
        fig = go.Figure(go.Heatmap(
            z=corr.values, x=list(corr.columns), y=list(corr.index),
            colorscale=[[0, "#ff4466"], [0.5, "#0d1117"], [1, "#00ff88"]],
            zmid=0
        ))
    return apply_theme(fig, question)


def make_treemap(df, info, question) -> dict:
    text_cols = info["text_cols"]
    num_col   = info["num_cols"][0] if info["num_cols"] else df.columns[-1]
    if len(text_cols) >= 2:
        fig = px.treemap(df, path=text_cols[:2], values=num_col,
                         color=num_col, color_continuous_scale=["#1a2235", "#d4a843"])
    elif text_cols:
        fig = px.treemap(df, path=[text_cols[0]], values=num_col,
                         color=num_col, color_continuous_scale=["#1a2235", "#d4a843"])
    else:
        return make_bar(df, info, question)
    return apply_theme(fig, question)


def make_waterfall(df, info, question) -> dict:
    name_col  = info["text_cols"][0]  if info["text_cols"]  else df.columns[0]
    value_col = info["num_cols"][0]   if info["num_cols"]   else df.columns[-1]
    values    = df[value_col].tolist()
    # Couleur verte si positif, rouge si négatif
    colors = [COLORS[3] if v >= 0 else COLORS[4] for v in values]
    fig = go.Figure(go.Waterfall(
        name="", orientation="v",
        x=df[name_col].tolist(),
        y=values,
        connector=dict(line=dict(color="rgba(255,255,255,0.1)", width=1)),
        increasing=dict(marker_color=COLORS[3]),
        decreasing=dict(marker_color=COLORS[4]),
        totals=dict(marker_color=COLORS[0])
    ))
    return apply_theme(fig, question)



# FONCTION PRINCIPALE — POINT D'ENTRÉE

def generate_visual(data: list[dict[str, Any]], question: str) -> dict | None:
    """
    Génère automatiquement le meilleur graphique pour les données.

    Priorité de décision :
    1. Mots-clés dans la question (utilisateur demande explicitement un type)
    2. Structure des données (colonnes, types, cardinalité)
    3. Nombre de lignes / catégories
    """
    if not data or len(data) == 0:
        return None

    try:
        df   = pd.DataFrame(data)
        info = analyze_dataframe(df)

        # Pas assez de données pour un graphique
        if info["n_cols"] < 2 or info["n_rows"] == 0:
            return None

        # ── Étape 1 : détection par mots-clés ─────────────────────────────
        kw_type = detect_chart_type_from_question(question)

        if kw_type == "pie":
            return make_pie(df, info, question,
                            donut="donut" in question.lower())
        if kw_type == "line":
            return make_line(df, info, question)
        if kw_type == "area":
            return make_area(df, info, question)
        if kw_type == "funnel":
            return make_funnel(df, info, question)
        if kw_type == "scatter":
            return make_scatter(df, info, question)
        if kw_type == "bubble":
            return make_bubble(df, info, question)
        if kw_type == "heatmap":
            return make_heatmap(df, info, question)
        if kw_type == "treemap":
            return make_treemap(df, info, question)
        if kw_type == "waterfall":
            return make_waterfall(df, info, question)
        if kw_type == "stacked":
            return make_stacked_bar(df, info, question)
        if kw_type == "grouped":
            return make_grouped_bar(df, info, question)
        if kw_type == "bar_h":
            return make_bar(df, info, question, horizontal=True)

        # ── Étape 2 : décision automatique par structure ───────────────────

        has_dates  = len(info["date_cols"]) > 0
        has_text   = len(info["text_cols"]) > 0
        has_nums   = len(info["num_cols"])  > 0
        n_cat      = info["n_categories"]
        n_num      = len(info["num_cols"])
        n_text     = len(info["text_cols"])

        # Série temporelle → line
        if has_dates and has_nums:
            return make_line(df, info, question)

        # 3+ colonnes numériques → bubble ou scatter
        if n_num >= 3 and not has_text:
            return make_bubble(df, info, question)

        # 2 colonnes numériques → scatter
        if n_num == 2 and n_text == 0:
            return make_scatter(df, info, question)

        # 2 colonnes texte + 1 num → grouped bar
        if n_text >= 2 and has_nums:
            return make_grouped_bar(df, info, question)

        # Peu de catégories (≤ 6) → pie donut
        if has_text and has_nums and n_cat <= 6:
            return make_pie(df, info, question, donut=True)

        # Beaucoup de catégories (> 12) → bar horizontal (lisibilité)
        if has_text and has_nums and n_cat > 12:
            return make_bar(df, info, question, horizontal=True)

        # Défaut → bar chart vertical
        if has_text and has_nums:
            return make_bar(df, info, question)

        # Dernier recours
        return make_bar(df, info, question)

    except Exception as e:
        print(f"[visualizer] Erreur: {e}")
        return None


def generate_visual_from_config(
    data: list[dict[str, Any]],
    question: str,
    chart_type: str,
    x_col: str = None,
    y_col: str = None,
    color_col: str = None
) -> dict | None:
    """
    Génère un graphique en utilisant la config décidée par Claude.
    C'est la fonction principale — elle remplace generate_visual().
    Claude sait exactement quelles colonnes utiliser.
    """
    if not data:
        return None

    try:
        df   = pd.DataFrame(data)
        info = analyze_dataframe(df)

        # Valide que les colonnes existent dans le dataframe
        cols = df.columns.tolist()
        if x_col and x_col not in cols:
            x_col = None
        if y_col and y_col not in cols:
            y_col = None
        if color_col and color_col not in cols:
            color_col = None

        # Fallback sur l'analyse automatique si colonnes manquantes
        if not x_col:
            x_col = (info["date_cols"][0] if info["date_cols"] else
                     info["text_cols"][0] if info["text_cols"] else cols[0])
        if not y_col:
            y_col = info["num_cols"][0] if info["num_cols"] else cols[-1]

        # Dispatch selon le type décidé par Claude
        if chart_type == "pie":
            fig = go.Figure(go.Pie(
                labels=df[x_col], values=df[y_col], hole=0,
                marker=dict(colors=COLORS, line=dict(color="#080a0f", width=2)),
                hovertemplate="%{label}<br>%{value:,.0f}<br>%{percent}<extra></extra>"
            ))

        elif chart_type == "donut":
            fig = go.Figure(go.Pie(
                labels=df[x_col], values=df[y_col], hole=0.45,
                marker=dict(colors=COLORS, line=dict(color="#080a0f", width=2)),
                hovertemplate="%{label}<br>%{value:,.0f}<br>%{percent}<extra></extra>"
            ))

        elif chart_type == "line":
            fig = go.Figure(go.Scatter(
                x=df[x_col], y=df[y_col],
                mode="lines+markers",
                line=dict(color=COLORS[0], width=2),
                marker=dict(size=7),
                hovertemplate=f"{y_col}: %{{y:,.0f}}<extra></extra>"
            ))

        elif chart_type == "area":
            fig = go.Figure(go.Scatter(
                x=df[x_col], y=df[y_col],
                mode="lines", fill="tozeroy",
                line=dict(color=COLORS[0], width=2),
                fillcolor="rgba(212,168,67,0.15)"
            ))

        elif chart_type == "bar_h":
            fig = px.bar(
                df, x=y_col, y=x_col, orientation="h",
                color=color_col if color_col else None,
                color_discrete_sequence=COLORS
            )

        elif chart_type == "scatter":
            fig = px.scatter(
                df, x=x_col, y=y_col,
                color=color_col if color_col else None,
                color_discrete_sequence=COLORS
            )

        elif chart_type == "bubble":
            size_col = color_col or y_col
            fig = px.scatter(
                df, x=x_col, y=y_col,
                size=size_col if size_col in cols else None,
                color=color_col if color_col else None,
                color_discrete_sequence=COLORS,
                size_max=60
            )

        elif chart_type == "funnel":
            df_s = df.sort_values(y_col, ascending=False)
            fig = go.Figure(go.Funnel(
                y=df_s[x_col], x=df_s[y_col],
                marker=dict(color=COLORS[:len(df_s)]),
                textinfo="value+percent initial"
            ))

        elif chart_type == "treemap":
            path = [x_col] + ([color_col] if color_col and color_col in cols else [])
            fig = px.treemap(
                df, path=path, values=y_col,
                color=y_col,
                color_continuous_scale=["#1a2235", "#d4a843"]
            )

        elif chart_type == "waterfall":
            values = df[y_col].tolist()
            fig = go.Figure(go.Waterfall(
                x=df[x_col].tolist(), y=values,
                orientation="v",
                increasing=dict(marker_color=COLORS[3]),
                decreasing=dict(marker_color=COLORS[4]),
                totals=dict(marker_color=COLORS[0])
            ))

        elif chart_type == "heatmap":
            if color_col and color_col in cols:
                try:
                    pivot = df.pivot_table(
                        index=x_col, columns=color_col,
                        values=y_col, aggfunc="sum"
                    ).fillna(0)
                    fig = go.Figure(go.Heatmap(
                        z=pivot.values,
                        x=list(pivot.columns),
                        y=list(pivot.index),
                        colorscale=[[0,"#0d1117"],[0.5,"#7c5cbf"],[1,"#d4a843"]]
                    ))
                except Exception:
                    fig = px.bar(df, x=x_col, y=y_col,
                                 color_discrete_sequence=COLORS)
            else:
                fig = px.bar(df, x=x_col, y=y_col,
                             color_discrete_sequence=COLORS)

        elif chart_type in ("grouped", "stacked"):
            barmode = "group" if chart_type == "grouped" else "stack"
            fig = px.bar(
                df, x=x_col, y=y_col,
                color=color_col if color_col else None,
                barmode=barmode,
                color_discrete_sequence=COLORS
            )

        else:
            # Défaut : bar chart vertical
            fig = px.bar(
                df, x=x_col, y=y_col,
                color=color_col if color_col else None,
                color_discrete_sequence=COLORS
            )

        return apply_theme(fig, question)

    except Exception as e:
        print(f"[visualizer_config] Erreur: {e}")
        # Fallback sur l'ancienne méthode
        return generate_visual(data, question)