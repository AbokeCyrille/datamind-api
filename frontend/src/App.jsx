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
    setSidebarOpen(false)
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
    <div style={{
      display: 'flex', height: '100dvh',
      overflow: 'hidden', background: 'var(--bg-void)'
    }}>

      {/* ── OVERLAY MOBILE ── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 99
          }}
        />
      )}

      {/* ── SIDEBAR ── */}
      <div style={{
        width: 240, flexShrink: 0,
        ...(isMobile ? {
          position: 'fixed', top: 0, left: 0,
          height: '100dvh', zIndex: 100,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease'
        } : {
          position: 'relative',
          height: '100dvh'
        })
      }}>
        <Sidebar
          history={history}
          activeIndex={active}
          onSelect={i => { setActive(i); setSidebarOpen(false) }}
          onClear={() => { setHistory([]); setActive(null) }}
        />
      </div>

      {/* ── MAIN ── */}
      <div style={{
        flex: 1, display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0
      }}>

        {/* Topbar */}
        <header style={{
          height: 52, flexShrink: 0,
          background: 'var(--bg-deep)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px', gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Hamburger — mobile seulement */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(s => !s)}
                style={{
                  background: 'none', border: 'none',
                  cursor: 'pointer', padding: 4,
                  display: 'flex', flexDirection: 'column', gap: 4
                }}
              >
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    display: 'block', width: 20, height: 2,
                    background: 'var(--gold)', borderRadius: 1
                  }} />
                ))}
              </button>
            )}
            <div>
              <div style={{
                fontWeight: 800, fontSize: 15,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-display)'
              }}>
                {showAdmin ? 'Administration' : (isMobile ? 'DataMind' : 'Analyse de données')}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 9,
                color: 'var(--text-muted)', marginTop: 1
              }}>
                {showAdmin
                  ? 'Console Oramiz'
                  : `${history.length} requête${history.length !== 1 ? 's' : ''} · Session active`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Badge LIVE */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(0,255,136,0.08)',
              border: '1px solid rgba(0,255,136,0.2)',
              borderRadius: 20, padding: '3px 10px',
              fontFamily: 'var(--font-mono)', fontSize: 9,
              color: '#00ff88', letterSpacing: '0.1em'
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#00ff88',
                animation: 'pulse-gold 2s infinite'
              }} />
              {!isMobile && 'LIVE'}
            </div>

            {/* Bouton Admin — icône SVG */}
            {localStorage.getItem('dm_role') === 'admin' && (
              <button
                onClick={() => setShowAdmin(s => !s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: showAdmin ? 'rgba(212,168,67,0.2)' : 'rgba(212,168,67,0.08)',
                  border: '1px solid var(--border-gold)',
                  color: 'var(--gold)', borderRadius: 8,
                  padding: '5px 12px', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: 11
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                {showAdmin ? 'Retour' : 'Admin'}
              </button>
            )}

            {/* Déconnexion */}
            <button
              onClick={logout}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)', borderRadius: 8,
                padding: '5px 12px', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 11
              }}
            >
              {isMobile ? '⏻' : 'Déconnexion'}
            </button>
          </div>
        </header>

        {/* Corps scrollable */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: isMobile ? '16px 12px' : '24px 32px',
          maxWidth: 900, width: '100%',
          margin: '0 auto', boxSizing: 'border-box'
        }}>
          {showAdmin ? (
            <AdminDashboard />
          ) : (
            <>
              <div ref={topRef} />
              <ChatInput onSubmit={handleQuery} loading={loading} />

              {loading && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-gold)',
                  borderRadius: 10, padding: '12px 16px', marginBottom: 16
                }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: 'var(--gold)',
                        animation: 'pulse-gold 1.2s ease-in-out infinite',
                        animationDelay: `${i * 0.15}s`
                      }} />
                    ))}
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: 'var(--text-secondary)'
                  }}>
                    <span style={{ color: 'var(--gold)' }}>DataMind</span>
                    {' '}analyse votre question...
                  </span>
                </div>
              )}

              {error && (
                <div style={{
                  background: 'rgba(255,68,102,0.06)',
                  border: '1px solid rgba(255,68,102,0.25)',
                  borderRadius: 8, padding: '10px 14px',
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  color: '#ff8899', marginBottom: 12
                }}>
                  ⚠ {error}
                </div>
              )}

              {!loading && history.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: isMobile ? '40px 16px' : '60px 40px',
                  position: 'relative', overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `
                      linear-gradient(rgba(212,168,67,0.03) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(212,168,67,0.03) 1px, transparent 1px)
                    `,
                    backgroundSize: '32px 32px', pointerEvents: 'none'
                  }} />
                  <svg style={{ width: 64, height: 64, margin: '0 auto 20px', display: 'block' }}
                    viewBox="0 0 80 80" fill="none">
                    <rect x="1" y="1" width="78" height="78" rx="16"
                      stroke="rgba(212,168,67,0.3)" strokeWidth="1" />
                    <path d="M20 40 L30 28 L45 52 L55 40"
                      stroke="#d4a843" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <circle cx="20" cy="40" r="3" fill="#d4a843" />
                    <circle cx="55" cy="40" r="3" fill="#d4a843" />
                  </svg>
                  <h2 style={{
                    fontFamily: 'var(--font-display)', fontWeight: 800,
                    fontSize: isMobile ? 18 : 22,
                    color: 'var(--text-primary)', marginBottom: 10
                  }}>
                    Prêt pour l'analyse
                  </h2>
                  <p style={{
                    color: 'var(--text-muted)', fontSize: 13,
                    margin: '0 auto 24px', fontFamily: 'var(--font-mono)',
                    maxWidth: 400
                  }}>
                    Posez une question en français — DataMind génère le SQL
                    et présente les résultats.
                  </p>
                  <div style={{
                    display: 'flex', gap: 8,
                    justifyContent: 'center', flexWrap: 'wrap'
                  }}>
                    {[
                      'Ventes par région en janvier',
                      'Top 5 vendeurs',
                      'Évolution mensuelle',
                    ].map((ex, i) => (
                      <div key={i}
                        onClick={() => handleQuery(ex, true)}
                        style={{
                          background: 'var(--gold-glow)',
                          border: '1px solid var(--border-gold)',
                          color: 'var(--gold)', borderRadius: 20,
                          padding: '6px 14px', fontSize: 12,
                          cursor: 'pointer', fontFamily: 'var(--font-mono)'
                        }}
                      >
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