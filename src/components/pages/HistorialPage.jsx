import { useState } from 'react'
import { BarChart2, Target, Check, X } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'

const BADGES = {
  exact:  { cls: 'rb-exact',  label: 'Exacto',  Icon: Target },
  winner: { cls: 'rb-winner', label: 'Ganador',  Icon: Check },
  miss:   { cls: 'rb-miss',   label: 'Falló',    Icon: X },
}

const PAGE_SIZE = 10

export default function HistorialPage() {
  const { history, stats } = useApp()
  const [page, setPage] = useState(1)

  const sorted  = [...history].reverse()
  const visible = sorted.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < sorted.length

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Mi <span>Historial</span></div>
          <div className="page-sub">Predicciones en partidos jugados</div>
        </div>
      </div>

      <div className="hist-stats">
        <div className="hs-box"><div className="hs-num exact">{stats.exact}</div><div className="hs-lbl">Exactos (+10 pts)</div></div>
        <div className="hs-box"><div className="hs-num winner">{stats.winner}</div><div className="hs-lbl">Ganador (+5 pts)</div></div>
        <div className="hs-box"><div className="hs-num miss">{history.filter(h => h.result === 'miss').length}</div><div className="hs-lbl">Errores</div></div>
        <div className="hs-box"><div className="hs-num pts">{stats.pts}</div><div className="hs-lbl">Puntos total</div></div>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><BarChart2 size={40} strokeWidth={1} /></div>
          <div className="empty-state-text">Todavía no hay partidos jugados.<br/>¡El torneo arranca pronto!</div>
        </div>
      ) : (
        <>
          {visible.map(m => {
            const badge = BADGES[m.result] || BADGES.miss
            return (
              <div className="match-card" key={m.matchId}>
                <div className="match-head">
                  <span className="match-round">{m.round}</span>
                  <span className={`result-badge ${badge.cls}`} style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                    <badge.Icon size={11} strokeWidth={2} />{badge.label}
                  </span>
                </div>
                <div className="match-body">
                  <div className="team">
                    <span className="team-flag">{m.f1}</span>
                    <span className="team-name">{m.t1}</span>
                  </div>
                  <div className="match-center" style={{ gap: 5 }}>
                    <div className="score-display" style={{ fontSize: 26 }}>{m.real.h} – {m.real.a}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>resultado real</div>
                    <div style={{ fontSize: 13, color: m.result === 'miss' ? 'var(--text3)' : 'var(--gold)', fontWeight: 600 }}>
                      tu pred: {m.pred.h}–{m.pred.a}
                    </div>
                  </div>
                  <div className="team">
                    <span className="team-flag">{m.f2}</span>
                    <span className="team-name">{m.t2}</span>
                  </div>
                </div>
              </div>
            )
          })}

          {hasMore && (
            <button
              onClick={() => setPage(p => p + 1)}
              style={{
                display:'block', width:'100%', marginTop:12,
                padding:'10px 0', borderRadius:'var(--radius)',
                border:'1px solid var(--border)', background:'var(--card)',
                color:'var(--text2)', fontSize:13, fontWeight:500, cursor:'pointer',
              }}
            >
              Mostrar más ({sorted.length - visible.length} restantes)
            </button>
          )}

          <div style={{ textAlign:'center', fontSize:12, color:'var(--text3)', marginTop:12 }}>
            {visible.length} de {sorted.length} partidos
          </div>
        </>
      )}
    </div>
  )
}
