import { useState, useRef } from 'react'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import ChatInput from './components/ChatInput'
import ResultCard from './components/ResultCard'
import AdminDashboard from './components/AdminDashboard'
import { query } from './api/client'
import { useIsMobile } from './hooks/useIsMobile'

export default function App() {
  const [authed,      setAuthed]      = useState(!!localStorage.getItem('dm_token'))
  const [history,     setHistory]     = useState([])
  const [active,      setActive]      = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [showAdmin,   setShowAdmin]   = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const topRef = useRef(null)
  const isMobile = useIsMobile()

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
    setSidebarOpen(false) // ferme sidebar sur mobile après envoi
    try {
      const res = await query(question, withVisual)
      const item = { ...res.data, _isNew: true }
      setHistory(prev => { setActive(0); return [item, ...prev] })
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
      {/* Overlay sidebar mobile */}
      {sidebarOpen && (
        <div style={S.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div style={{
  ...S.sidebarWrap,
  position: isMobile ? 'fixed' : 'relative',
  transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
  zIndex: isMobile ? 200 : 'auto',
}}>
        <Sidebar
          history={history}
          activeIndex={active}
          onSelect={i => { setActive(i); setSidebarOpen(false) }}
          onClear={() => { setHistory([]); setActive(null) }}
        />
      </div>

      {/* Main */}
      <div style={{
  ...S.main,
  marginLeft: isMobile ? 0 : 240
}}>
        {/* Topbar */}
        <header style={S.topbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Hamburger mobile */}
            <button
  style={{ ...S.hamburger, display: isMobile ? 'flex' : 'none' }}
  onClick={() => setSidebarOpen(s => !s)}
>
  <span style={S.hamburgerLine} />
  <span style={S.hamburgerLine} />
  <span style={S.hamburgerLine} />
</button>
            <div>
              <div style={S.topbarTitle}>DataMind</div>
              <div style={S.topbarSub}>
                {history.length} requête{history.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={S.liveTag}>
              <span style={S.liveDot} />
              <span style={{ display: 'none', ...S.liveText }}>LIVE</span>
            </div>
            {localStorage.getItem('dm_role') === 'admin' && (
              <button style={S.adminBtn} onClick={() => setShowAdmin(s => !s)}>
                {showAdmin ? '←' : '⚙'}
              </button>
            )}
            <button style={S.logoutBtn} onClick={logout}>
              ⏻
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
                    {' '}analyse...
                  </div>
                </div>
              )}

              {error && (
                <div style={S.errorCard}>
                  <span style={{ color: '#ff4466', marginRight: 8 }}>⚠</span>
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
                  </svg>
                  <h2 style={S.emptyTitle}>Prêt pour l'analyse</h2>
                  <p style={S.emptySub}>
                    Posez une question en français
                  </p>
                  <div style={S.emptyExamples}>
                    {[
                      'Ventes par région en janvier',
                      'Top 5 vendeurs',
                      'Évolution mensuelle',
                    ].map((ex, i) => (
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
  root: {
    display: 'flex', height: '100dvh',
    overflow: 'hidden', position: 'relative'
  },

  // Sidebar — slide-in sur mobile
  sidebarWrap: {
    position: 'fixed', top: 0, left: 0,
    height: '100dvh', zIndex: 200,
    transition: 'transform 0.25s ease',
    // Sur desktop (> 768px) : toujours visible
    '@media (min-width: 768px)': { transform: 'translateX(0) !important' }
  },

  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 199, backdropFilter: 'blur(2px)'
  },

  main: {
    flex: 1, display: 'flex',
    flexDirection: 'column', overflow: 'hidden',
    // Sur desktop, laisse de la place pour la sidebar
    marginLeft: 0,
    width: '100%'
  },

  topbar: {
    height: 52, flexShrink: 0,
    background: 'var(--bg-deep)',
    borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px'
  },

  hamburger: {
    background: 'none', border: 'none',
    cursor: 'pointer', padding: 6,
    display: 'flex', flexDirection: 'column',
    gap: 4, flexShrink: 0
  },
  hamburgerLine: {
    display: 'block', width: 20, height: 2,
    background: 'var(--gold)', borderRadius: 1
  },

  topbarTitle: {
    fontWeight: 800, fontSize: 14,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)'
  },
  topbarSub: {
    fontFamily: 'var(--font-mono)', fontSize: 9,
    color: 'var(--text-muted)', marginTop: 1
  },

  liveTag: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'rgba(0,255,136,0.08)',
    border: '1px solid rgba(0,255,136,0.2)',
    borderRadius: 20, padding: '3px 8px',
    fontFamily: 'var(--font-mono)', fontSize: 9,
    color: '#00ff88'
  },
  liveText: { letterSpacing: '0.1em' },
  liveDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: '#00ff88', animation: 'pulse-gold 2s infinite',
    flexShrink: 0
  },

  adminBtn: {
    background: 'rgba(212,168,67,0.1)',
    border: '1px solid var(--border-gold)',
    color: 'var(--gold)', borderRadius: 8,
    padding: '5px 10px', cursor: 'pointer',
    fontFamily: 'var(--font-mono)', fontSize: 13
  },

  logoutBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)', borderRadius: 8,
    padding: '5px 10px', cursor: 'pointer',
    fontSize: 14
  },

  body: {
    flex: 1, overflowY: 'auto',
    padding: '20px 16px',
    width: '100%', maxWidth: 860,
    margin: '0 auto', boxSizing: 'border-box'
  },

  loadingCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-gold)',
    borderRadius: 10, padding: '12px 16px',
    marginBottom: 16
  },
  loadingDots: { display: 'flex', gap: 5 },
  dot: {
    width: 7, height: 7, borderRadius: '50%',
    background: 'var(--gold)',
    animation: 'pulse-gold 1.2s ease-in-out infinite'
  },
  loadingText: {
    fontFamily: 'var(--font-mono)', fontSize: 11,
    color: 'var(--text-secondary)'
  },

  errorCard: {
    background: 'rgba(255,68,102,0.06)',
    border: '1px solid rgba(255,68,102,0.25)',
    borderRadius: 8, padding: '10px 14px',
    fontFamily: 'var(--font-mono)', fontSize: 12,
    color: '#ff8899', marginBottom: 12
  },

  empty: {
    textAlign: 'center', padding: '40px 20px',
    position: 'relative', overflow: 'hidden'
  },
  emptyGrid: {
    position: 'absolute', inset: 0,
    backgroundImage: `
      linear-gradient(rgba(212,168,67,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(212,168,67,0.03) 1px, transparent 1px)
    `,
    backgroundSize: '32px 32px', pointerEvents: 'none'
  },
  emptyIcon: {
    width: 64, height: 64,
    margin: '0 auto 20px', display: 'block'
  },
  emptyTitle: {
    fontFamily: 'var(--font-display)', fontWeight: 800,
    fontSize: 20, color: 'var(--text-primary)',
    marginBottom: 10
  },
  emptySub: {
    color: 'var(--text-muted)', fontSize: 13,
    margin: '0 auto 20px', fontFamily: 'var(--font-mono)'
  },
  emptyExamples: {
    display: 'flex', gap: 8,
    justifyContent: 'center', flexWrap: 'wrap'
  },
  exTag: {
    background: 'var(--gold-glow)',
    border: '1px solid var(--border-gold)',
    color: 'var(--gold)', borderRadius: 20,
    padding: '5px 12px', fontSize: 11,
    cursor: 'pointer', fontFamily: 'var(--font-mono)'
  }
}