export default function Sidebar({ history, onSelect, activeIndex, onClear }) {
  return (
    <aside style={S.sidebar}>
      {/* Header sidebar */}
      <div style={S.sideHeader}>
        <div style={S.sideLogoRow}>
          <svg width="22" height="22" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="8" fill="rgba(212,168,67,0.12)" stroke="rgba(212,168,67,0.3)" strokeWidth="1"/>
            <path d="M8 18 L14 10 L22 26 L28 18" stroke="#d4a843" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <span style={S.sideTitle}>DataMind</span>
        </div>
        <div style={S.sideVersion}>v1.0 · ENTERPRISE</div>
      </div>

      <div style={S.divider} />

      {/* Historique */}
      <div style={S.section}>
        <div style={S.sectionLabel}>HISTORIQUE</div>
        <div style={S.histList}>
          {history.length === 0 && (
            <div style={S.emptyHist}>Aucune question posée</div>
          )}
          {history.map((item, i) => (
            <div
              key={i}
              style={{
                ...S.histItem,
                ...(activeIndex === i ? S.histItemActive : {})
              }}
              onClick={() => onSelect(i)}
            >
              <div style={S.histIcon}>
                {activeIndex === i ? '▶' : '○'}
              </div>
              <div style={S.histText}>
                <div style={S.histQ}>{item.question}</div>
                <div style={S.histMeta}>
                  {item.execution_time_ms}ms · {item.data?.length ?? 0} lignes
                </div>
              </div>
            </div>
          ))}
        </div>
        {history.length > 0 && (
          <button style={S.clearBtn} onClick={onClear}>
            Effacer l'historique
          </button>
        )}
      </div>

      <div style={S.divider} />

      {/* Status système */}
      <div style={S.section}>
        <div style={S.sectionLabel}>SYSTÈME</div>
        <div style={S.statusRow}>
          <span style={S.statusDot('#00ff88')} />
          <span style={S.statusText}>API FastAPI</span>
        </div>
        <div style={S.statusRow}>
          <span style={S.statusDot('#00ff88')} />
          <span style={S.statusText}>Claude AI</span>
        </div>
        <div style={S.statusRow}>
          <span style={S.statusDot('#00ff88')} />
          <span style={S.statusText}>Base de données</span>
        </div>
      </div>

      {/* Footer */}
      <div style={S.sideFooter}>
        <div style={{ color: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
          PROPULSÉ PAR
        </div>
        <div style={{ color: 'var(--gold)', fontSize: 11, fontWeight: 700, marginTop: 2 }}>
          ORAMIZ © 2025
        </div>
      </div>
    </aside>
  )
}

const S = {
  sidebar: {
    width: 240, minWidth: 240, height: '100vh',
    background: 'var(--bg-deep)',
    borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
    position: 'sticky', top: 0, overflow: 'hidden'
  },
  sideHeader: { padding: '20px 16px 16px' },
  sideLogoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 },
  sideTitle: {
    fontFamily: 'var(--font-display)', fontWeight: 800,
    fontSize: 16, color: 'var(--text-primary)'
  },
  sideVersion: {
    fontFamily: 'var(--font-mono)', fontSize: 9,
    color: 'var(--gold)', letterSpacing: '0.12em', marginLeft: 32
  },
  divider: { height: 1, background: 'var(--border)', margin: '0 16px' },
  section: { padding: '16px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  sectionLabel: {
    fontFamily: 'var(--font-mono)', fontSize: 9,
    color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 10
  },
  histList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 },
  emptyHist: {
    color: 'var(--text-muted)', fontSize: 12,
    fontFamily: 'var(--font-mono)', padding: '8px 0', fontStyle: 'italic'
  },
  histItem: {
    display: 'flex', gap: 8, padding: '8px 10px',
    borderRadius: 'var(--radius-md)', cursor: 'pointer',
    border: '1px solid transparent', transition: 'all 0.15s',
    alignItems: 'flex-start'
  },
  histItemActive: {
    background: 'var(--gold-glow)',
    border: '1px solid var(--border-gold)'
  },
  histIcon: {
    color: 'var(--gold)', fontSize: 10, marginTop: 2, flexShrink: 0,
    fontFamily: 'var(--font-mono)'
  },
  histText: { minWidth: 0 },
  histQ: {
    fontSize: 12, color: 'var(--text-primary)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    fontWeight: 600
  },
  histMeta: {
    fontFamily: 'var(--font-mono)', fontSize: 10,
    color: 'var(--text-muted)', marginTop: 2
  },
  clearBtn: {
    marginTop: 10, background: 'none',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)',
    padding: '5px 10px', fontSize: 11, cursor: 'pointer',
    fontFamily: 'var(--font-mono)', width: '100%',
    transition: 'all 0.15s'
  },
  statusRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    marginBottom: 8
  },
  statusDot: (color) => ({
    width: 7, height: 7, borderRadius: '50%',
    background: color, flexShrink: 0,
    boxShadow: `0 0 6px ${color}`
  }),
  statusText: {
    fontFamily: 'var(--font-mono)', fontSize: 11,
    color: 'var(--text-secondary)'
  },
  sideFooter: {
    padding: '16px', borderTop: '1px solid var(--border)',
    marginTop: 'auto'
  }
}
