import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { getAllUsers, getUserStats } from '../../lib/db.js'

const POS_CLASS = ['gold', 'silver', 'bronze']

const PAGE_SIZE = 10

export default function RankingPage() {
  const { user, supabaseConfigured, matches } = useApp()
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)

  const syncedCount = matches.filter(m => m.status === 'synced').length

  useEffect(() => {
    async function loadRanking() {
      if (supabaseConfigured) {
        const { supabase } = await import('../../lib/supabase.js')
        const { data } = await supabase.rpc('get_ranking')
        const rows = (data ?? []).map(r => ({
          id:     r.user_id,
          name:   r.name,
          avatar: r.avatar_url ?? null,
          exact:  Number(r.exact),
          winner: Number(r.winner),
          pts:    Number(r.pts),
        }))
        setRanking(rows)
      } else {
        const users = getAllUsers()
        const rows = users.map(u => {
          const s = getUserStats(u.id)
          return { id: u.id, name: u.name, avatar: u.avatar, exact: s.exact ?? 0, winner: s.winner ?? 0, pts: s.pts }
        }).sort((a, b) => b.pts - a.pts)
        setRanking(rows)
      }
      setLoading(false)
    }
    loadRanking()
  }, [supabaseConfigured, syncedCount])

  const totalPages = Math.ceil(ranking.length / PAGE_SIZE)
  const pageRows   = ranking.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const myPos      = ranking.findIndex(r => r.id === user?.id)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Ranking <span>General</span></div>
          <div className="page-sub">Top clientes del torneo</div>
        </div>
      </div>

      {loading && <RankingSkeleton />}

      {!loading && ranking.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
          Todavía no hay resultados para mostrar.
        </div>
      )}

      {pageRows.map((r, i) => {
        const globalIdx = page * PAGE_SIZE + i
        const isMe = r.id === user?.id
        return (
          <div
            key={r.id}
            className="ranking-row"
            style={isMe ? { border: '1px solid rgba(182,59,40,.35)', background: 'rgba(182,59,40,.04)' } : {}}
          >
            <div className={`rank-pos ${POS_CLASS[globalIdx] || ''}`}>{globalIdx + 1}</div>
            <div className="rank-avatar" style={{ background: '#1e3a8a', overflow: 'hidden' }}>
              {r.avatar
                ? <img src={r.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : r.name?.[0]?.toUpperCase() ?? '?'
              }
            </div>
            <div className="rank-info">
              <div className="rank-name">
                {r.name}{globalIdx === 0 ? ' 👑' : ''}{isMe ? ' (vos)' : ''}
              </div>
              <div className="rank-detail">{r.exact} exacto{r.exact !== 1 ? 's' : ''} · {r.winner} ganador{r.winner !== 1 ? 'es' : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', marginRight: 12 }}>
              {r.exact > 0  && <span className="result-badge rb-exact">{r.exact}×🎯</span>}
              {r.winner > 0 && <span className="result-badge rb-winner">{r.winner}×✓</span>}
            </div>
            <div className="rank-pts">{r.pts}</div>
          </div>
        )
      })}

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, gap: 8 }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              padding: '7px 16px', borderRadius: 6, fontSize: 13, cursor: page === 0 ? 'default' : 'pointer',
              background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text2)',
              opacity: page === 0 ? 0.4 : 1,
            }}
          >← Anterior</button>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            {page + 1} / {totalPages}
            {myPos >= 0 && <span style={{ marginLeft: 8, color: 'var(--color-secondary)' }}>· Tu posición: #{myPos + 1}</span>}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            style={{
              padding: '7px 16px', borderRadius: 6, fontSize: 13, cursor: page === totalPages - 1 ? 'default' : 'pointer',
              background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text2)',
              opacity: page === totalPages - 1 ? 0.4 : 1,
            }}
          >Siguiente →</button>
        </div>
      )}
    </div>
  )
}

const SKEL_W = [68, 52, 80, 61, 74, 55, 70, 63]

function RankingSkeleton() {
  return (
    <>
      {SKEL_W.map((w, i) => (
        <div key={i} className="ranking-row">
          <div className="skel" style={{ width: 22, height: 20, flexShrink: 0 }} />
          <div className="skel skel-circle" style={{ width: 32, height: 32, flexShrink: 0 }} />
          <div className="rank-info">
            <div className="skel" style={{ height: 13, width: `${w}%`, marginBottom: 5 }} />
            <div className="skel" style={{ height: 10, width: '38%' }} />
          </div>
          <div className="skel" style={{ width: 28, height: 22, flexShrink: 0 }} />
        </div>
      ))}
    </>
  )
}
