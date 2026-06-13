import { useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import { query as apiClient } from '../api/client'
import api from '../api/client'

export default function AdminDashboard({ onBack }) {
  const [metrics, setMetrics]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [days, setDays]         = useState(7)

  useEffect(() => { fetchMetrics() }, [days])

  async function fetchMetrics() {
    setLoading(true)
    try {
      const res = await api.get(`/admin/metrics?days=${days}`)
      setMetrics(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur chargement métriques')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={S.loading}>
      <div style={S.spinner} />
      <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
        Chargement des métriques MLOps...
      </span>
    </div>
  )

  if (error) return (
    <div style={S.error}>⚠ {error}</div>
  )

  const COLORS = ['#d4a843', '#7c5cbf', '#00d4ff', '#00ff88', '#ff4466']

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.headerTitle}>⚙ Dashboard MLOps</div>
          <div style={S.headerSub}>Observabilité temps réel — Oramiz Admin</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Sélecteur de période */}
          {[7, 14, 30].map(d => (
            <button
              key={d}
              style={{ ...S.periodBtn, ...(days === d ? S.periodBtnActive : {}) }}
              onClick={() => setDays(d)}
            >
              {d}j
            </button>
          ))}
          <button style={S.backBtn} onClick={onBack}>← Retour</button>
        </div>
      </div>

      {/* Alertes */}
      {metrics.alerts?.length > 0 && (
        <div style={S.alertsSection}>
          {metrics.alerts.map((a, i) => (
            <div key={i} style={{
              ...S.alert,
              borderColor: a.level === 'critical' ? '#ff4466' : '#d4a843',
              background: a.level === 'critical' ? 'rgba(255,68,102,0.08)' : 'rgba(212,168,67,0.08)'
            }}>
              <span style={{ color: a.level === 'critical' ? '#ff4466' : '#d4a843' }}>
                {a.level === 'critical' ? '🚨' : '⚠️'}
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{a.message}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{a.action}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div style={S.kpiGrid}>
        <KPICard
          label="REQUÊTES TOTALES"
          value={metrics.total_queries}
          unit=""
          color="#d4a843"
          icon="📊"
        />
        <KPICard
          label="TAUX DE SUCCÈS"
          value={metrics.success_rate}
          unit="%"
          color={metrics.success_rate > 90 ? '#00ff88' : '#ff4466'}
          icon="✅"
        />
        <KPICard
          label="LATENCE MOYENNE"
          value={Math.round(metrics.avg_latency_ms)}
          unit="ms"
          color={metrics.avg_latency_ms < 5000 ? '#00d4ff' : '#ff4466'}
          icon="⚡"
        />
        <KPICard
          label="COÛT API TOTAL"
          value={metrics.total_cost_usd.toFixed(4)}
          unit="$"
          color="#7c5cbf"
          icon="💰"
        />
      </div>

      {/* Graphiques */}
      <div style={S.chartsGrid}>
        {/* Évolution quotidienne */}
        {metrics.daily_stats?.length > 0 && (
          <div style={S.chartCard}>
            <div style={S.chartTitle}>📈 Évolution quotidienne</div>
            <Plot
              data={[
                {
                  x: metrics.daily_stats.map(d => d.day),
                  y: metrics.daily_stats.map(d => d.total),
                  type: 'bar', name: 'Total',
                  marker: { color: '#d4a843' }
                },
                {
                  x: metrics.daily_stats.map(d => d.day),
                  y: metrics.daily_stats.map(d => d.success),
                  type: 'bar', name: 'Succès',
                  marker: { color: '#00ff88' }
                }
              ]}
              layout={{
                ...PLOT_LAYOUT,
                barmode: 'group',
                title: { text: '' }
              }}
              style={{ width: '100%', height: 220 }}
              config={{ displayModeBar: false }}
              useResizeHandler
            />
          </div>
        )}

        {/* Types de graphiques utilisés */}
        {metrics.chart_types?.length > 0 && (
          <div style={S.chartCard}>
            <div style={S.chartTitle}>🎨 Graphiques les plus demandés</div>
            <Plot
              data={[{
                labels: metrics.chart_types.map(c => c.type),
                values: metrics.chart_types.map(c => c.count),
                type: 'pie', hole: 0.45,
                marker: { colors: COLORS, line: { color: '#080a0f', width: 2 } }
              }]}
              layout={{ ...PLOT_LAYOUT, title: { text: '' } }}
              style={{ width: '100%', height: 220 }}
              config={{ displayModeBar: false }}
              useResizeHandler
            />
          </div>
        )}

        {/* Coût journalier */}
        {metrics.daily_stats?.length > 0 && (
          <div style={S.chartCard}>
            <div style={S.chartTitle}>💰 Coût API par jour ($)</div>
            <Plot
              data={[{
                x: metrics.daily_stats.map(d => d.day),
                y: metrics.daily_stats.map(d => d.cost),
                type: 'scatter', mode: 'lines+markers',
                line: { color: '#7c5cbf', width: 2 },
                marker: { size: 6, color: '#9d7fe0' },
                fill: 'tozeroy',
                fillcolor: 'rgba(124,92,191,0.1)'
              }]}
              layout={{ ...PLOT_LAYOUT, title: { text: '' } }}
              style={{ width: '100%', height: 220 }}
              config={{ displayModeBar: false }}
              useResizeHandler
            />
          </div>
        )}

        {/* Latence par jour */}
        {metrics.daily_stats?.length > 0 && (
          <div style={S.chartCard}>
            <div style={S.chartTitle}>⚡ Latence moyenne par jour (ms)</div>
            <Plot
              data={[{
                x: metrics.daily_stats.map(d => d.day),
                y: metrics.daily_stats.map(d => d.avg_latency),
                type: 'scatter', mode: 'lines+markers',
                line: { color: '#00d4ff', width: 2 },
                marker: { size: 6 },
                fill: 'tozeroy',
                fillcolor: 'rgba(0,212,255,0.08)'
              }]}
              layout={{ ...PLOT_LAYOUT, title: { text: '' } }}
              style={{ width: '100%', height: 220 }}
              config={{ displayModeBar: false }}
              useResizeHandler
            />
          </div>
        )}
      </div>

      {/* Tableaux */}
      <div style={S.tablesGrid}>
        {/* Top questions */}
        <div style={S.tableCard}>
          <div style={S.chartTitle}>🔥 Questions les plus posées</div>
          {metrics.top_questions?.length === 0
            ? <div style={S.empty}>Aucune donnée</div>
            : metrics.top_questions?.map((q, i) => (
              <div key={i} style={S.tableRow}>
                <span style={S.rankBadge}>{i + 1}</span>
                <span style={S.questionText}>{q.question}</span>
                <span style={S.countBadge}>{q.count}x</span>
              </div>
            ))
          }
        </div>

        {/* Utilisateurs actifs */}
        <div style={S.tableCard}>
          <div style={S.chartTitle}>👥 Utilisateurs actifs</div>
          {metrics.active_users?.length === 0
            ? <div style={S.empty}>Aucune donnée</div>
            : metrics.active_users?.map((u, i) => (
              <div key={i} style={S.tableRow}>
                <span style={S.rankBadge}>{i + 1}</span>
                <span style={{ ...S.questionText, color: '#d4a843' }}>{u.username}</span>
                <span style={S.countBadge}>{u.queries} req</span>
                <span style={{ ...S.countBadge, color: '#7c5cbf' }}>${u.cost}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

function KPICard({ label, value, unit, color, icon }) {
  return (
    <div style={S.kpiCard}>
      <div style={S.kpiIcon}>{icon}</div>
      <div style={S.kpiLabel}>{label}</div>
      <div style={{ ...S.kpiValue, color }}>
        {unit === '$' && <span style={{ fontSize: 16 }}>$</span>}
        {value}
        {unit !== '$' && unit && <span style={{ fontSize: 16, marginLeft: 4 }}>{unit}</span>}
      </div>
    </div>
  )
}

const PLOT_LAYOUT = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  font: { color: '#8892a4', family: 'Space Mono', size: 10 },
  margin: { l: 40, r: 10, t: 10, b: 40 },
  xaxis: { gridcolor: 'rgba(255,255,255,0.04)', linecolor: 'rgba(255,255,255,0.08)' },
  yaxis: { gridcolor: 'rgba(255,255,255,0.04)', linecolor: 'rgba(255,255,255,0.08)', rangemode: 'tozero' },
  legend: { bgcolor: 'transparent', font: { size: 10 } },
  showlegend: true
}

const S = {
  page: { padding: '0 0 40px' },
  loading: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 16, padding: 60
  },
  spinner: {
    width: 24, height: 24, border: '2px solid rgba(212,168,67,0.3)',
    borderTopColor: '#d4a843', borderRadius: '50%',
    animation: 'spin 0.7s linear infinite'
  },
  error: {
    background: 'rgba(255,68,102,0.08)', border: '1px solid rgba(255,68,102,0.3)',
    borderRadius: 8, padding: '12px 16px', color: '#ff8899',
    fontFamily: 'var(--font-mono)', fontSize: 13
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24, paddingBottom: 20,
    borderBottom: '1px solid var(--border)'
  },
  headerTitle: { fontWeight: 800, fontSize: 20, color: 'var(--text-primary)' },
  headerSub: {
    fontFamily: 'var(--font-mono)', fontSize: 11,
    color: 'var(--gold)', marginTop: 4
  },
  periodBtn: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text-muted)', borderRadius: 6,
    padding: '5px 12px', cursor: 'pointer',
    fontFamily: 'var(--font-mono)', fontSize: 11
  },
  periodBtnActive: {
    background: 'var(--gold-glow)', border: '1px solid var(--border-gold)',
    color: 'var(--gold)'
  },
  backBtn: {
    background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--text-secondary)', borderRadius: 6,
    padding: '5px 14px', cursor: 'pointer',
    fontFamily: 'var(--font-mono)', fontSize: 11
  },
  alertsSection: { marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 },
  alert: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    border: '1px solid', borderRadius: 8, padding: '10px 14px',
    fontSize: 13
  },
  kpiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12, marginBottom: 20
  },
  kpiCard: {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '16px 20px'
  },
  kpiIcon: { fontSize: 20, marginBottom: 8 },
  kpiLabel: {
    fontFamily: 'var(--font-mono)', fontSize: 9,
    color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 8
  },
  kpiValue: { fontWeight: 800, fontSize: 28, fontFamily: 'var(--font-display)' },
  chartsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12, marginBottom: 20
  },
  chartCard: {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '16px 20px'
  },
  chartTitle: {
    fontFamily: 'var(--font-mono)', fontSize: 11,
    color: 'var(--text-secondary)', letterSpacing: '0.08em',
    marginBottom: 12, fontWeight: 700
  },
  tablesGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12
  },
  tableCard: {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '16px 20px'
  },
  tableRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 0', borderBottom: '1px solid var(--border)'
  },
  rankBadge: {
    width: 22, height: 22, background: 'var(--gold-glow)',
    border: '1px solid var(--border-gold)', borderRadius: 4,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--gold)', fontSize: 10, fontFamily: 'var(--font-mono)',
    flexShrink: 0, lineHeight: '22px', textAlign: 'center'
  },
  questionText: {
    flex: 1, fontSize: 12, color: 'var(--text-secondary)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
  },
  countBadge: {
    fontFamily: 'var(--font-mono)', fontSize: 11,
    color: 'var(--gold)', flexShrink: 0
  },
  empty: {
    color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
    fontSize: 12, padding: '20px 0', textAlign: 'center'
  }
}