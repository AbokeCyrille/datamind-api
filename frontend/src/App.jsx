import { useState, useRef } from 'react'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import ChatInput from './components/ChatInput'
import ResultCard from './components/ResultCard'
import AdminDashboard from './components/AdminDashboard'
import { query } from './api/client'

export default function App() {
  const [authed,    setAuthed]    = useState(!!localStorage.getItem('dm_token'))
  const [history,   setHistory]   = useState([])
  const [active,    setActive]    = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [showAdmin, setShowAdmin] = useState(false)
  const topRef = useRef(null)

  function logout() {
    localStorage.removeItem('dm_token')
    localStorage.removeItem('dm_role')
    setAuthed(false)
    setHistory([])
    setActive(null)
  }

  function handleLogin() {
    setAuthed(true)
    localStorage.setItem('dm_role', 'admin')
  }

  async function handleQuery(question, withVisual) {
    setLoading(true); setError('')
    try {
      const res = await query(question, withVisual)
      const item = { ...res.data, _isNew: true }
      setHistory(prev => {
        setActive(0)
        return [item, ...prev]
      })
      topRef.current?.scrollIntoView({ behavior: 'smooth' })
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur inattendue.')
    } finally {
      setLoading(false)
    }
  }

  if (!authed) return <Login onLogin={handleLogin} />

  const displayed = active !== null ? [history[active]] : history

  return (
    <div style={S.root}>
      <Sidebar
        history={history}
        activeIndex={active}
        onSelect={i => setActive(i)}
        onClear={() => { setHistory([]); setActive(null) }}
      />

      <div style={S.main}>
        {/* Topbar */}
        <header style={S.topbar}>
          <div style={S.topbarLeft}>
            <div style={S.topbarTitle}>Analyse de données</div>
            <div style={S.topbarSub}>
              {history.length} requête{history.length !== 1 ? 's' : ''} · Session active
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={S.liveTag}>
              <span style={S.liveDot} />
              LIVE
            </div>
            {localStorage.getItem('dm_role') === 'admin' && (
              <button style={S.adminBtn} onClick={() => setShowAdmin(s => !s)}>
                {showAdmin ? '← Requêtes' : '⚙ Admin'}
              </button>
            )}
            <button style={S.logoutBtn} onClick={logout}>
              Déconnexion
            </button>
          </div>
        </header>

        {/* Corps */}
        <div style={S.body}>
          {showAdmin ? (
            <AdminDashboard onBack={() => setShowAdmin(false)} />
          ) : (
            <>
              <div ref={topRef} />
              <ChatInput onSubmit={handleQuery} loading={loading} />

              {loading && (
                <div style={S.loadingCard}>
                  <div style={S.loadingDots}>
                    {[0,1,2].map(i => (
                      <span key={i} style={{ ...S.dot, animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                  <div style={S.loadingText}>
                    <span style={{ color: 'var(--gold)' }}>DataMind</span>
                    {' '}analyse votre question · génération SQL · interrogation BDD...
                  </div>
                </div>
              )}

              {error && (
                <div style={S.errorCard}>
                  <span style={{ color: '#ff4466', marginRight: 10 }}>⚠</span>
                  {error}
                </div>
              )}

              {!loading && history.length === 0 && (
                <div style={S.empty}>
                  <div style={S.emptyGrid} />
                  <svg style={S.emptyIcon} viewBox="0 0 80 80" fill="none">
                    <rect x="1" y="1" width="78" height="78" rx="16" stroke="rgba(212,168,67,0.3)" strokeWidth="1"/>
                    <path d="M20 40 L30 28 L45 52 L55 40" stroke="#d4a843" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <circle cx="20" cy="40" r="3" fill="#d4a843"/>
                    <circle cx="55" cy="40" r="3" fill="#d4a843"/>
                    <circle cx="40" cy="22" r="2" fill="rgba(212,168,67,0.4)"/>
                  </svg>
                  <h2 style={S.emptyTitle}>Prêt pour l'analyse</h2>
                  <p style={S.emptySub}>
                    Posez une question en français — DataMind génère le SQL,
                    interroge votre base de données et vous présente les résultats.
                  </p>
                  <div style={S.emptyExamples}>
                    {['Ventes par région en janvier', 'Top 5 vendeurs ce trimestre', 'Évolution mensuelle des ventes'].map((ex, i) => (
                      <div key={i} style={S.exTag} onClick={() => handleQuery(ex, true)}>
                        → {ex}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {displayed.map((item, i) => (
                <ResultCard
                  key={`${active}-${i}`}
                  result={item}
                  isNew={i === 0 && item._isNew}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const S = {
  root: { display: 'flex', height: '100vh', overflow: 'hidden' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar: {
    height: 56, flexShrink: 0,
    background: 'var(--bg-deep)',
    borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px'
  },
  topbarLeft: {},
  topbarTitle: { fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' },
  topbarSub: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 1 },
  liveTag: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)',
    borderRadius: 20, padding: '3px 10px',
    fontFamily: 'var(--font-mono)', fontSize: 9,
    color: '#00ff88', letterSpacing: '0.1em'
  },
  liveDot: { width: 6, height: 6, borderRadius: '50%', background: '#00ff88', animation: 'pulse-gold 2s infinite' },
  adminBtn: {
    background: 'rgba(212,168,67,0.1)', border: '1px solid var(--border-gold)',
    color: 'var(--gold)', borderRadius: 8, padding: '5px 14px',
    cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11
  },
  logoutBtn: {
    background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--text-muted)', borderRadius: 'var(--radius-md)',
    padding: '5px 14px', cursor: 'pointer',
    fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em'
  },
  body: {
    flex: 1, overflowY: 'auto', padding: '28px 32px',
    maxWidth: 900, width: '100%', margin: '0 auto', boxSizing: 'border-box'
  },
  loadingCard: {
    display: 'flex', alignItems: 'center', gap: 16,
    background: 'var(--bg-surface)', border: '1px solid var(--border-gold)',
    borderRadius: 'var(--radius-lg)', padding: '16px 20px',
    marginBottom: 16, animation: 'fadeIn 0.3s ease'
  },
  loadingDots: { display: 'flex', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', animation: 'pulse-gold 1.2s ease-in-out infinite' },
  loadingText: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' },
  errorCard: {
    background: 'rgba(255,68,102,0.06)', border: '1px solid rgba(255,68,102,0.25)',
    borderRadius: 'var(--radius-md)', padding: '12px 16px',
    fontFamily: 'var(--font-mono)', fontSize: 12, color: '#ff8899', marginBottom: 16
  },
  empty: { textAlign: 'center', padding: '60px 40px', position: 'relative', overflow: 'hidden' },
  emptyGrid: {
    position: 'absolute', inset: 0,
    backgroundImage: `linear-gradient(rgba(212,168,67,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,67,0.03) 1px, transparent 1px)`,
    backgroundSize: '32px 32px', pointerEvents: 'none'
  },
  emptyIcon: { width: 80, height: 80, margin: '0 auto 24px', display: 'block', position: 'relative' },
  emptyTitle: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: 'var(--text-primary)', marginBottom: 12, position: 'relative' },
  emptySub: { color: 'var(--text-muted)', fontSize: 13, maxWidth: 460, margin: '0 auto 28px', fontFamily: 'var(--font-mono)', lineHeight: 1.7, position: 'relative' },
  emptyExamples: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' },
  exTag: {
    background: 'var(--gold-glow)', border: '1px solid var(--border-gold)',
    color: 'var(--gold)', borderRadius: 20, padding: '6px 16px',
    fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-mono)',
    transition: 'background 0.15s', position: 'relative'
  }
}