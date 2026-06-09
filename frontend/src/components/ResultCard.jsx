import { useState, useRef } from 'react'
import Plot from 'react-plotly.js'
import { useTypewriter } from '../hooks/useTypewriter'

export default function ResultCard({ result, isNew }) {
  const [sqlOpen, setSqlOpen] = useState(false)
  const [copied, setCopied]   = useState(false)
  const { displayed, done }   = useTypewriter(result.sql_generated, 14, isNew && sqlOpen)

  function copySQL() {
    navigator.clipboard.writeText(result.sql_generated)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function exportCSV() {
    if (!result.data?.length) return
    const cols = Object.keys(result.data[0])
    const rows = result.data.map(r => cols.map(c => r[c] ?? '').join(','))
    const csv  = [cols.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'datamind_export.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function exportJSON() {
    const json = JSON.stringify(result.data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'datamind_export.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const cols = result.data?.length ? Object.keys(result.data[0]) : []

  return (
    <div style={{ ...S.card, animation: isNew ? 'fadeUp 0.4s ease' : 'none' }}>

      {/* Question header */}
      <div style={S.qHeader}>
        <span style={S.qIcon}>?</span>
        <span style={S.qText}>{result.question}</span>
        <span style={S.qTime}>{result.execution_time_ms}ms</span>
      </div>

      {/* Réponse naturelle */}
      <div style={S.answer}>
        {result.answer.split('\n').map((line, i) => (
          <p key={i} style={{ margin: '3px 0' }}>
            {line.replace(/\*\*(.*?)\*\*/g, '$1')}
          </p>
        ))}
      </div>

      {/* SQL block */}
      <div style={S.sqlToggle} onClick={() => setSqlOpen(o => !o)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={S.sqlIcon}>{ }</span>
          <span style={S.sqlLabel}>SQL GÉNÉRÉ</span>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
          {sqlOpen ? '▲ MASQUER' : '▼ VOIR'}
        </span>
      </div>

      {sqlOpen && (
        <div style={S.sqlBlock}>
          <pre style={S.sqlPre}>
            {isNew ? displayed : result.sql_generated}
            {isNew && !done && <span style={S.cursor}>█</span>}
          </pre>
          <button style={S.copyBtn} onClick={copySQL}>
            {copied ? '✓ COPIÉ' : '⎘ COPIER'}
          </button>
        </div>
      )}

      {/* Tableau */}
      {result.data?.length > 0 && (
        <div style={S.tableWrap}>
          <div style={S.tableHeader}>
            <span style={S.tableLabel}>
              DONNÉES — {result.data.length} LIGNE{result.data.length > 1 ? 'S' : ''}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={S.exportBtn} onClick={exportCSV}>↓ CSV</button>
              <button style={S.exportBtn} onClick={exportJSON}>↓ JSON</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {cols.map(c => <th key={c} style={S.th}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {result.data.map((row, i) => (
                  <tr key={i} style={i % 2 ? { background: 'rgba(255,255,255,0.02)' } : {}}>
                    {cols.map(c => (
                      <td key={c} style={S.td}>
                        {typeof row[c] === 'number'
                          ? <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>
                              {row[c].toLocaleString('fr-FR')}
                            </span>
                          : String(row[c] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Graphique Plotly */}
      {result.visual && (
        <div style={S.chartWrap}>
          <Plot
            data={result.visual.data}
            layout={{
              ...result.visual.layout,
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#8892a4', family: 'Space Mono' },
              autosize: true,
              margin: { l: 50, r: 20, t: 50, b: 50 },
              xaxis: { gridcolor: 'rgba(255,255,255,0.05)', zerolinecolor: 'rgba(255,255,255,0.1)' },
              yaxis: { gridcolor: 'rgba(255,255,255,0.05)', zerolinecolor: 'rgba(255,255,255,0.1)' },
              colorway: ['#d4a843', '#7c5cbf', '#00d4ff', '#00ff88', '#ff4466']
            }}
            style={{ width: '100%', minHeight: 320 }}
            useResizeHandler
            config={{ displayModeBar: false }}
          />
        </div>
      )}
    </div>
  )
}

const S = {
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    padding: 24, marginBottom: 16,
    boxShadow: 'var(--shadow-card)'
  },
  qHeader: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    marginBottom: 16, paddingBottom: 16,
    borderBottom: '1px solid var(--border)'
  },
  qIcon: {
    width: 24, height: 24, flexShrink: 0,
    background: 'var(--gold-glow)', border: '1px solid var(--border-gold)',
    borderRadius: 6, display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: 'var(--gold)',
    fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
    lineHeight: '24px', textAlign: 'center'
  },
  qText: { flex: 1, fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' },
  qTime: {
    fontFamily: 'var(--font-mono)', fontSize: 10,
    color: 'var(--text-muted)', flexShrink: 0, marginTop: 3
  },
  answer: {
    borderLeft: '2px solid var(--gold)',
    paddingLeft: 16, marginBottom: 16,
    color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7
  },
  sqlToggle: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 12px', background: 'var(--bg-deep)',
    borderRadius: 'var(--radius-md)', cursor: 'pointer',
    border: '1px solid var(--border)', marginBottom: 8,
    transition: 'border-color 0.15s'
  },
  sqlIcon: {
    width: 18, height: 18, background: 'rgba(124,92,191,0.2)',
    border: '1px solid rgba(124,92,191,0.4)',
    borderRadius: 4, display: 'inline-flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 10, color: 'var(--violet-bright)'
  },
  sqlLabel: {
    fontFamily: 'var(--font-mono)', fontSize: 10,
    color: 'var(--text-muted)', letterSpacing: '0.1em'
  },
  sqlBlock: {
    background: 'var(--bg-void)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: 16,
    marginBottom: 16, position: 'relative'
  },
  sqlPre: {
    fontFamily: 'var(--font-mono)', fontSize: 12,
    color: '#00d4ff', lineHeight: 1.6,
    whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0
  },
  cursor: { animation: 'blink 1s step-end infinite', color: 'var(--gold)' },
  copyBtn: {
    position: 'absolute', top: 10, right: 10,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-sm)',
    padding: '3px 10px', fontSize: 10,
    cursor: 'pointer', fontFamily: 'var(--font-mono)',
    letterSpacing: '0.08em'
  },
  tableWrap: { marginBottom: 16 },
  tableHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8
  },
  tableLabel: {
    fontFamily: 'var(--font-mono)', fontSize: 9,
    color: 'var(--text-muted)', letterSpacing: '0.12em'
  },
  exportBtn: {
    background: 'rgba(212,168,67,0.08)',
    border: '1px solid var(--border-gold)',
    color: 'var(--gold)', borderRadius: 'var(--radius-sm)',
    padding: '3px 10px', fontSize: 10, cursor: 'pointer',
    fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
    transition: 'background 0.15s'
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    background: 'var(--bg-deep)',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)', fontSize: 10,
    letterSpacing: '0.08em',
    padding: '8px 14px', textAlign: 'left',
    borderBottom: '1px solid var(--border-gold)'
  },
  td: {
    padding: '8px 14px',
    color: 'var(--text-primary)', fontSize: 13,
    borderBottom: '1px solid var(--border)'
  },
  chartWrap: {
    background: 'var(--bg-deep)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '8px', marginTop: 8
  }
}
