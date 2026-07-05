import { useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import api, { getTenants, createTenant, getUsers, createUser, toggleUser } from '../api/client'

// ═══════════════════════════════════════════════════════════════
// ICÔNES SVG — style Lucide, remplace tous les emojis
// ═══════════════════════════════════════════════════════════════
const PATHS = {
  chart:    <><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></>,
  building: <><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></>,
  users:    <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>,
  check:    <><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></>,
  zap:      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
  dollar:   <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
  trending: <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>,
  alert:    <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  pie:      <><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></>,
  plus:     <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  x:        <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  plug:     <><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/></>,
}

function Icon({ name, size = 15, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, verticalAlign: 'middle', ...style }}>
      {PATHS[name]}
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL — tabs directs, zéro redondance avec la topbar
// ═══════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const [tab, setTab] = useState('metrics')

  const TABS = [
    { id: 'metrics', label: 'Métriques',    icon: 'chart' },
    { id: 'tenants', label: 'Entreprises',  icon: 'building' },
    { id: 'users',   label: 'Utilisateurs', icon: 'users' },
  ]

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ ...S.tab, ...(tab === t.id ? S.tabActive : {}) }}>
            <Icon name={t.icon} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'metrics' && <MetricsPanel />}
      {tab === 'tenants' && <TenantsPanel />}
      {tab === 'users'   && <UsersPanel />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ONGLET 1 — MÉTRIQUES
// ═══════════════════════════════════════════════════════════════
function MetricsPanel() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [days, setDays]       = useState(7)

  useEffect(() => { fetchMetrics() }, [days])

  async function fetchMetrics() {
    setLoading(true)
    try {
      const res = await api.get(`/admin/metrics?days=${days}`)
      setMetrics(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur chargement')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loading label="Chargement des métriques..." />
  if (error)   return <ErrorBox msg={error} />

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[7, 14, 30].map(d => (
          <button key={d} onClick={() => setDays(d)}
            style={{ ...S.periodBtn, ...(days === d ? S.periodBtnActive : {}) }}>
            {d}j
          </button>
        ))}
      </div>

      {metrics.alerts?.map((a, i) => (
        <div key={i} style={{
          ...S.alert,
          borderColor: a.level === 'critical' ? '#ff4466' : '#d4a843',
          background: a.level === 'critical'
            ? 'rgba(255,68,102,0.08)' : 'rgba(212,168,67,0.08)'
        }}>
          <Icon name="alert" size={16}
            color={a.level === 'critical' ? '#ff4466' : '#d4a843'} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{a.message}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.action}</div>
          </div>
        </div>
      ))}

      <div style={S.kpiGrid}>
        <KPI icon="activity" label="REQUÊTES" value={metrics.total_queries} color="#d4a843" />
        <KPI icon="check" label="SUCCÈS" value={`${metrics.success_rate}%`}
          color={metrics.success_rate > 90 ? '#00ff88' : '#ff4466'} />
        <KPI icon="zap" label="LATENCE" value={`${Math.round(metrics.avg_latency_ms)}ms`}
          color={metrics.avg_latency_ms < 5000 ? '#00d4ff' : '#ff4466'} />
        <KPI icon="dollar" label="COÛT API" value={`$${metrics.total_cost_usd.toFixed(4)}`} color="#7c5cbf" />
      </div>

      <div style={S.chartsGrid}>
        {metrics.daily_stats?.length > 0 && (
          <div style={S.card}>
            <CardTitle icon="trending" label="Évolution quotidienne" />
            <Plot
              data={[
                { x: metrics.daily_stats.map(d => d.day),
                  y: metrics.daily_stats.map(d => d.total),
                  type: 'bar', name: 'Total', marker: { color: '#d4a843' } },
                { x: metrics.daily_stats.map(d => d.day),
                  y: metrics.daily_stats.map(d => d.success),
                  type: 'bar', name: 'Succès', marker: { color: '#00ff88' } }
              ]}
              layout={{ ...PLOT_LAYOUT, barmode: 'group' }}
              style={{ width: '100%', height: 200 }}
              config={{ displayModeBar: false }} useResizeHandler />
          </div>
        )}
        {metrics.chart_types?.length > 0 && (
          <div style={S.card}>
            <CardTitle icon="pie" label="Graphiques demandés" />
            <Plot
              data={[{
                labels: metrics.chart_types.map(c => c.type),
                values: metrics.chart_types.map(c => c.count),
                type: 'pie', hole: 0.45,
                marker: { colors: ['#d4a843','#7c5cbf','#00d4ff','#00ff88','#ff4466'] }
              }]}
              layout={PLOT_LAYOUT}
              style={{ width: '100%', height: 200 }}
              config={{ displayModeBar: false }} useResizeHandler />
          </div>
        )}
      </div>

      <div style={S.chartsGrid}>
        <div style={S.card}>
          <CardTitle icon="trending" label="Questions populaires" />
          {!metrics.top_questions?.length
            ? <Empty />
            : metrics.top_questions.map((q, i) => (
              <div key={i} style={S.row}>
                <span style={S.rank}>{i + 1}</span>
                <span style={S.rowText}>{q.question}</span>
                <span style={S.badge}>{q.count}x</span>
              </div>
            ))}
        </div>
        <div style={S.card}>
          <CardTitle icon="users" label="Utilisateurs actifs" />
          {!metrics.active_users?.length
            ? <Empty />
            : metrics.active_users.map((u, i) => (
              <div key={i} style={S.row}>
                <span style={S.rank}>{i + 1}</span>
                <span style={{ ...S.rowText, color: 'var(--gold)' }}>{u.username}</span>
                <span style={S.badge}>{u.queries} req</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ONGLET 2 — ENTREPRISES
// ═══════════════════════════════════════════════════════════════
function TenantsPanel() {
  const [tenants, setTenants]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    tenant_id: '', company_name: '', database_url: '', plan: 'starter'
  })

  useEffect(() => { fetchTenants() }, [])

  async function fetchTenants() {
    setLoading(true)
    try {
      const res = await getTenants()
      setTenants(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur chargement')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!form.tenant_id || !form.company_name || !form.database_url) {
      setError('Tous les champs sont requis'); return
    }
    setSubmitting(true); setError(''); setSuccess('')
    try {
      const res = await createTenant(form)
      setSuccess(`${res.data.message} — Connexion : ${res.data.connection_test}`)
      setForm({ tenant_id: '', company_name: '', database_url: '', plan: 'starter' })
      setShowForm(false)
      fetchTenants()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur création')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Loading label="Chargement des entreprises..." />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={S.sectionInfo}>
          {tenants.length} entreprise{tenants.length !== 1 ? 's' : ''} connectée{tenants.length !== 1 ? 's' : ''}
        </div>
        <button style={S.primaryBtn} onClick={() => setShowForm(s => !s)}>
          <Icon name={showForm ? 'x' : 'plus'} size={13} color="#080a0f" />
          {showForm ? 'Annuler' : 'Nouvelle entreprise'}
        </button>
      </div>

      {error   && <ErrorBox msg={error} />}
      {success && <SuccessBox msg={success} />}

      {showForm && (
        <div style={{ ...S.card, marginBottom: 16, border: '1px solid var(--border-gold)' }}>
          <CardTitle icon="building" label="Connecter une nouvelle entreprise" />

          <Field label="IDENTIFIANT TECHNIQUE" hint="minuscules, sans espaces — ex: orange_ci">
            <input style={S.input} value={form.tenant_id}
              placeholder="orange_ci"
              onChange={e => setForm({ ...form, tenant_id: e.target.value.toLowerCase().replace(/\s/g, '_') })} />
          </Field>

          <Field label="NOM DE L'ENTREPRISE">
            <input style={S.input} value={form.company_name}
              placeholder="Orange Côte d'Ivoire"
              onChange={e => setForm({ ...form, company_name: e.target.value })} />
          </Field>

          <Field label="URL DE LEUR BASE DE DONNÉES"
            hint="Connexion testée avant validation. Credentials chiffrés AES-128.">
            <input style={S.input} value={form.database_url}
              placeholder="postgresql://user:password@host:5432/database"
              onChange={e => setForm({ ...form, database_url: e.target.value })} />
          </Field>

          <Field label="PLAN">
            <select style={S.input} value={form.plan}
              onChange={e => setForm({ ...form, plan: e.target.value })}>
              <option value="starter">Starter — 100 requêtes/jour</option>
              <option value="business">Business — 500 requêtes/jour</option>
              <option value="enterprise">Enterprise — 5000 requêtes/jour</option>
            </select>
          </Field>

          <button style={{ ...S.primaryBtn, width: '100%', marginTop: 8, justifyContent: 'center' }}
            onClick={handleSubmit} disabled={submitting}>
            <Icon name="plug" size={13} color="#080a0f" />
            {submitting ? 'Test de connexion en cours...' : 'Tester & Connecter'}
          </button>
        </div>
      )}

      {tenants.length === 0 && !showForm
        ? <div style={S.card}><Empty label="Aucune entreprise connectée — cliquez sur Nouvelle entreprise" /></div>
        : tenants.map((t, i) => (
          <div key={i} style={{ ...S.card, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                  {t.company_name}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  ID: {t.tenant_id} · Créé le {t.created_at?.slice(0, 10)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ ...S.planBadge, ...planColor(t.plan) }}>
                  {t.plan.toUpperCase()}
                </span>
                <span style={{ ...S.badge, color: t.is_active ? '#00ff88' : '#ff4466' }}>
                  {t.is_active ? '● ACTIF' : '○ SUSPENDU'}
                </span>
                <span style={S.badge}>{t.max_queries_per_day} req/j</span>
              </div>
            </div>
          </div>
        ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ONGLET 3 — UTILISATEURS
// ═══════════════════════════════════════════════════════════════
function UsersPanel() {
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  const [form, setForm] = useState({
    username: '', email: '', password: '', role: 'user', tenant_id: 'default'
  })

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await getUsers()
      setUsers(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur chargement')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!form.username || !form.password) {
      setError('Username et mot de passe requis'); return
    }
    setError(''); setSuccess('')
    try {
      const res = await createUser(form)
      setSuccess(res.data.message)
      setForm({ username: '', email: '', password: '', role: 'user', tenant_id: 'default' })
      setShowForm(false)
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur création')
    }
  }

  async function handleToggle(username) {
    try {
      await toggleUser(username)
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur')
    }
  }

  if (loading) return <Loading label="Chargement des utilisateurs..." />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={S.sectionInfo}>
          {users.length} compte{users.length !== 1 ? 's' : ''}
        </div>
        <button style={S.primaryBtn} onClick={() => setShowForm(s => !s)}>
          <Icon name={showForm ? 'x' : 'plus'} size={13} color="#080a0f" />
          {showForm ? 'Annuler' : 'Nouvel utilisateur'}
        </button>
      </div>

      {error   && <ErrorBox msg={error} />}
      {success && <SuccessBox msg={success} />}

      {showForm && (
        <div style={{ ...S.card, marginBottom: 16, border: '1px solid var(--border-gold)' }}>
          <CardTitle icon="users" label="Créer un compte" />

          <Field label="USERNAME">
            <input style={S.input} value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })} />
          </Field>
          <Field label="EMAIL">
            <input style={S.input} value={form.email} type="email"
              onChange={e => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="MOT DE PASSE">
            <input style={S.input} value={form.password} type="password"
              onChange={e => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="RÔLE">
            <select style={S.input} value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="user">Utilisateur</option>
              <option value="admin">Admin client</option>
              <option value="superadmin">Superadmin Oramiz</option>
            </select>
          </Field>
          <Field label="ENTREPRISE (tenant_id)">
            <input style={S.input} value={form.tenant_id}
              placeholder="orange_ci"
              onChange={e => setForm({ ...form, tenant_id: e.target.value })} />
          </Field>

          <button style={{ ...S.primaryBtn, width: '100%', marginTop: 8, justifyContent: 'center' }}
            onClick={handleSubmit}>
            Créer le compte
          </button>
        </div>
      )}

      {users.map((u, i) => (
        <div key={i} style={{ ...S.card, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                {u.username}
                <span style={{ ...S.roleBadge, ...roleColor(u.role), marginLeft: 10 }}>
                  {u.role}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                {u.email || '—'} · tenant: {u.tenant_id}
              </div>
            </div>
            <button onClick={() => handleToggle(u.username)}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                cursor: 'pointer', border: '1px solid',
                borderColor: u.is_active ? 'rgba(0,255,136,0.3)' : 'rgba(255,68,102,0.3)',
                color: u.is_active ? '#00ff88' : '#ff4466',
                background: 'transparent', padding: '4px 12px', borderRadius: 6
              }}>
              {u.is_active ? '● ACTIF' : '○ DÉSACTIVÉ'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// COMPOSANTS RÉUTILISABLES
// ═══════════════════════════════════════════════════════════════
function KPI({ icon, label, value, color }) {
  return (
    <div style={S.card}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: `${color}15`, border: `1px solid ${color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 10
      }}>
        <Icon name={icon} size={16} color={color} />
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 24, color, fontFamily: 'var(--font-display)' }}>{value}</div>
    </div>
  )
}

function CardTitle({ icon, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontFamily: 'var(--font-mono)', fontSize: 11,
      color: 'var(--text-secondary)', letterSpacing: '0.08em',
      marginBottom: 14, fontWeight: 700
    }}>
      <Icon name={icon} size={13} color="var(--gold)" />
      {label.toUpperCase()}
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{hint}</div>}
    </div>
  )
}

function Loading({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 40, justifyContent: 'center' }}>
      <span style={{ width: 20, height: 20, border: '2px solid rgba(212,168,67,0.3)', borderTopColor: '#d4a843', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
      <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{label}</span>
    </div>
  )
}

function ErrorBox({ msg }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,68,102,0.08)', border: '1px solid rgba(255,68,102,0.3)', borderRadius: 8, padding: '10px 14px', color: '#ff8899', fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 12 }}>
      <Icon name="alert" size={14} color="#ff4466" />{msg}
    </div>
  )
}

function SuccessBox({ msg }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 8, padding: '10px 14px', color: '#00ff88', fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 12 }}>
      <Icon name="check" size={14} color="#00ff88" />{msg}
    </div>
  )
}

function Empty({ label = 'Aucune donnée' }) {
  return <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>{label}</div>
}

function planColor(plan) {
  const map = {
    starter:    { color: '#00d4ff', borderColor: 'rgba(0,212,255,0.3)' },
    business:   { color: '#d4a843', borderColor: 'rgba(212,168,67,0.3)' },
    enterprise: { color: '#7c5cbf', borderColor: 'rgba(124,92,191,0.3)' },
  }
  return map[plan] || map.starter
}

function roleColor(role) {
  const map = {
    superadmin: { color: '#7c5cbf', background: 'rgba(124,92,191,0.1)' },
    admin:      { color: '#d4a843', background: 'rgba(212,168,67,0.1)' },
    user:       { color: '#00d4ff', background: 'rgba(0,212,255,0.1)' },
  }
  return map[role] || map.user
}

const PLOT_LAYOUT = {
  paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
  font: { color: '#8892a4', family: 'Space Mono', size: 10 },
  margin: { l: 40, r: 10, t: 10, b: 40 },
  xaxis: { gridcolor: 'rgba(255,255,255,0.04)' },
  yaxis: { gridcolor: 'rgba(255,255,255,0.04)', rangemode: 'tozero' },
  showlegend: true,
  legend: { bgcolor: 'transparent', font: { size: 10 } }
}

const S = {
  tabs: { display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' },
  tab: {
    display: 'flex', alignItems: 'center', gap: 7,
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text-muted)', borderRadius: 8, padding: '8px 16px',
    cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12
  },
  tabActive: {
    background: 'var(--gold-glow)', border: '1px solid var(--border-gold)',
    color: 'var(--gold)'
  },
  periodBtn: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text-muted)', borderRadius: 6, padding: '5px 12px',
    cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11
  },
  periodBtnActive: {
    background: 'var(--gold-glow)', border: '1px solid var(--border-gold)', color: 'var(--gold)'
  },
  alert: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    border: '1px solid', borderRadius: 8, padding: '10px 14px',
    fontSize: 13, marginBottom: 10
  },
  kpiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12, marginBottom: 20
  },
  chartsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 12, marginBottom: 20
  },
  card: {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '16px 20px'
  },
  sectionInfo: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' },
  primaryBtn: {
    display: 'flex', alignItems: 'center', gap: 7,
    background: 'linear-gradient(135deg, #d4a843, #f0c060)',
    color: '#080a0f', border: 'none', borderRadius: 8,
    padding: '8px 18px', cursor: 'pointer',
    fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700
  },
  input: {
    width: '100%', padding: '10px 12px',
    background: 'var(--bg-deep)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)', fontSize: 13,
    outline: 'none', boxSizing: 'border-box'
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 0', borderBottom: '1px solid var(--border)'
  },
  rank: {
    width: 22, height: 22, background: 'var(--gold-glow)',
    border: '1px solid var(--border-gold)', borderRadius: 4,
    color: 'var(--gold)', fontSize: 10, fontFamily: 'var(--font-mono)',
    flexShrink: 0, lineHeight: '22px', textAlign: 'center'
  },
  rowText: {
    flex: 1, fontSize: 12, color: 'var(--text-secondary)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
  },
  badge: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gold)', flexShrink: 0 },
  planBadge: {
    fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
    border: '1px solid', borderRadius: 4, padding: '3px 8px',
    letterSpacing: '0.08em'
  },
  roleBadge: {
    fontFamily: 'var(--font-mono)', fontSize: 9,
    borderRadius: 4, padding: '2px 8px', letterSpacing: '0.05em'
  }
}