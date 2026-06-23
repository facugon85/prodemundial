import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, LayoutGrid, GitBranch, LockOpen, Timer, CheckCircle, Ticket } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { getAllPrizes, getAllUsers, getUserStats } from '../../lib/db.js'
import ConfirmDialog from '../common/ConfirmDialog.jsx'
import { FIXTURE } from '../../data/fixture.js'

function useConfirm() {
  const [dialog, setDialog] = useState(null)

  const confirm = useCallback((title, body, options = {}) => {
    return new Promise(resolve => {
      setDialog({
        title, body,
        confirmLabel: options.confirmLabel ?? 'Confirmar',
        danger: options.danger ?? false,
        onConfirm: () => { setDialog(null); resolve(true) },
        onCancel:  () => { setDialog(null); resolve(false) },
      })
    })
  }, [])

  const ConfirmNode = dialog ? <ConfirmDialog {...dialog} /> : null
  return { confirm, ConfirmNode }
}

const forceArgAdmin = import.meta.env.DEV &&
  new URLSearchParams(window.location.search).has('arg')

function argPlayingToday() {
  if (forceArgAdmin) return true
  const now = new Date()
  return FIXTURE.some(m => {
    if (m.t1 !== 'Argentina' && m.t2 !== 'Argentina') return false
    const [day, mon] = (m.date ?? '').trim().split(' ')
    const mnum = { 'Ene':0,'Feb':1,'Mar':2,'Abr':3,'May':4,'Jun':5,'Jul':6,'Ago':7,'Sep':8,'Oct':9,'Nov':10,'Dic':11 }[mon]
    if (mnum === undefined) return false
    const d = new Date(2026, mnum, parseInt(day, 10))
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() &&
           d.getDate() === now.getDate()
  })
}

function useClock() {
  const fmtTime = () => new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
  const fmtDate = () => new Date().toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })
  const [time, setTime] = useState(fmtTime)
  const [date, setDate] = useState(fmtDate)
  useEffect(() => {
    const id = setInterval(() => { setTime(fmtTime()); setDate(fmtDate()) }, 1000)
    return () => clearInterval(id)
  }, [])
  return { time, date }
}

export default function AdminPage() {
  const { user } = useApp()
  const [tab, setTab] = useState('sync')
  const { time: clock, date: clockDate } = useClock()
  const argToday = argPlayingToday()

  if (!user?.isAdmin) {
    return (
      <div className="page">
        <div className="empty-state"><div className="empty-state-text">Acceso restringido.</div></div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Panel <span>Admin</span></div>
          <div className="page-sub">Sincronización automática · Validación de premios</div>
        </div>
        <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
          {argToday && (
            <div className="arg-ribbon-header">
              <div className="arg-ribbon">
                <img src="/sol-de-mayo.svg" width="18" height="18" alt="" />
              </div>
            </div>
          )}
          <div style={{ fontFamily:"'Bebas Neue', monospace", color:'var(--text1)', letterSpacing:2, lineHeight:1, userSelect:'none', textAlign:'right' }}>
            <div style={{ fontSize:28 }}>{clock}</div>
            <div style={{ fontSize:13, letterSpacing:1, color:'var(--text2)', textTransform:'uppercase' }}>{clockDate}</div>
          </div>
        </div>
      </div>
      <div className="admin-tabs">
        {[['sync', RefreshCw, 'Resultados'],['llave', LayoutGrid, 'Fase de grupos'],['bracket', GitBranch, 'Fase de llaves'],['premios', Ticket, 'Premios']].map(([id, Icon, label]) => (
          <button key={id} className={`atab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
            <Icon size={13} strokeWidth={1.5} style={{ verticalAlign:'middle', marginRight:5 }} />{label}
          </button>
        ))}
      </div>
      <div hidden={tab !== 'sync'}><SyncTab /></div>
      <div hidden={tab !== 'llave'}><LlaveTab /></div>
      <div hidden={tab !== 'bracket'}><BracketTab /></div>
      <div hidden={tab !== 'premios'}><PremiosTab /></div>

    </div>
  )
}

// ── Resultados ────────────────────────────────────────────────

const MONTH_NUM_ADMIN = {
  'Ene':1,'Feb':2,'Mar':3,'Abr':4,'May':5,'Jun':6,
  'Jul':7,'Ago':8,'Sep':9,'Oct':10,'Nov':11,'Dic':12,
}
function adminDateKey(str) {
  const [day, mon] = str.trim().split(' ')
  return (MONTH_NUM_ADMIN[mon] ?? 0) * 100 + parseInt(day, 10)
}
function groupByDate(list) {
  const map = {}
  for (const m of list) (map[m.date] ??= []).push(m)
  return Object.entries(map)
    .sort(([a], [b]) => adminDateKey(a) - adminDateKey(b))
    .map(([date, ms]) => [date, ms.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))])
}

function isMatchLive(m) {
  const [day, mon] = (m.date ?? '').trim().split(' ')
  const monthNum = MONTH_NUM_ADMIN[mon]
  if (!monthNum || !m.time) return false
  const [h, min] = m.time.split(':').map(Number)
  const start = new Date(2026, monthNum - 1, parseInt(day, 10), h, min)
  const end = new Date(start.getTime() + 130 * 60 * 1000)
  const now = new Date()
  return now >= start && now <= end
}

// ── API externa worldcup26.ir ─────────────────────────────────

const EN_TO_ES = {
  'Mexico':'México','South Africa':'Sudáfrica','South Korea':'Corea del Sur',
  'Czech Republic':'R. Checa','Canada':'Canadá',
  'Bosnia and Herzegovina':'Bosnia y Herzegovina','United States':'Estados Unidos',
  'Paraguay':'Paraguay','Haiti':'Haití','Scotland':'Escocia','Australia':'Australia',
  'Turkey':'Turquía','Brazil':'Brasil','Morocco':'Marruecos','Qatar':'Qatar',
  'Switzerland':'Suiza','Ivory Coast':'Costa de Marfil','Ecuador':'Ecuador',
  'Germany':'Alemania','Curaçao':'Curazao','Netherlands':'Países Bajos','Japan':'Japón',
  'Sweden':'Suecia','Tunisia':'Túnez','Iran':'Irán','New Zealand':'Nueva Zelanda',
  'Spain':'España','Cape Verde':'Cabo Verde','Belgium':'Bélgica','Egypt':'Egipto',
  'Saudi Arabia':'Arabia Saudita','Uruguay':'Uruguay','France':'Francia',
  'Senegal':'Senegal','Iraq':'Irak','Norway':'Noruega','Argentina':'Argentina',
  'Algeria':'Argelia','Austria':'Austria','Jordan':'Jordania','Portugal':'Portugal',
  'Democratic Republic of the Congo':'RD Congo','Uzbekistan':'Uzbekistán',
  'Colombia':'Colombia','England':'Inglaterra','Croatia':'Croacia',
  'Ghana':'Ghana','Panama':'Panamá',
}


function SyncActionsPanel({ matches, closeMatch, saveManualResult }) {
  const [apiPhase,   setApiPhase]   = useState('idle')
  const [preview,    setPreview]    = useState([])
  const [applied,    setApplied]    = useState(0)
  const [repPhase,      setRepPhase]      = useState('idle')
  const [fixed,         setFixed]         = useState(0)
  const [stuck,         setStuck]         = useState([])
  const [affectedUsers, setAffectedUsers] = useState([])

  async function fetchPreview() {
    setApiPhase('loading')
    try {
      const res = await fetch('https://worldcup26.ir/get/games', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { games } = await res.json()
      const byTeams = {}
      for (const m of matches) {
        if (m.status === 'synced' || m.status === 'locked') continue
        byTeams[`${m.t1}|${m.t2}`] = m
      }
      const toSync = []
      for (const g of games) {
        if (g.finished !== 'TRUE') continue
        const home = EN_TO_ES[g.home_team_name_en]
        const away = EN_TO_ES[g.away_team_name_en]
        if (!home || !away) continue
        const match = byTeams[`${home}|${away}`]
        if (!match) continue
        const h = parseInt(g.home_score, 10)
        const a = parseInt(g.away_score, 10)
        if (isNaN(h) || isNaN(a)) continue
        const advancer = match.phase !== 'group' ? (h >= a ? 'home' : 'away') : null
        toSync.push({ match, h, a, advancer })
      }
      setPreview(toSync)
      setApiPhase('preview')
    } catch (e) {
      setApiPhase('idle')
      alert('Error al conectar con la API: ' + e.message)
    }
  }

  async function applyAll() {
    setApiPhase('applying')
    let count = 0
    for (const { match, h, a, advancer } of preview) {
      if (match.status === 'open') await closeMatch(match.id)
      await saveManualResult(match.id, h, a, advancer)
      count++
    }
    setApplied(count)
    setApiPhase('done')
  }

  async function runRepair() {
    setRepPhase('running')
    const { supabase } = await import('../../lib/supabase.js')
    const { data: candidates } = await supabase
      .from('matches')
      .select('id, t1, t2, result_h, result_a')
      .not('result_h', 'is', null)
      .not('result_a', 'is', null)
    const stuckMatches = []
    for (const m of candidates ?? []) {
      const { count } = await supabase
        .from('predictions')
        .select('id', { count: 'exact', head: true })
        .eq('match_id', m.id)
        .is('result', null)
      if (count > 0) stuckMatches.push(m)
    }
    setStuck(stuckMatches)

    // Collect affected users before repairing
    const userMap = {}
    if (stuckMatches.length > 0) {
      const matchIds = stuckMatches.map(m => m.id)
      const { data: stuckPreds } = await supabase
        .from('predictions')
        .select('user_id, profiles(display_name, email)')
        .in('match_id', matchIds)
        .is('result', null)
      for (const pred of stuckPreds ?? []) {
        if (!userMap[pred.user_id]) {
          userMap[pred.user_id] = pred.profiles?.display_name || pred.profiles?.email || pred.user_id
        }
      }
    }
    setAffectedUsers(Object.values(userMap))

    let count = 0
    for (const m of stuckMatches) {
      const { error } = await supabase.rpc('process_match_result', { p_match_id: m.id })
      if (!error) count++
    }
    setFixed(count)
    setRepPhase('done')
  }

  const card = { border:'1px solid var(--border)', borderRadius:8, marginBottom:16, background:'var(--card)', overflow:'hidden' }
  const row  = { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'12px 16px' }
  const sep  = { borderTop:'1px solid var(--border)' }
  const btn  = (primary) => ({
    padding:'6px 14px', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap',
    background: primary ? 'var(--color-primary)' : 'var(--card)',
    color: primary ? '#fff' : 'var(--text2)',
    border: primary ? 'none' : '1px solid var(--border)',
  })

  return (
    <div style={card}>
      {/* ── Fila API sync ── */}
      <div style={row}>
        <span style={{ fontSize:13, color:'var(--text2)' }}>
          {apiPhase === 'done'
            ? <span style={{ color:'#166534' }}>✅ {applied} resultado{applied !== 1 ? 's' : ''} sincronizado{applied !== 1 ? 's' : ''}</span>
            : <>Sincronizar resultados desde <strong>worldcup26.ir</strong></>
          }
        </span>
        {apiPhase === 'idle' && (
          <button style={btn(true)} onClick={fetchPreview}>🌐 Verificar API</button>
        )}
        {apiPhase === 'loading' && (
          <button style={btn(false)} disabled>⏳ Consultando...</button>
        )}
        {apiPhase === 'preview' && preview.length === 0 && (
          <button style={btn(false)} onClick={() => setApiPhase('idle')}>✓ Sin novedades — cerrar</button>
        )}
        {apiPhase === 'done' && (
          <button style={btn(false)} onClick={() => setApiPhase('idle')}>Verificar de nuevo</button>
        )}
      </div>

      {/* Preview expandido */}
      {(apiPhase === 'preview' && preview.length > 0) || apiPhase === 'applying' ? (
        <div style={{ ...sep, padding:'10px 16px' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:10 }}>
            {preview.map(({ match, h, a }) => (
              <div key={match.id} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, padding:'4px 8px', borderRadius:4, background:'var(--bg)' }}>
                <span style={{ color:'var(--text2)', minWidth:28 }}>#{match.id}</span>
                <span style={{ flex:1 }}>{match.f1} {match.t1}</span>
                <span style={{ fontWeight:700, fontVariantNumeric:'tabular-nums', minWidth:40, textAlign:'center', color:'var(--color-primary)' }}>{h} – {a}</span>
                <span style={{ flex:1, textAlign:'right' }}>{match.t2} {match.f2}</span>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
            <button onClick={() => setApiPhase('idle')} style={btn(false)}>Cancelar</button>
            <button onClick={applyAll} disabled={apiPhase === 'applying'} style={{ ...btn(true), background:'#166534' }}>
              {apiPhase === 'applying' ? '⏳ Aplicando...' : `✓ Aplicar ${preview.length}`}
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Fila Reparar ── */}
      <div style={{ ...sep, ...row }}>
        <span style={{ fontSize:13, color:'var(--text2)' }}>
          {repPhase === 'idle'   && 'Reparar predicciones con resultado pero sin evaluar'}
          {repPhase === 'running' && <span style={{ color:'var(--text3)' }}>⏳ Buscando y reparando…</span>}
          {repPhase === 'done'   && (stuck.length === 0
            ? <span style={{ color:'var(--text3)' }}>✓ No hay predicciones sin evaluar</span>
            : <span style={{ color:'#166534', lineHeight:1.5 }}>
                ✅ {fixed}/{stuck.length} partido{stuck.length !== 1 ? 's' : ''} reparado{fixed !== 1 ? 's' : ''}
                {affectedUsers.length > 0 && (
                  <> — {affectedUsers.length} cliente{affectedUsers.length !== 1 ? 's' : ''}: <strong>{affectedUsers.join(', ')}</strong></>
                )}
              </span>
          )}
        </span>
        {repPhase === 'idle' && (
          <button style={btn(false)} onClick={runRepair}>🔧 Reparar</button>
        )}
        {repPhase === 'done' && (
          <button style={btn(false)} onClick={() => setRepPhase('idle')}>Listo</button>
        )}
      </div>
    </div>
  )
}

function SyncTab() {
  const { matches, syncLog, closeMatch, saveManualResult, resetMatchPredictions, revertMatch } = useApp()
  const [scores, setScores]       = useState({})
  const [filter, setFilter]       = useState('open')
  const [expanded, setExpanded]   = useState(new Set())
  const { confirm, ConfirmNode }  = useConfirm()

  function toggleDate(date) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(date) ? next.delete(date) : next.add(date)
      return next
    })
  }

  const open    = matches.filter(m => m.status === 'open')
  const pending = matches.filter(m => m.status === 'pending')
  const synced  = matches.filter(m => m.status === 'synced')

  function setScore(id, side, val) {
    setScores(prev => ({ ...prev, [id]: { ...prev[id], [side]: val } }))
  }

  const isKnockout = m => m.phase !== 'group'

  async function handleReset(m) {
    const ok = await confirm(
      '¿Limpiar predicciones?',
      `Se eliminarán todas las predicciones de ${m.f1} ${m.t1} vs ${m.t2} ${m.f2}. Esta acción no se puede deshacer.`,
      { confirmLabel: 'Sí, limpiar', danger: true }
    )
    if (ok) {
      resetMatchPredictions(m.id)
      setScores(prev => { const n = { ...prev }; delete n[m.id]; return n })
    }
  }

  function handleSave(m) {
    const s = scores[m.id] ?? {}
    const h = parseInt(s.h)
    const a = parseInt(s.a)
    if (isNaN(h) || isNaN(a)) return
    if (isKnockout(m) && !s.advancer) return
    if (m.status === 'open') closeMatch(m.id)
    saveManualResult(m.id, h, a, s.advancer ?? null)
    setScores(prev => { const n = { ...prev }; delete n[m.id]; return n })
  }

  const visibleOpen    = filter === 'open'    ? open    : []
  const visiblePending = filter === 'pending' ? pending : []
  const visibleSynced  = filter === 'done'    ? synced  : []

  return (
    <div>
      {/* ── Acciones de sincronización ── */}
      <SyncActionsPanel matches={matches} closeMatch={closeMatch} saveManualResult={saveManualResult} />

      {/* ── Filtro ── */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {[
          ['open',    LockOpen,     `Abiertos (${open.length})`],
          ['pending', Timer,        `Pendientes (${pending.length})`],
          ['done',    CheckCircle,  `Finalizados (${synced.length})`],
        ].map(([id, Icon, label]) => (
          <button key={id}
            onClick={() => setFilter(id)}
            style={{
              display:'inline-flex', alignItems:'center', gap:5,
              padding:'6px 14px', borderRadius:6, fontSize:12, fontWeight:500, cursor:'pointer',
              background: filter === id ? 'var(--color-secondary)' : 'var(--card)',
              color:      filter === id ? '#fff' : 'var(--text2)',
              border:     filter === id ? '1px solid var(--color-secondary)' : '1px solid var(--border)',
            }}>
            <Icon size={12} strokeWidth={1.5} />{label}
          </button>
        ))}
      </div>

      {/* ── Pendientes de resultado ── */}
      {visiblePending.length > 0 && (
        <>
          <div className="phase-divider">Pendientes — ingresar resultado</div>
          {visiblePending.map(m => (
            <MatchResultRow key={m.id} m={m} score={scores[m.id]} setScore={setScore} onSave={handleSave} onReset={handleReset} />
          ))}
        </>
      )}

      {/* ── Abiertos agrupados por fecha ── */}
      {visibleOpen.length > 0 && (
        <>
          <div className="phase-divider" style={{ marginTop: visiblePending.length ? 20 : 0 }}>
            Abiertos — cerrar apuestas y cargar resultado
          </div>
          {groupByDate(visibleOpen).map(([date, ms]) => {
            const isOpen = expanded.has(date)
            return (
              <div key={date} className="adm-date-group">
                <button
                  onClick={() => toggleDate(date)}
                  className={`adm-date-heading${isOpen ? ' adm-date-heading--open' : ''}`}
                >
                  <span>{date}</span>
                  <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span className="adm-date-count">{ms.length} partido{ms.length !== 1 ? 's' : ''}</span>
                    <span className="adm-chevron">▼</span>
                  </span>
                </button>
                <div className={`adm-accordion${isOpen ? '' : ' adm-accordion--closed'}`}>
                  <div className="adm-accordion-inner">
                    {ms.map(m => (
                      <MatchResultRow key={m.id} m={m} score={scores[m.id]} setScore={setScore} onSave={handleSave} onReset={handleReset} isOpen />
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* ── Finalizados ── */}
      {visibleSynced.length > 0 && (
        <>
          <div className="phase-divider" style={{ marginTop:20 }}>Finalizados</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px, 1fr))', gap:12 }}>
            {[...visibleSynced].sort((a, b) => {
              const mo = { Jun: 0, Jul: 1 }
              const key = m => { const [d, mn] = m.date.split(' '); return (mo[mn] ?? 0) * 1000000 + parseInt(d) * 10000 + parseInt((m.time ?? '0').replace(':', '')) }
              return key(a) - key(b)
            }).map(m => {
              const [groupLabel, fechaLabel] = (m.round ?? '').split(' · ')
              return (
                <div key={m.id} style={{ background:'var(--bg-dark)', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, overflow:'hidden', display:'flex', flexDirection:'column' }}>
                  {/* header */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 10px', background:'rgba(0,0,0,.2)', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
                    <span style={{ background:'var(--color-secondary)', color:'#fff', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, letterSpacing:.3 }}>
                      {groupLabel}
                    </span>
                    <span style={{ fontSize:10, color:'rgba(244,241,224,.5)' }}>
                      {fechaLabel ? `${fechaLabel} · ` : ''}{m.date}
                    </span>
                  </div>

                  {/* equipos + marcador */}
                  <div style={{ padding:'14px 10px 10px', flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ textAlign:'center', flex:1 }}>
                        <div style={{ fontSize:32, lineHeight:1 }}>{m.f1}</div>
                        <div style={{ fontSize:10, fontWeight:700, color:'rgba(244,241,224,.9)', marginTop:5, letterSpacing:.5 }}>{m.t1.toUpperCase()}</div>
                      </div>
                      <div style={{ fontFamily:"'Bebas Neue'", fontSize:38, color:'var(--color-secondary)', letterSpacing:3, lineHeight:1, padding:'0 6px', textAlign:'center' }}>
                        {m.result?.h} - {m.result?.a}
                      </div>
                      <div style={{ textAlign:'center', flex:1 }}>
                        <div style={{ fontSize:32, lineHeight:1 }}>{m.f2}</div>
                        <div style={{ fontSize:10, fontWeight:700, color:'rgba(244,241,224,.9)', marginTop:5, letterSpacing:.5 }}>{m.t2.toUpperCase()}</div>
                      </div>
                    </div>
                  </div>

                  {/* footer: hora + estadio */}
                  <div style={{ padding:'6px 10px', borderTop:'1px solid rgba(255,255,255,.07)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:10, color:'rgba(244,241,224,.45)' }}>{m.date} · {m.time}</span>
                    {m.stadium && <span style={{ fontSize:9, color:'rgba(244,241,224,.4)', textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:110 }}>📍 {m.stadium}</span>}
                  </div>

                  {/* revertir */}
                  <div style={{ padding:'6px 10px', borderTop:'1px solid rgba(182,59,40,.15)', textAlign:'right' }}>
                    <button
                      style={{ fontSize:10, background:'rgba(182,59,40,.12)', color:'#e07060', border:'1px solid rgba(182,59,40,.25)', borderRadius:5, padding:'3px 10px', cursor:'pointer' }}
                      onClick={async () => {
                        const ok = await confirm(
                          '¿Revertir resultado?',
                          `${m.f1} ${m.t1} ${m.result?.h}–${m.result?.a} ${m.t2} ${m.f2} volverá a estado abierto. Se borrarán los premios y evaluaciones generadas.`,
                          { confirmLabel: '↩ Revertir', danger: true }
                        )
                        if (ok) revertMatch(m.id)
                      }}
                    >
                      ↩ Revertir
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {visiblePending.length === 0 && visibleOpen.length === 0 && visibleSynced.length === 0 && (
        <div style={{ textAlign:'center', padding:32, color:'var(--text3)', fontSize:13 }}>
          No hay partidos en esta categoría.
        </div>
      )}

      {ConfirmNode}
    </div>
  )
}

function MatchResultRow({ m, score = {}, setScore, onSave, onReset, isOpen }) {
  const knockout = m.phase !== 'group'
  const hOk   = score.h !== undefined && score.h !== '' && !isNaN(parseInt(score.h))
  const aOk   = score.a !== undefined && score.a !== '' && !isNaN(parseInt(score.a))
  const advOk = !knockout || !!score.advancer
  const ready = hOk && aOk && advOk
  const live  = isMatchLive(m)

  return (
    <div className="mrr">
      {/* ── info bar ── */}
      <div className="mrr-info">
        <span className="mrr-round">{m.round} · {m.date} · {m.time}</span>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {live && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, color:'#e63946', letterSpacing:.4 }}>
              <span className="pulse-dot dot-active" style={{ background:'#e63946', width:6, height:6 }} />
              EN VIVO
            </span>
          )}
          {isOpen
            ? <span className="result-badge s-upcoming">🔓 Abierto</span>
            : <span className="result-badge rb-pending">⏳ Pendiente</span>
          }
        </div>
      </div>

      {/* ── score row ── */}
      <div className="mrr-score-row">
        <div className="mrr-team mrr-team--home">
          <span className="mrr-flag">{m.f1}</span>
          <span className="mrr-name">{m.t1}</span>
        </div>

        <div className="mrr-inputs">
          <input
            className={`mrr-inp${hOk ? ' mrr-inp--filled' : ''}`}
            type="number" min="0" max="20" placeholder="–"
            value={score.h ?? ''}
            onChange={e => setScore(m.id, 'h', e.target.value)}
            inputMode="numeric"
          />
          <span className="mrr-sep">:</span>
          <input
            className={`mrr-inp${aOk ? ' mrr-inp--filled' : ''}`}
            type="number" min="0" max="20" placeholder="–"
            value={score.a ?? ''}
            onChange={e => setScore(m.id, 'a', e.target.value)}
            inputMode="numeric"
          />
        </div>

        <div className="mrr-team mrr-team--away">
          <span className="mrr-name">{m.t2}</span>
          <span className="mrr-flag">{m.f2}</span>
        </div>
      </div>

      {/* ── advancer (knockout only) ── */}
      {knockout && (
        <div className="mrr-advancer">
          <span className="mrr-adv-label">Avanza:</span>
          {[['home', m.t1], ['away', m.t2]].map(([side, name]) => (
            <button
              key={side}
              className={`mrr-adv-btn${score.advancer === side ? ' mrr-adv-btn--active' : ''}`}
              onClick={() => setScore(m.id, 'advancer', side)}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* ── actions ── */}
      <div className="mrr-actions">
        <button
          className={`mrr-save${ready ? ' mrr-save--ready' : ''}`}
          disabled={!ready}
          onClick={() => onSave(m)}
        >
          {isOpen ? '🔒 Cerrar y guardar' : '✓ Guardar resultado'}
        </button>
        <button className="mrr-reset" onClick={() => onReset(m)}>
          🗑 Limpiar preds
        </button>
      </div>
    </div>
  )
}

// ── Fase de Llaves ────────────────────────────────────────────

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

function LlaveTab() {
  const { standings, matches, applyBracket, revertGroupStage, revertKnockout, reloadData } = useApp()
  const { confirm, ConfirmNode } = useConfirm()

  async function handleRevert() {
    const ok = await confirm(
      '↩ Revertir fase de grupos',
      'Se borrarán todos los resultados de grupos, premios generados y el cuadro de llaves. Esta acción no se puede deshacer.',
      { confirmLabel: 'Revertir todo', danger: true }
    )
    if (ok) revertGroupStage()
  }

  async function handleRevertKO() {
    const ok = await confirm(
      '↩ Resetear cuadro de llaves',
      'Se borrarán todos los resultados, premios y equipos del cuadro de eliminatorias. Los resultados de grupos se mantienen.',
      { confirmLabel: 'Resetear llaves', danger: true }
    )
    if (ok) revertKnockout()
  }

  const groupMatches  = matches.filter(m => m.phase === 'group')
  const totalGroup    = groupMatches.length
  const syncedGroup   = groupMatches.filter(m => m.status === 'synced').length
  const allDone       = syncedGroup === totalGroup
  const r32Assigned   = matches.filter(m => m.phase === 'r32' && m.t1 !== 'Por definir').length

  return (
    <div>
      {/* ── Explicativo ── */}
      <div style={{
        background: 'rgba(90,175,255,.06)', border: '1px solid rgba(90,175,255,.2)',
        borderRadius: 'var(--radius)', padding: '12px 18px', marginBottom: 16, fontSize: 12, color: 'var(--text2)', lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--text1)', display: 'block', marginBottom: 4 }}>¿Cómo funciona el cuadro?</strong>
        <strong>Grupos → Octavos:</strong> paso manual — terminados los 72 partidos de grupos, hacé clic en "Generar cuadro de octavos". Se arma automáticamente con los 1° y 2° de cada grupo más los 8 mejores terceros.<br/>
        <strong>Octavos en adelante:</strong> automático — al guardar el resultado de cada partido eliminatorio <em>elegís quién avanza</em> y el ganador se propaga solo al siguiente partido. Los perdedores de las semis van directo al tercer puesto.
      </div>

      {/* ── Estado ── */}
      <div style={{
        background: allDone ? 'rgba(22,163,74,.06)' : 'rgba(234,179,8,.06)',
        border: `1px solid ${allDone ? 'rgba(22,163,74,.25)' : 'rgba(234,179,8,.3)'}`,
        borderRadius: 'var(--radius)', padding: '12px 18px', marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ fontSize: 13 }}>
          {allDone
            ? <span style={{ color: 'var(--green2)' }}>✓ Fase de grupos completa — podés generar el cuadro</span>
            : <span style={{ color: '#a16207' }}>⏳ Fase de grupos: {syncedGroup}/{totalGroup} partidos finalizados</span>
          }
          {r32Assigned > 0 && (
            <span style={{ marginLeft: 12, color: 'var(--text3)', fontSize: 12 }}>
              · Octavos asignados: {r32Assigned}/16
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn-sim"
            onClick={reloadData}
            style={{ background: 'rgba(90,175,255,.1)', border: '1px solid rgba(90,175,255,.3)', color: '#5aafff' }}
          >
            ↺ Recargar
          </button>
          {syncedGroup > 0 && (
            <button
              className="btn-sim"
              onClick={handleRevert}
              style={{ background: 'rgba(182,59,40,.1)', border: '1px solid rgba(182,59,40,.35)', color: '#b63b28' }}
            >
              ↩ Revertir grupos
            </button>
          )}
          {r32Assigned > 0 && (
            <button
              className="btn-sim"
              onClick={handleRevertKO}
              style={{ background: 'rgba(182,59,40,.1)', border: '1px solid rgba(182,59,40,.35)', color: '#b63b28' }}
            >
              ↩ Resetear llaves
            </button>
          )}
          <button
            className="btn-sim btn-sim-auto"
            onClick={applyBracket}
            style={{ opacity: syncedGroup < 6 ? 0.45 : 1 }}
          >
            {r32Assigned > 0 ? '🔄 Recalcular cuadro' : '🏆 Generar cuadro de octavos'}
          </button>
        </div>
      </div>

      {/* ── Tabla de posiciones por grupo ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {GROUPS.map(g => {
          const teams = standings[g] ?? []
          return (
            <div key={g} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Grupo {g}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>PJ · GF · GC · GD · Pts</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  {teams.map((t, i) => (
                    <tr key={t.name} style={{
                      background: i < 2 ? 'rgba(22,163,74,.04)' : 'transparent',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      <td style={{ padding: '7px 10px', width: 22, color: i < 2 ? 'var(--green2)' : 'var(--text3)', fontWeight: 700 }}>
                        {i + 1}
                      </td>
                      <td style={{ padding: '7px 4px' }}>{t.flag}</td>
                      <td style={{ padding: '7px 6px', fontWeight: i < 2 ? 600 : 400, color: 'var(--text1)' }}>{t.name}</td>
                      <td style={{ padding: '7px 6px', color: 'var(--text3)', textAlign: 'right' }}>{t.pj}</td>
                      <td style={{ padding: '7px 6px', color: 'var(--text3)', textAlign: 'right' }}>{t.gf}</td>
                      <td style={{ padding: '7px 6px', color: 'var(--text3)', textAlign: 'right' }}>{t.gc}</td>
                      <td style={{ padding: '7px 6px', color: 'var(--text3)', textAlign: 'right' }}>{t.gf - t.gc >= 0 ? `+${t.gf - t.gc}` : t.gf - t.gc}</td>
                      <td style={{ padding: '7px 10px', fontFamily: "'Bebas Neue'", fontSize: 16, color: 'var(--color-secondary)', textAlign: 'right' }}>{t.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>

      {/* ── Cuadro de octavos ── */}
      {r32Assigned > 0 && (
        <>
          <div className="phase-divider" style={{ marginTop: 24 }}>Octavos de final asignados</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {matches.filter(m => m.phase === 'r32').map(m => (
              <div key={m.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>{m.date} · {m.time}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{m.f1} {m.t1}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>vs</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{m.t2} {m.f2}</span>
                </div>
                {m.status !== 'locked' && (
                  <div style={{ marginTop: 6 }}>
                    <span className={`result-badge ${m.status === 'open' ? 's-upcoming' : m.status === 'synced' ? 'rb-exact' : 'rb-pending'}`} style={{ fontSize: 10 }}>
                      {m.status === 'open' ? '🔓 Abierto' : m.status === 'synced' ? `✓ ${m.result?.h}–${m.result?.a}` : '⏳ Pendiente'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      {ConfirmNode}
    </div>
  )
}

// ── Configuración de premios ──────────────────────────────────

const PRIZE_TYPES = [
  { id: 'exact', icon: '🎯', label: 'Premio — Resultado exacto' },
]

function PremiosTab() {
  const { prizeConfig, updatePrizeConfig } = useApp()
  const [config, setConfig] = useState(() => ({
    exact: { title: prizeConfig.exact?.title ?? 'Premio', description: prizeConfig.exact?.description ?? '' },
  }))

  function handleChange(type, field, val) {
    setConfig(prev => ({ ...prev, [type]: { ...prev[type], [field]: val } }))
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{
        background:'rgba(90,175,255,.06)', border:'1px solid rgba(90,175,255,.2)',
        borderRadius:'var(--radius)', padding:'12px 18px', fontSize:12, color:'var(--text2)', lineHeight:1.6,
      }}>
        <strong style={{ color:'var(--text1)', display:'block', marginBottom:4 }}>Configuración de premios</strong>
        Personalizá el nombre y la descripción que verán los usuarios en su tarjeta de premio y que verá el bartender al validar el cupón.
      </div>

      {PRIZE_TYPES.map(({ id, icon, label }) => (
        <div key={id} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'18px 20px' }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:16, display:'flex', alignItems:'center', gap:8, color:'var(--text1)' }}>
            <span>{icon}</span>{label}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <label style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:'.06em', textTransform:'uppercase' }}>Nombre del premio</span>
              <input
                value={config[id].title}
                onChange={e => handleChange(id, 'title', e.target.value)}
                placeholder="Premio"
                style={{ padding:'9px 12px', borderRadius:6, background:'var(--bg)', border:'1px solid var(--border)', color:'var(--text1)', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' }}
              />
            </label>
            <label style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:'.06em', textTransform:'uppercase' }}>¿Qué gana el cliente?</span>
              <input
                value={config[id].description}
                onChange={e => handleChange(id, 'description', e.target.value)}
                placeholder="Ej: 1 copa de vino tinto"
                style={{ padding:'9px 12px', borderRadius:6, background:'var(--bg)', border:'1px solid var(--border)', color:'var(--text1)', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' }}
              />
            </label>
          </div>
        </div>
      ))}

      <button
        onClick={() => updatePrizeConfig(config)}
        className="mrr-save mrr-save--ready"
        style={{ alignSelf:'flex-start', padding:'10px 24px', fontSize:13 }}
      >
        💾 Guardar configuración
      </button>
    </div>
  )
}

// ── Fase de llaves ────────────────────────────────────────────

const BRACKET_PHASES = [
  { id: 'r32',   label: 'Octavos de final',  slots: 16 },
  { id: 'r16',   label: 'Ronda de 16',       slots: 8  },
  { id: 'qf',    label: 'Cuartos de final',  slots: 4  },
  { id: 'sf',    label: 'Semifinales',        slots: 2  },
  { id: '3rd',   label: 'Tercer puesto',      slots: 1  },
  { id: 'final', label: 'Final',              slots: 1  },
]

function BracketTab() {
  const { matches } = useApp()

  const hasAny = matches.some(m => m.phase !== 'group' && m.t1 !== 'Por definir')

  if (!hasAny) {
    return (
      <div style={{ padding:'48px 0', textAlign:'center', color:'var(--text3)', fontSize:13 }}>
        El cuadro de llaves se irá armando a medida que se cierren los grupos.<br/>
        <span style={{ fontSize:12, opacity:.7 }}>Generalo desde la pestaña "Fase de grupos" una vez que haya partidos finalizados.</span>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {BRACKET_PHASES.map(phase => {
        const ms = matches.filter(m => m.phase === phase.id)
        const assigned = ms.filter(m => m.t1 !== 'Por definir')
        if (assigned.length === 0) return null
        return (
          <div key={phase.id}>
            <div className="phase-divider">{phase.label}</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:10, marginTop:10 }}>
              {ms.map(m => {
                const tbd = m.t1 === 'Por definir'
                const isDone = m.status === 'synced'
                return (
                  <div key={m.id} style={{
                    background: 'var(--card)',
                    border: `1px solid ${isDone ? 'rgba(22,163,74,.35)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    padding: '10px 14px',
                    opacity: tbd ? .4 : 1,
                  }}>
                    <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6 }}>{m.date} · {m.time}</div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:13, fontWeight: isDone ? 700 : 500 }}>{m.f1} {m.t1}</span>
                      {isDone
                        ? <span style={{ fontFamily:"'Bebas Neue'", fontSize:18, color:'var(--color-secondary)', letterSpacing:2 }}>{m.result?.h}–{m.result?.a}</span>
                        : <span style={{ fontSize:11, color:'var(--text3)' }}>vs</span>
                      }
                      <span style={{ fontSize:13, fontWeight: isDone ? 700 : 500 }}>{m.t2} {m.f2}</span>
                    </div>
                    {!tbd && (
                      <div style={{ marginTop:6 }}>
                        <span className={`result-badge ${isDone ? 'rb-exact' : m.status === 'pending' ? 'rb-pending' : 's-upcoming'}`} style={{ fontSize:10 }}>
                          {isDone ? `✓ Finalizado` : m.status === 'pending' ? '⏳ En juego' : '🔓 Abierto'}
                        </span>
                        {isDone && m.advancer && (
                          <span style={{ fontSize:10, color:'var(--green2)', marginLeft:8 }}>Avanza: {m.advancer === 'h' ? m.t1 : m.t2}</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Validar ───────────────────────────────────────────────────

function roundUpHour(date) {
  const d = new Date(date)
  if (d.getMinutes() > 0 || d.getSeconds() > 0) {
    d.setMinutes(0, 0, 0)
    d.setHours(d.getHours() + 1)
  }
  return d
}

function ValidarTab() {
  const { redeemCode, supabaseConfigured, prizeConfig } = useApp()
  const [code, setCode]     = useState('')
  const [result, setResult] = useState(null)
  const [prizes, setPrizes] = useState([])

  useEffect(() => {
    async function loadPrizes() {
      if (supabaseConfigured) {
        const { supabase } = await import('../../lib/supabase.js')
        const { data } = await supabase
          .from('prizes')
          .select('id, type, code, redeemed, created_at, user_id, match_id, matches(t1, f1, t2, f2, result_h, result_a), profiles(display_name, phone)')
          .order('created_at', { ascending: false })
        const EXPIRY_MS = 3 * 24 * 60 * 60 * 1000
        setPrizes((data ?? []).map(p => {
          const createdAt = p.created_at
          const expired   = createdAt ? (new Date(createdAt).getTime() + EXPIRY_MS) < Date.now() : false
          return {
            id:        p.id,
            userId:    p.user_id,
            userName:  p.profiles?.display_name ?? p.user_id?.slice(0,8) ?? '—',
            userPhone: p.profiles?.phone ?? null,
            type:      p.type,
            code:      p.code,
            redeemed:  p.redeemed,
            expired:   expired && !p.redeemed,
            createdAt,
            expiresAt: createdAt ? new Date(new Date(createdAt).getTime() + EXPIRY_MS) : null,
            match:     p.matches
              ? `${p.matches.f1} ${p.matches.t1} ${p.matches.result_h}–${p.matches.result_a} ${p.matches.t2} ${p.matches.f2}`
              : '',
          }
        }))
      } else {
        setPrizes(getAllPrizes())
      }
    }
    loadPrizes()
  }, [supabaseConfigured])

  function validate() {
    const c = code.trim().toUpperCase()
    if (!c) { setResult(null); return }
    const found = prizes.find(p => p.code === c)
    if (!found)              setResult({ status: 'invalid' })
    else if (found.redeemed) setResult({ status: 'used',     prize: found })
    else if (found.expired)  setResult({ status: 'expired',  prize: found })
    else                     setResult({ status: 'valid',    prize: found })
  }

  async function markUsed(c) {
    await redeemCode(c)
    setPrizes(prev => prev.map(p => p.code === c ? { ...p, redeemed: true } : p))
    setResult(null)
    setCode('')
  }

  const pending  = prizes.filter(p => !p.redeemed && !p.expired)
  const expired  = prizes.filter(p => p.expired)
  const redeemed = prizes.filter(p => p.redeemed)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── Escaner / input ── */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:20 }}>
        <div style={{ fontSize:13, color:'var(--text3)', marginBottom:12 }}>Ingresá o escaneá el código del cliente</div>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ width:44, height:44, background:'var(--accent)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/>
              <path d="M21 16h-3v3"/><path d="M21 21h-3"/><path d="M16 21v-3"/><path d="M8 3v2M3 8h2M21 8h-2M8 21v-2"/>
            </svg>
          </div>
          <input className="code-input" style={{ flex:1 }} placeholder="WC26-XXXX-XXXXXX" value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && validate()} />
          <button className="btn-validate" onClick={validate}>✓ Validar</button>
        </div>
        {result && (
          <div className={`validate-result ${result.status === 'valid' ? 'vr-ok' : result.status === 'used' || result.status === 'expired' ? 'vr-used' : 'vr-err'}`} style={{ marginTop:12 }}>
            {result.status === 'invalid' && <>
              <div className="vr-title">❌ Código inválido</div>
              <div className="vr-detail">No existe en el sistema. Verificá que esté bien escrito.</div>
            </>}
            {result.status === 'used' && <>
              <div className="vr-title">⚠️ Ya canjeado</div>
              <div className="vr-detail">Partido: {result.prize.match}</div>
            </>}
            {result.status === 'expired' && <>
              <div className="vr-title">⏰ Código vencido</div>
              <div className="vr-detail">
                Venció el {result.prize.expiresAt ? (() => { const d = roundUpHour(result.prize.expiresAt); return `${d.getDate()}/${d.getMonth()+1} a las ${d.getHours().toString().padStart(2,'0')}hs` })() : '—'}<br/>
                Partido: {result.prize.match}
              </div>
            </>}
            {result.status === 'valid' && <>
              <div className="vr-title">✓ Válido — entregá el premio</div>
              <div className="vr-detail">
                <strong>Cliente: {result.prize.userName}</strong>
                {result.prize.userPhone && <> · {result.prize.userPhone}</>}<br/>
                Premio: {result.prize.type === 'exact' ? '🎯' : '✅'} <strong>{prizeConfig[result.prize.type]?.title ?? (result.prize.type === 'exact' ? 'Premio A' : 'Premio B')}</strong>
                {prizeConfig[result.prize.type]?.description && <> — {prizeConfig[result.prize.type].description}</>}<br/>
                Partido: {result.prize.match}<br/>
                {result.prize.expiresAt && (() => { const d = roundUpHour(result.prize.expiresAt); return <span style={{ color:'var(--text3)', fontSize:11 }}>Válido hasta el {d.getDate()}/{d.getMonth()+1} a las {d.getHours().toString().padStart(2,'0')}hs</span> })()}
              </div>
              <button className="btn-mark-used" onClick={() => markUsed(result.prize.code)}>Marcar como canjeado</button>
            </>}
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
        {[
          { label:'PENDIENTES', value: pending.length,  color:'var(--text1)' },
          { label:'VENCIDOS',   value: expired.length,  color:'#c0392b' },
          { label:'CANJEADOS',  value: redeemed.length, color:'var(--text1)' },
          { label:'TOTAL',      value: prizes.length,   color:'var(--text1)' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'14px 16px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', letterSpacing:'.06em', marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:28, fontWeight:700, color: s.color, lineHeight:1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Pendientes de canje ── */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
        <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:13 }}>🕐</span>
          <span style={{ fontSize:12, fontWeight:700, letterSpacing:'.06em', color:'var(--text3)' }}>PENDIENTES DE CANJE</span>
        </div>
        {pending.length === 0
          ? <div style={{ padding:'24px 18px', textAlign:'center', color:'var(--text3)', fontSize:13 }}>Sin premios pendientes por el momento</div>
          : pending.map(p => {
              const exp = p.expiresAt ? roundUpHour(p.expiresAt) : null
              const expStr = exp ? `Vence el ${exp.getDate()}/${exp.getMonth()+1} a las ${exp.getHours().toString().padStart(2,'0')}hs` : null
              return (
                <div key={p.code} className="pending-code-row">
                  <div>
                    <div className="pcode">{p.code}</div>
                    <div style={{ fontSize:12, fontWeight:500, color:'var(--text2)', marginTop:2 }}>{p.userName}</div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>{p.type === 'exact' ? 'Exacto 🎯' : 'Ganador ✓'} · {p.match}</div>
                    {expStr && <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>{expStr}</div>}
                  </div>
                  <button className="btn-quick-mark" onClick={() => markUsed(p.code)}>Canjear</button>
                </div>
              )
            })
        }
      </div>

      {/* ── Vencidos ── */}
      {expired.length > 0 && (
        <div style={{ background:'var(--card)', border:'1px solid rgba(192,57,43,.3)', borderRadius:'var(--radius)', overflow:'hidden' }}>
          <div style={{ padding:'12px 18px', borderBottom:'1px solid rgba(192,57,43,.2)', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:13 }}>⏰</span>
            <span style={{ fontSize:12, fontWeight:700, letterSpacing:'.06em', color:'#c0392b' }}>VENCIDOS</span>
          </div>
          {expired.map(p => {
            const exp = p.expiresAt ? roundUpHour(p.expiresAt) : null
            const expStr = exp ? `Venció el ${exp.getDate()}/${exp.getMonth()+1} a las ${exp.getHours().toString().padStart(2,'0')}hs` : null
            return (
              <div key={p.code} className="pending-code-row" style={{ opacity:.7 }}>
                <div>
                  <div className="pcode used">{p.code}</div>
                  <div style={{ fontSize:12, fontWeight:500, color:'var(--text3)', marginTop:2 }}>{p.userName}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>{p.match}</div>
                  {expStr && <div style={{ fontSize:10, color:'#c0392b', marginTop:2, fontWeight:600 }}>{expStr}</div>}
                </div>
                <span className="result-badge rb-pending">Vencido</span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Canjeados ── */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden', opacity: redeemed.length === 0 ? .5 : 1 }}>
        <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:13 }}>🔁</span>
          <span style={{ fontSize:12, fontWeight:700, letterSpacing:'.06em', color:'var(--text3)' }}>CANJEADOS</span>
        </div>
        {redeemed.length === 0
          ? <div style={{ padding:'24px 18px', textAlign:'center', color:'var(--text3)', fontSize:13 }}>No hay premios canjeados aún</div>
          : redeemed.map(p => (
              <div key={p.code} className="pending-code-row">
                <div>
                  <div className="pcode used">{p.code}</div>
                  <div style={{ fontSize:12, fontWeight:500, color:'var(--text3)', marginTop:2 }}>{p.userName}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>{p.match}</div>
                </div>
                <span className="result-badge rb-miss">Canjeado</span>
              </div>
            ))
        }
      </div>

    </div>
  )
}

// ── Usuarios ──────────────────────────────────────────────────

function ReminderButton({ supabaseConfigured, selected, onSent }) {
  const [state, setState] = useState('idle') // idle | sending | done | error
  const [result, setResult] = useState(null)

  const count = selected.size

  async function sendReminders() {
    if (!supabaseConfigured || count === 0) return
    setState('sending')
    setResult(null)
    try {
      const { supabase } = await import('../../lib/supabase.js')
      const { data: { session } } = await supabase.auth.getSession()
      const fnUrl = (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL ?? '').trim()
      const res = await fetch(`${fnUrl}/send-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ userIds: [...selected] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      setResult(data)
      setState('done')
      onSent?.()
    } catch (err) {
      setResult({ error: err.message ?? 'Error desconocido' })
      setState('error')
    }
  }

  return (
    <div style={{
      background: 'rgba(182,59,40,.05)',
      border: '1px solid rgba(182,59,40,.2)',
      borderRadius: 'var(--radius)',
      padding: '14px 16px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12,
    }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-dark)' }}>
          Recordatorio por email
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
          {count === 0
            ? 'Seleccioná usuarios en la tabla para enviarles un recordatorio'
            : `${count} usuario${count !== 1 ? 's' : ''} seleccionado${count !== 1 ? 's' : ''}`}
        </div>
        {state === 'done' && result && !result.error && (
          <div style={{ fontSize: 12, color: 'var(--color-success)', marginTop: 4, fontWeight: 600 }}>
            {result.message
              ? `✓ ${result.message}`
              : `✓ ${result.sent} email${result.sent !== 1 ? 's' : ''} enviado${result.sent !== 1 ? 's' : ''}`}
          </div>
        )}
        {state === 'error' && result?.error && (
          <div style={{ fontSize: 12, color: 'var(--color-primary)', marginTop: 4 }}>
            ✗ {result.error}
          </div>
        )}
      </div>
      <button
        onClick={sendReminders}
        disabled={state === 'sending' || !supabaseConfigured || count === 0}
        style={{
          padding: '8px 18px',
          borderRadius: 6,
          border: 'none',
          background: state === 'sending' || count === 0 ? 'var(--border)' : 'var(--color-primary)',
          color: count === 0 ? 'var(--text3)' : '#fff',
          fontSize: 13,
          fontWeight: 600,
          cursor: state === 'sending' || count === 0 ? 'default' : 'pointer',
          whiteSpace: 'nowrap',
          opacity: !supabaseConfigured ? .4 : 1,
        }}
      >
        {state === 'sending' ? 'Enviando…' : `✉ Enviar${count > 0 ? ` (${count})` : ''}`}
      </button>
    </div>
  )
}

const MODAL_PAGE_SIZE = 15

function UserPredictionsModal({ user, onClose }) {
  const [preds, setPreds]   = useState(null)
  const [prizes, setPrizes] = useState({})
  const [modalPage, setModalPage] = useState(0)
  const { supabaseConfigured } = useApp()

  useEffect(() => {
    async function load() {
      if (!supabaseConfigured) { setPreds([]); return }
      const { supabase } = await import('../../lib/supabase.js')
      const [{ data: predData }, { data: prizeData }] = await Promise.all([
        supabase
          .from('predictions')
          .select('pred_h, pred_a, result, match_id, matches(id, t1, t2, f1, f2, result_h, result_a, status)')
          .eq('user_id', user.id)
          .order('match_id'),
        supabase
          .from('prizes')
          .select('match_id, type, code, redeemed, created_at')
          .eq('user_id', user.id),
      ])
      setPreds(predData ?? [])
      const byMatch = {}
      for (const pr of prizeData ?? []) byMatch[pr.match_id] = pr
      setPrizes(byMatch)
    }
    load()
  }, [user.id, supabaseConfigured])

  const pts = (preds ?? []).reduce((acc, p) =>
    acc + (p.result === 'exact' ? 10 : p.result === 'winner' ? 5 : 0), 0)

  const totalModalPages = preds ? Math.ceil(preds.length / MODAL_PAGE_SIZE) : 0
  const pagedPreds      = preds ? preds.slice(modalPage * MODAL_PAGE_SIZE, (modalPage + 1) * MODAL_PAGE_SIZE) : []

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background:'var(--bg)', borderRadius:14, padding:24, width:'min(740px, 100%)', maxHeight:'88vh', overflow:'auto', position:'relative', boxShadow:'0 8px 40px rgba(0,0,0,.4)' }}>
        <button onClick={onClose} style={{ position:'absolute', top:14, right:18, background:'none', border:'none', fontSize:22, cursor:'pointer', color:'var(--text2)', lineHeight:1 }}>✕</button>
        <div style={{ marginBottom:18 }}>
          <div style={{ fontFamily:"'Bebas Neue'", fontSize:26, lineHeight:1 }}>Predicciones de {user.name}</div>
          <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{user.email}</div>
        </div>
        {preds === null ? (
          <div style={{ textAlign:'center', padding:32, color:'var(--text3)' }}>Cargando…</div>
        ) : preds.length === 0 ? (
          <div style={{ textAlign:'center', padding:32, color:'var(--text3)' }}>Sin predicciones registradas</div>
        ) : (
          <>
            <div style={{ display:'flex', gap:20, marginBottom:14, flexWrap:'wrap' }}>
              <div style={{ fontSize:12, color:'var(--text2)' }}>
                <span style={{ fontFamily:"'Bebas Neue'", fontSize:22, color:'var(--color-text-dark)' }}>{preds.length}</span>
                <span style={{ marginLeft:4 }}>predicciones</span>
              </div>
              <div style={{ fontSize:12, color:'var(--text2)' }}>
                <span style={{ fontFamily:"'Bebas Neue'", fontSize:22, color:'var(--color-secondary)' }}>{pts}</span>
                <span style={{ marginLeft:4 }}>pts</span>
              </div>
              <div style={{ fontSize:12, color:'var(--text2)' }}>
                <span style={{ fontFamily:"'Bebas Neue'", fontSize:22, color:'#4caf50' }}>{preds.filter(p => p.result === 'exact').length}</span>
                <span style={{ marginLeft:4 }}>exactos</span>
              </div>
              <div style={{ fontSize:12, color:'var(--text2)' }}>
                <span style={{ fontFamily:"'Bebas Neue'", fontSize:22, color:'#2196f3' }}>{preds.filter(p => p.result === 'winner').length}</span>
                <span style={{ marginLeft:4 }}>ganador</span>
              </div>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width:36 }}>#</th>
                    <th>Partido</th>
                    <th style={{ textAlign:'center' }}>Pred.</th>
                    <th style={{ textAlign:'center' }}>Real</th>
                    <th style={{ textAlign:'center' }}>Resultado</th>
                    <th style={{ textAlign:'center' }}>Premio</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedPreds.map(p => {
                    const m  = p.matches
                    const pr = prizes[p.match_id]
                    const badge = p.result === 'exact'  ? { label:'Exacto',   cls:'rb-synced'  }
                                : p.result === 'winner' ? { label:'Ganador',  cls:'rb-open'    }
                                : p.result === 'miss'   ? { label:'Miss',     cls:'rb-pending' }
                                :                         { label:'Pendiente', cls:'rb-locked'  }
                    return (
                      <tr key={p.match_id}>
                        <td style={{ fontSize:11, color:'var(--text3)', fontWeight:500 }}>#{m?.id}</td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
                            <span>{m?.f1}</span>
                            <span style={{ fontWeight:500 }}>{m?.t1}</span>
                            <span style={{ color:'var(--text3)', margin:'0 2px' }}>vs</span>
                            <span>{m?.f2}</span>
                            <span style={{ fontWeight:500 }}>{m?.t2}</span>
                          </div>
                        </td>
                        <td style={{ textAlign:'center', fontFamily:"'Bebas Neue'", fontSize:18 }}>
                          {p.pred_h} - {p.pred_a}
                        </td>
                        <td style={{ textAlign:'center', fontFamily:"'Bebas Neue'", fontSize:18, color:'var(--text3)' }}>
                          {m?.result_h != null ? `${m.result_h} - ${m.result_a}` : '—'}
                        </td>
                        <td style={{ textAlign:'center' }}>
                          <span className={`result-badge ${badge.cls}`} style={{ fontSize:10 }}>{badge.label}</span>
                        </td>
                        <td style={{ textAlign:'center' }}>
                          {pr
                            ? <div style={{ fontSize:10, lineHeight:1.4 }}>
                                <div style={{ fontFamily:"monospace", fontWeight:700, color: pr.redeemed ? 'var(--text3)' : 'var(--color-primary)', letterSpacing:.5 }}>{pr.code}</div>
                                <div style={{ color:'var(--text3)', marginTop:2 }}>{pr.redeemed ? 'Canjeado' : 'Pendiente'}</div>
                              </div>
                            : p.result === 'exact'
                              ? <span style={{ fontFamily:"'Bebas Neue'", fontSize:16, color:'var(--color-secondary)' }}>+10</span>
                              : p.result === 'winner'
                                ? <span style={{ fontFamily:"'Bebas Neue'", fontSize:16, color:'var(--color-secondary)' }}>+5</span>
                                : <span style={{ color:'var(--text3)', fontSize:11 }}>—</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {totalModalPages > 1 && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:12 }}>
                <button
                  onClick={() => setModalPage(p => Math.max(0, p - 1))}
                  disabled={modalPage === 0}
                  style={{ padding:'5px 14px', borderRadius:5, fontSize:12, cursor: modalPage === 0 ? 'default' : 'pointer', background:'var(--card)', border:'1px solid var(--border)', color:'var(--text2)', opacity: modalPage === 0 ? 0.4 : 1 }}
                >← Anterior</button>
                <span style={{ fontSize:12, color:'var(--text3)' }}>{modalPage + 1} / {totalModalPages}</span>
                <button
                  onClick={() => setModalPage(p => Math.min(totalModalPages - 1, p + 1))}
                  disabled={modalPage === totalModalPages - 1}
                  style={{ padding:'5px 14px', borderRadius:5, fontSize:12, cursor: modalPage === totalModalPages - 1 ? 'default' : 'pointer', background:'var(--card)', border:'1px solid var(--border)', color:'var(--text2)', opacity: modalPage === totalModalPages - 1 ? 0.4 : 1 }}
                >Siguiente →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function UsuariosTab() {
  const { supabaseConfigured } = useApp()
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [selected, setSelected] = useState(new Set())
  const [soloSinPreds, setSoloSinPreds] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  function toggleUser(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    const nonAdmins = pagedUsers?.filter(u => !u.isAdmin).map(u => u.id) ?? []
    const allSelected = nonAdmins.every(id => selected.has(id))
    setSelected(prev => {
      const next = new Set(prev)
      allSelected ? nonAdmins.forEach(id => next.delete(id)) : nonAdmins.forEach(id => next.add(id))
      return next
    })
  }

  useEffect(() => {
    async function fetchUsers() {
      if (supabaseConfigured) {
        const { supabase } = await import('../../lib/supabase.js')
        const [{ data: profiles }, { data: rankData }] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, email, display_name, full_name, phone, birth_date, avatar_url, is_admin, created_at, last_reminder_at')
            .order('created_at', { ascending: false }),
          supabase.rpc('get_ranking'),
        ])
        const rankMap = {}
        for (const r of rankData ?? []) {
          rankMap[r.user_id] = { predCount: Number(r.pred_count), pts: Number(r.pts) }
        }

        setUsers((profiles ?? []).map(p => ({
          id:           p.id,
          name:         p.display_name || p.email.split('@')[0],
          fullName:     p.full_name    ?? null,
          email:        p.email,
          phone:        p.phone        ?? null,
          birthDate:    p.birth_date   ?? null,
          avatar:       p.avatar_url   ?? null,
          isAdmin:        p.is_admin,
          registeredAt:   p.created_at,
          lastReminderAt: p.last_reminder_at ?? null,
          _predCount:     rankMap[p.id]?.predCount ?? 0,
          _pts:           rankMap[p.id]?.pts       ?? 0,
        })))
      } else {
        setUsers(getAllUsers().sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt)))
      }
      setLoading(false)
    }
    fetchUsers()
  }, [])

  if (loading) {
    return <div style={{ padding:32, textAlign:'center', color:'var(--text3)', fontSize:13 }}>Cargando usuarios…</div>
  }

  if (users.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">👥</div>
        <div className="empty-state-text">Todavía no hay usuarios registrados.<br/>Aparecerán aquí cuando alguien inicie sesión.</div>
      </div>
    )
  }

  const filteredUsers = soloSinPreds ? users.filter(u => (u._predCount ?? 0) === 0 && !u.isAdmin) : users
  const totalPages    = Math.ceil(filteredUsers.length / pageSize)
  const pagedUsers    = filteredUsers.slice(page * pageSize, (page + 1) * pageSize)
  const from          = page * pageSize + 1
  const to            = Math.min((page + 1) * pageSize, filteredUsers.length)

  function handlePageSize(s) {
    setPageSize(s)
    setPage(0)
  }

  function pageButtons() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i)
    const pages = new Set([0, totalPages - 1, page])
    for (let d = -2; d <= 2; d++) {
      const p = page + d
      if (p >= 0 && p < totalPages) pages.add(p)
    }
    return [...pages].sort((a, b) => a - b)
  }

  return (
    <div>
      <ReminderButton
        supabaseConfigured={supabaseConfigured}
        selected={selected}
        onSent={() => setSelected(new Set())}
      />
      {/* ── Cabecera: total + selector de página ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
            <span style={{ fontFamily:"'Bebas Neue'", fontSize:32, color:'var(--color-secondary)', lineHeight:1 }}>
              {filteredUsers.length}
            </span>
            <span style={{ fontSize:13, color:'var(--text2)' }}>
              {soloSinPreds ? 'sin predicciones' : 'usuarios registrados'}
            </span>
          </div>
          <button
            onClick={() => { setSoloSinPreds(v => !v); setPage(0) }}
            style={{
              padding:'4px 12px', borderRadius:5, fontSize:12, cursor:'pointer', fontWeight:500,
              background: soloSinPreds ? 'var(--color-primary)' : 'var(--card)',
              color:      soloSinPreds ? '#fff' : 'var(--text2)',
              border:     soloSinPreds ? '1px solid var(--color-primary)' : '1px solid var(--border)',
            }}
          >
            {soloSinPreds ? '✕ Sin predicciones' : 'Sin predicciones'}
          </button>
          {(() => {
            const allNonAdmins = filteredUsers.filter(u => !u.isAdmin).map(u => u.id)
            const allSelected  = allNonAdmins.length > 0 && allNonAdmins.every(id => selected.has(id))
            return (
              <button
                onClick={() => {
                  setSelected(prev => {
                    const next = new Set(prev)
                    allSelected
                      ? allNonAdmins.forEach(id => next.delete(id))
                      : allNonAdmins.forEach(id => next.add(id))
                    return next
                  })
                }}
                style={{
                  padding:'4px 12px', borderRadius:5, fontSize:12, cursor:'pointer', fontWeight:500,
                  background: allSelected ? 'var(--color-secondary)' : 'var(--card)',
                  color:      allSelected ? '#fff' : 'var(--text2)',
                  border:     allSelected ? '1px solid var(--color-secondary)' : '1px solid var(--border)',
                }}
              >
                {allSelected ? '✕ Deseleccionar todos' : `Seleccionar todos (${allNonAdmins.length})`}
              </button>
            )
          })()}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:12, color:'var(--text3)' }}>Mostrar:</span>
          {[10, 25, 50].map(s => (
            <button key={s} onClick={() => handlePageSize(s)} style={{
              padding:'4px 11px', borderRadius:5, fontSize:12, cursor:'pointer', fontWeight:500,
              background: pageSize === s ? 'var(--color-secondary)' : 'var(--card)',
              color:      pageSize === s ? '#fff' : 'var(--text2)',
              border:     pageSize === s ? '1px solid var(--color-secondary)' : '1px solid var(--border)',
            }}>{s}</button>
          ))}
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width:32, textAlign:'center' }}>
                <input
                  type="checkbox"
                  checked={pagedUsers.filter(u => !u.isAdmin).every(u => selected.has(u.id))}
                  onChange={toggleAll}
                  style={{ cursor:'pointer' }}
                />
              </th>
              <th style={{ width:36, textAlign:'center', color:'var(--text3)' }}>#</th>
              <th>Usuario</th>
              <th>Nombre y apellido</th>
              <th>Contacto</th>
              <th>Cumpleaños</th>
              <th>Preds</th>
              <th>Pts</th>
              <th>Recordatorio</th>
            </tr>
          </thead>
          <tbody>
            {pagedUsers.map((u, i) => {
              const s      = getUserStats(u.id)
              const preds  = u._predCount ?? s.predictions
              const pts    = u._pts ?? s.pts
              const bd     = u.birthDate ? new Date(u.birthDate + 'T12:00:00') : null
              const bdStr  = bd ? `${bd.getDate()}/${bd.getMonth()+1}/${bd.getFullYear()}` : '—'
              const rem    = u.lastReminderAt ? new Date(u.lastReminderAt) : null
              const remStr = rem
                ? `${rem.getDate()}/${rem.getMonth()+1} ${rem.getHours().toString().padStart(2,'0')}:${rem.getMinutes().toString().padStart(2,'0')}`
                : null
              return (
                <tr key={u.id} style={{ opacity: u.isAdmin ? .5 : 1, cursor: u.isAdmin ? 'default' : 'pointer' }}
                  onClick={e => { if (!u.isAdmin && !e.target.closest('input')) setSelectedUser(u) }}>
                  <td style={{ textAlign:'center' }}>
                    {!u.isAdmin && (
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={() => toggleUser(u.id)}
                        style={{ cursor:'pointer' }}
                      />
                    )}
                  </td>
                  <td style={{ textAlign:'center', fontSize:12, color:'var(--text3)', fontWeight:500 }}>
                    {from + i}
                  </td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <UserAvatar user={u} />
                      <div>
                        <div style={{ fontWeight:500, fontSize:13 }}>{u.name}</div>
                        <div style={{ fontSize:11, color:'var(--color-text-muted)' }}>{u.email}</div>
                      </div>
                      {u.isAdmin && (
                        <span className="result-badge rb-pending" style={{ fontSize:9 }}>Admin</span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize:12 }}>{u.fullName || <span style={{ color:'var(--color-text-muted)' }}>—</span>}</td>
                  <td>
                    {u.phone
                      ? <div style={{ fontSize:12 }}>{u.phone}</div>
                      : <span style={{ color:'var(--color-text-muted)', fontSize:12 }}>—</span>
                    }
                  </td>
                  <td style={{ fontSize:12, whiteSpace:'nowrap', color: bd ? 'var(--color-text-dark)' : 'var(--color-text-muted)' }}>
                    {bdStr}
                  </td>
                  <td>
                    <span style={{ fontFamily:"'Bebas Neue'", fontSize:18, color:'var(--color-text-dark)' }}>
                      {preds}
                    </span>
                  </td>
                  <td style={{ fontFamily:"'Bebas Neue'", fontSize:20, color:'var(--color-secondary)', whiteSpace:'nowrap' }}>
                    {pts}
                  </td>
                  <td style={{ fontSize:11, whiteSpace:'nowrap' }}>
                    {remStr
                      ? <span style={{ color:'var(--color-success)', fontWeight:600 }}>✓ {remStr}</span>
                      : <span style={{ color:'var(--color-text-muted)' }}>—</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <UserPredictionsModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      {/* ── Paginación ── */}
      {totalPages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:14, flexWrap:'wrap', gap:8 }}>
          <span style={{ fontSize:12, color:'var(--text3)' }}>{from}–{to} de {users.length}</span>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{ padding:'5px 12px', borderRadius:5, fontSize:12, cursor: page === 0 ? 'default' : 'pointer', background:'var(--card)', border:'1px solid var(--border)', color:'var(--text2)', opacity: page === 0 ? 0.4 : 1 }}
            >← Anterior</button>
            {pageButtons().reduce((acc, p, idx, arr) => {
              if (idx > 0 && p !== arr[idx - 1] + 1) {
                acc.push(<span key={`sep-${p}`} style={{ padding:'5px 4px', color:'var(--text3)', fontSize:12 }}>…</span>)
              }
              acc.push(
                <button key={p} onClick={() => setPage(p)} style={{
                  padding:'5px 10px', borderRadius:5, fontSize:12, cursor:'pointer', fontWeight: p === page ? 700 : 400,
                  background: p === page ? 'var(--color-secondary)' : 'var(--card)',
                  color:      p === page ? '#fff' : 'var(--text2)',
                  border:     p === page ? '1px solid var(--color-secondary)' : '1px solid var(--border)',
                }}>{p + 1}</button>
              )
              return acc
            }, [])}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              style={{ padding:'5px 12px', borderRadius:5, fontSize:12, cursor: page === totalPages - 1 ? 'default' : 'pointer', background:'var(--card)', border:'1px solid var(--border)', color:'var(--text2)', opacity: page === totalPages - 1 ? 0.4 : 1 }}
            >Siguiente →</button>
          </div>
        </div>
      )}
    </div>
  )
}

function UserAvatar({ user }) {
  const initials = user.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const colors   = ['#2d4a3e','#3a2d1a','#1a2d3a','#3a1a2d','#2d3a1a','#1a1a3a']
  const bg       = colors[user.id.charCodeAt(user.id.length - 1) % colors.length]
  return (
    <div style={{ width:34, height:34, borderRadius:'50%', background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'rgba(244,241,224,.85)', flexShrink:0, overflow:'hidden' }}>
      {user.avatar
        ? <img src={user.avatar} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        : initials
      }
    </div>
  )
}

// ── Standalone page exports ───────────────────────────────────

export function ValidarPage() {
  const { user } = useApp()
  if (!user?.isAdmin) return null
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Validar <span>Cupones</span></div>
          <div className="page-sub">Verificá y canjeá los premios de los clientes</div>
        </div>
      </div>
      <ValidarTab />
    </div>
  )
}

export function UsuariosPage() {
  const { user } = useApp()
  if (!user?.isAdmin) return null
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Gestión de <span>Usuarios</span></div>
          <div className="page-sub">Participantes registrados en el sistema</div>
        </div>
      </div>
      <UsuariosTab />
    </div>
  )
}
