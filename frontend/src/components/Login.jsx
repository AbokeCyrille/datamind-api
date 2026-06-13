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
    <div style={{
      minHeight: '100dvh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #080a0f 0%, #0d1117 50%, #111827 100%)',
      padding: '20px',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Grille de fond */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(212,168,67,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(212,168,67,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)'
      }} />

      {/* Orbe */}
      <div style={{
        position: 'absolute', top: '15%', left: '50%',
        transform: 'translateX(-50%)',
        width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(212,168,67,0.08) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none'
      }} />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--bg-surface)',
        border: '1px solid rgba(212,168,67,0.3)',
        borderRadius: 16,
        padding: '36px 28px',
        width: '100%', maxWidth: 400,
        boxShadow: '0 0 40px rgba(212,168,67,0.08), 0 20px 60px rgba(0,0,0,0.5)'
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(0,255,136,0.08)',
          border: '1px solid rgba(0,255,136,0.2)',
          borderRadius: 20, padding: '3px 10px',
          fontSize: 10, color: '#00ff88',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.1em', marginBottom: 24
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#00ff88',
            animation: 'pulse-gold 2s infinite'
          }} />
          SYSTÈME ACTIF
        </div>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(212,168,67,0.1)',
            border: '1px solid rgba(212,168,67,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg width="22" height="22" viewBox="0 0 36 36" fill="none">
              <path d="M8 18 L14 10 L22 26 L28 18"
                stroke="#d4a843" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: 22, color: 'var(--text-primary)',
              letterSpacing: '-0.02em'
            }}>DataMind</div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--gold)', letterSpacing: '0.08em'
            }}>Text-to-SQL Enterprise</div>
          </div>
        </div>

        <div style={{
          height: 1, background: 'var(--border)',
          margin: '0 0 20px'
        }} />

        <p style={{
          color: 'var(--text-secondary)', fontSize: 13,
          marginBottom: 28, fontFamily: 'var(--font-mono)'
        }}>
          Accès sécurisé à votre plateforme analytique
        </p>

        <form onSubmit={handleSubmit}>
          {/* Identifiant */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '0.12em', color: 'var(--text-muted)',
              marginBottom: 8
            }}>IDENTIFIANT</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              style={{
                width: '100%', padding: '11px 14px',
                background: 'var(--bg-deep)',
                border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)', fontSize: 14,
                outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Mot de passe */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '0.12em', color: 'var(--text-muted)',
              marginBottom: 8
            }}>MOT DE PASSE</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '11px 14px',
                background: 'var(--bg-deep)',
                border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)', fontSize: 14,
                outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(255,68,102,0.08)',
              border: '1px solid rgba(255,68,102,0.3)',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: '#ff8899',
              fontFamily: 'var(--font-mono)', marginBottom: 16
            }}>
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px',
              background: loading
                ? 'rgba(212,168,67,0.5)'
                : 'linear-gradient(135deg, #d4a843, #f0c060)',
              color: '#080a0f', border: 'none',
              borderRadius: 8,
              fontFamily: 'var(--font-mono)', fontSize: 12,
              fontWeight: 700, letterSpacing: '0.08em',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: 12, height: 12,
                  border: '2px solid rgba(8,10,15,0.3)',
                  borderTopColor: '#080a0f',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                  display: 'inline-block'
                }} />
                AUTHENTIFICATION...
              </>
            ) : 'ACCÉDER À LA PLATEFORME →'}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          marginTop: 24, paddingTop: 16,
          borderTop: '1px solid var(--border)',
          textAlign: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--text-muted)'
        }}>
          Propulsé par{' '}
          <span style={{ color: 'var(--gold)', fontWeight: 700 }}>Claude AI</span>
          {' × '}
          <span style={{ color: 'var(--text-secondary)' }}>Oramiz</span>
        </div>
      </div>
    </div>
  )
}