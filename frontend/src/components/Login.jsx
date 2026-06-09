import { useState } from 'react'
import { login } from '../api/client'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await login(username, password)
      localStorage.setItem('dm_token', res.data.access_token)
      onLogin()
    } catch {
      setError('Identifiants invalides')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.page}>
      {/* Grid de fond */}
      <div style={S.grid} />
      {/* Orbe lumineux */}
      <div style={S.orb} />

      <div style={S.card}>
        {/* Badge */}
        <div style={S.badge}>
          <span style={S.badgeDot} />
          SYSTÈME ACTIF
        </div>

        {/* Logo */}
        <div style={S.logoRow}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="8" fill="rgba(212,168,67,0.12)" stroke="rgba(212,168,67,0.4)" strokeWidth="1"/>
            <path d="M8 18 L14 10 L22 26 L28 18" stroke="#d4a843" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <circle cx="8" cy="18" r="2" fill="#d4a843"/>
            <circle cx="28" cy="18" r="2" fill="#d4a843"/>
          </svg>
          <div>
            <div style={S.logoTitle}>DataMind</div>
            <div style={S.logoSub}>Text-to-SQL Enterprise</div>
          </div>
        </div>

        <div style={S.divider} />

        <p style={S.welcome}>Accès sécurisé à votre plateforme analytique</p>

        <form onSubmit={handleSubmit}>
          <div style={S.field}>
            <label style={S.label}>IDENTIFIANT</label>
            <input
              style={S.input}
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div style={S.field}>
            <label style={S.label}>MOT DE PASSE</label>
            <input
              style={S.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div style={S.error}>
              <span style={{ color: '#ff4466' }}>⚠</span> {error}
            </div>
          )}

          <button style={{ ...S.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading
              ? <><Spinner /> AUTHENTIFICATION...</>
              : <>ACCÉDER À LA PLATEFORME →</>
            }
          </button>
        </form>

        <div style={S.footer}>
          <span style={{ color: 'var(--text-muted)' }}>Propulsé par</span>
          <span style={{ color: 'var(--gold)', marginLeft: 6, fontWeight: 700 }}>Claude AI</span>
          <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>×</span>
          <span style={{ color: 'var(--text-secondary)' }}>Oramiz</span>
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 12, height: 12,
      border: '2px solid rgba(212,168,67,0.3)',
      borderTopColor: '#d4a843', borderRadius: '50%',
      animation: 'spin 0.7s linear infinite', marginRight: 8
    }}/>
  )
}

const S = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'var(--bg-void)',
    position: 'relative', overflow: 'hidden'
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: `
      linear-gradient(rgba(212,168,67,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(212,168,67,0.04) 1px, transparent 1px)
    `,
    backgroundSize: '48px 48px',
    maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)'
  },
  orb: {
    position: 'absolute', top: '20%', left: '50%',
    transform: 'translateX(-50%)',
    width: 400, height: 400, borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(212,168,67,0.08) 0%, transparent 70%)',
    filter: 'blur(40px)', pointerEvents: 'none'
  },
  card: {
    position: 'relative', zIndex: 1,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-gold)',
    borderRadius: '12px',
    padding: '40px 36px', width: '100%', maxWidth: 420,
    boxShadow: 'var(--shadow-gold), var(--shadow-deep)',
    animation: 'fadeUp 0.5s ease'
  },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)',
    borderRadius: '12px', padding: '3px 10px', fontSize: 10,
    color: '#00ff88', fontFamily: 'var(--font-mono)',
    letterSpacing: '0.1em', marginBottom: 24
  },
  badgeDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: '#00ff88', animation: 'pulse-gold 2s infinite'
  },
  logoRow: {
    display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20
  },
  logoTitle: {
    fontFamily: 'var(--font-display)', fontWeight: 800,
    fontSize: 22, color: 'var(--text-primary)', letterSpacing: '-0.02em'
  },
  logoSub: {
    fontFamily: 'var(--font-mono)', fontSize: 10,
    color: 'var(--gold)', letterSpacing: '0.08em', marginTop: 2
  },
  divider: {
    height: 1, background: 'var(--border)',
    margin: '0 0 20px 0'
  },
  welcome: {
    color: 'var(--text-secondary)', fontSize: 13,
    marginBottom: 28, fontFamily: 'var(--font-mono)'
  },
  field: { marginBottom: 18 },
  label: {
    display: 'block', fontFamily: 'var(--font-mono)',
    fontSize: 10, letterSpacing: '0.12em',
    color: 'var(--text-muted)', marginBottom: 8
  },
  input: {
    width: '100%', padding: '11px 14px',
    background: 'var(--bg-deep)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)', fontSize: 14,
    outline: 'none', transition: 'border-color 0.2s',
    boxSizing: 'border-box'
  },
  error: {
    background: 'rgba(255,68,102,0.08)',
    border: '1px solid rgba(255,68,102,0.3)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px', fontSize: 13,
    color: '#ff8899', marginBottom: 16,
    fontFamily: 'var(--font-mono)'
  },
  btn: {
    width: '100%', padding: '13px',
    background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-bright) 100%)',
    color: '#080a0f', border: 'none',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-mono)', fontSize: 12,
    fontWeight: 700, letterSpacing: '0.08em',
    cursor: 'pointer', marginTop: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'filter 0.2s'
  },
  footer: {
    marginTop: 28, paddingTop: 20,
    borderTop: '1px solid var(--border)',
    textAlign: 'center',
    fontFamily: 'var(--font-mono)', fontSize: 11
  }
}
