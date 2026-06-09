import { useState } from 'react'

const SUGGESTIONS = [
  'Quelles sont les ventes totales par région en janvier ?',
  'Quel vendeur a réalisé le plus de ventes ce trimestre ?',
  'Compare les performances Nord vs Sud sur 3 mois',
  'Montre moi le top 5 des clients par chiffre d\'affaires',
  'Quelle est l\'évolution mensuelle des ventes cette année ?',
]

export default function ChatInput({ onSubmit, loading }) {
  const [question, setQuestion]       = useState('')
  const [withVisual, setWithVisual]   = useState(true)
  const [showSugg, setShowSugg]       = useState(false)

  function submit() {
    if (!question.trim() || loading) return
    onSubmit(question.trim(), withVisual)
    setQuestion('')
    setShowSugg(false)
  }

  function pickSuggestion(s) {
    setQuestion(s)
    setShowSugg(false)
  }

  return (
    <div style={S.wrap}>
      {/* Suggestions dropdown */}
      {showSugg && (
        <div style={S.sugg}>
          <div style={S.suggLabel}>SUGGESTIONS</div>
          {SUGGESTIONS.map((s, i) => (
            <div key={i} style={S.suggItem} onClick={() => pickSuggestion(s)}>
              <span style={{ color: 'var(--gold)', marginRight: 10 }}>→</span>
              {s}
            </div>
          ))}
        </div>
      )}

      {/* Input principal */}
      <div style={S.inputRow}>
        <div style={S.inputWrap}>
          {/* Prompt marker Bloomberg style */}
          <span style={S.prompt}>&gt;_</span>
          <textarea
            style={S.textarea}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
            onFocus={() => setShowSugg(true)}
            onBlur={() => setTimeout(() => setShowSugg(false), 150)}
            placeholder="Posez votre question en français..."
            rows={2}
            disabled={loading}
          />
        </div>
        <button
          style={{ ...S.sendBtn, opacity: (!question.trim() || loading) ? 0.5 : 1 }}
          onClick={submit}
          disabled={!question.trim() || loading}
        >
          {loading
            ? <span style={S.spinnerSmall} />
            : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          }
        </button>
      </div>

      {/* Options barre */}
      <div style={S.optBar}>
        <label style={S.toggle}>
          <div
            style={{ ...S.toggleTrack, background: withVisual ? 'var(--gold)' : 'var(--bg-hover)' }}
            onClick={() => setWithVisual(v => !v)}
          >
            <div style={{ ...S.toggleThumb, transform: withVisual ? 'translateX(14px)' : 'translateX(2px)' }} />
          </div>
          <span style={S.toggleLabel}>Générer un graphique</span>
        </label>
        <span style={S.hint}>Entrée pour envoyer · Shift+Entrée nouvelle ligne</span>
      </div>
    </div>
  )
}

const S = {
  wrap: { position: 'relative', marginBottom: 24 },
  sugg: {
    position: 'absolute', bottom: '100%', left: 0, right: 0,
    background: 'var(--bg-elevated)', border: '1px solid var(--border-gold)',
    borderRadius: 'var(--radius-lg)', padding: 12,
    marginBottom: 8, zIndex: 100, boxShadow: 'var(--shadow-deep)'
  },
  suggLabel: {
    fontFamily: 'var(--font-mono)', fontSize: 9,
    color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 8
  },
  suggItem: {
    padding: '8px 12px', borderRadius: 'var(--radius-sm)',
    fontSize: 13, color: 'var(--text-secondary)',
    cursor: 'pointer', transition: 'all 0.1s',
    fontFamily: 'var(--font-mono)',
    ':hover': { background: 'var(--bg-hover)', color: 'var(--text-primary)' }
  },
  inputRow: {
    display: 'flex', gap: 10, alignItems: 'flex-end',
    background: 'var(--bg-surface)', border: '1px solid var(--border-gold)',
    borderRadius: 'var(--radius-lg)', padding: '12px 14px',
    boxShadow: 'var(--shadow-gold)'
  },
  inputWrap: { flex: 1, display: 'flex', gap: 10, alignItems: 'flex-start' },
  prompt: {
    fontFamily: 'var(--font-mono)', fontSize: 16,
    color: 'var(--gold)', userSelect: 'none', marginTop: 4, flexShrink: 0
  },
  textarea: {
    flex: 1, background: 'transparent', border: 'none',
    color: 'var(--text-primary)', fontFamily: 'var(--font-display)',
    fontSize: 15, outline: 'none', resize: 'none', lineHeight: 1.5
  },
  sendBtn: {
    width: 44, height: 44, flexShrink: 0,
    background: 'linear-gradient(135deg, var(--gold), var(--gold-bright))',
    border: 'none', borderRadius: 'var(--radius-md)',
    color: '#080a0f', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    transition: 'filter 0.2s, opacity 0.2s'
  },
  spinnerSmall: {
    display: 'inline-block', width: 18, height: 18,
    border: '2px solid rgba(8,10,15,0.3)',
    borderTopColor: '#080a0f', borderRadius: '50%',
    animation: 'spin 0.7s linear infinite'
  },
  optBar: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '8px 4px 0'
  },
  toggle: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
  toggleTrack: {
    width: 32, height: 18, borderRadius: 9,
    position: 'relative', transition: 'background 0.2s'
  },
  toggleThumb: {
    position: 'absolute', top: 2, width: 14, height: 14,
    background: '#080a0f', borderRadius: '50%', transition: 'transform 0.2s'
  },
  toggleLabel: {
    fontFamily: 'var(--font-mono)', fontSize: 11,
    color: 'var(--text-secondary)'
  },
  hint: {
    fontFamily: 'var(--font-mono)', fontSize: 10,
    color: 'var(--text-muted)'
  }
}
