import { useState } from 'react'
import { useApp } from '../../context/AppContext'

const SW = 150    // slot width (px)
const CW = 22     // connector column width (px)
const BH = 656    // bracket height (8 × 82px per R32 slot)

// ── Team row ─────────────────────────────────────────────────
function TR({ flag, name, score, win, tbd }) {
  return (
    <div className={`bk-tr${win ? ' win' : ''}${tbd ? ' tbd' : ''}`}>
      <span className="bk-fl">{flag || '🏳️'}</span>
      <span className="bk-nm">{name || 'Por definir'}</span>
      {score != null && <span className="bk-sc">{score}</span>}
    </div>
  )
}

// ── Match slot ───────────────────────────────────────────────
function Slot({ m, big }) {
  const { user, saveManualResult } = useApp()
  const [editing, setEditing] = useState(false)
  const [sh, setSh] = useState('')
  const [sa, setSa] = useState('')
  const [adv, setAdv] = useState(null)

  if (!m) return <div className={`bk-slot${big ? ' bk-big' : ''} empty`} />

  const tbd      = !m.t1 || m.t1 === 'Por definir'
  const done     = m.status === 'synced' || m.status === 'finished'
  const savedAdv = m.advancer
  const r        = m.result || {}
  const isKO     = m.phase !== 'group'
  const canEdit  = user?.isAdmin && !tbd && m.status !== 'locked'

  function startEdit() {
    setSh(done ? String(r.h ?? '') : '')
    setSa(done ? String(r.a ?? '') : '')
    setAdv(done ? savedAdv : null)
    setEditing(true)
  }

  // For KO: auto-determine winner from score; only ask when tied (penalties)
  const tied     = sh !== '' && sa !== '' && Number(sh) === Number(sa)
  const autoAdv  = !tied && sh !== '' && sa !== ''
    ? (Number(sh) > Number(sa) ? 'home' : 'away')
    : null
  const finalAdv = isKO ? (autoAdv ?? adv) : null
  const canSave  = sh !== '' && sa !== '' && (!isKO || !tied || adv !== null)

  function handleSave() {
    if (!canSave) return
    saveManualResult(m.id, Number(sh), Number(sa), finalAdv)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className={`bk-slot bk-slot--ed${big ? ' bk-big' : ''}`}>
        <div className="bk-ed-row">
          <span className="bk-fl">{m.f1}</span>
          <span className="bk-nm">{m.t1}</span>
          <input className="bk-ed-inp" type="number" min="0" max="20"
            value={sh} onChange={e => { setSh(e.target.value); setAdv(null) }} autoFocus />
        </div>
        <div className="bk-sep" />
        <div className="bk-ed-row">
          <span className="bk-fl">{m.f2}</span>
          <span className="bk-nm">{m.t2}</span>
          <input className="bk-ed-inp" type="number" min="0" max="20"
            value={sa} onChange={e => { setSa(e.target.value); setAdv(null) }} />
        </div>
        {isKO && tied && (
          <div className="bk-ed-adv">
            <span className="bk-ed-adv-lbl">Penales — avanza</span>
            <button className={`bk-adv-btn${adv === 'home' ? ' on' : ''}`}
              onClick={() => setAdv(adv === 'home' ? null : 'home')}>{m.f1}</button>
            <button className={`bk-adv-btn${adv === 'away' ? ' on' : ''}`}
              onClick={() => setAdv(adv === 'away' ? null : 'away')}>{m.f2}</button>
          </div>
        )}
        <div className="bk-ed-btns">
          <button className="bk-ed-save" disabled={!canSave} onClick={handleSave}>
            ✓ Guardar
          </button>
          <button className="bk-ed-cancel" onClick={() => setEditing(false)}>✕</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bk-slot${big ? ' bk-big' : ''}${done ? ' done' : ''}`}>
      <TR flag={m.f1} name={m.t1} score={done ? r.h : null}
          win={done && savedAdv === 'home'} tbd={tbd} />
      <div className="bk-sep" />
      <TR flag={m.f2} name={m.t2} score={done ? r.a : null}
          win={done && savedAdv === 'away'} tbd={tbd} />
      {m.date && <div className="bk-date">{m.date}</div>}
      {canEdit && (
        <button className="bk-edit-btn" onClick={startEdit} title="Cargar resultado">✎</button>
      )}
    </div>
  )
}

// ── Connector column (U-bracket lines) ───────────────────────
// n = number of bracket groups, side = 'r' (right) | 'l' (left)
function Conn({ n, side }) {
  return (
    <div style={{ width: CW, height: BH, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className={`bk-ct ${side}`} />
          <div className={`bk-cb ${side}`} />
        </div>
      ))}
    </div>
  )
}

// ── Horizontal connector (SF → Final) ────────────────────────
function HLine() {
  return (
    <div style={{ width: CW, height: BH, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
      <div style={{ width: '100%', height: 2, background: 'rgba(90,175,255,.3)' }} />
    </div>
  )
}

// ── Round column ─────────────────────────────────────────────
function Round({ ms }) {
  return (
    <div style={{ width: SW, height: BH, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      {ms.map((m, i) => (
        <div key={m?.id ?? i} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <Slot m={m} />
        </div>
      ))}
    </div>
  )
}

// ── Phase label row config ────────────────────────────────────
const PH = [
  [SW,      '16avos de Final'],
  [CW,      ''],
  [SW,      'Octavos de Final'],
  [CW,      ''],
  [SW,      'Cuartos de Final'],
  [CW,      ''],
  [SW,      'Semifinales'],
  [CW,      ''],
  [SW + 20, '⚽  FINAL'],
  [CW,      ''],
  [SW,      'Semifinales'],
  [CW,      ''],
  [SW,      'Cuartos de Final'],
  [CW,      ''],
  [SW,      'Octavos de Final'],
  [CW,      ''],
  [SW,      '16avos de Final'],
]

// ── Main component ────────────────────────────────────────────
export default function BracketPage() {
  const { matches } = useApp()
  const by = id => matches.find(x => x.id === id)

  // Left half
  const r32L = [73, 74, 75, 76, 77, 78, 79, 80].map(by)
  const r16L = [89, 90, 91, 92].map(by)
  const qfL  = [97, 98].map(by)
  const sfL  = [by(101)]

  // Right half (mirror order)
  const sfR  = [by(102)]
  const qfR  = [99, 100].map(by)
  const r16R = [93, 94, 95, 96].map(by)
  const r32R = [81, 82, 83, 84, 85, 86, 87, 88].map(by)

  const fin = by(104)
  const trd = by(103)

  return (
    <div className="bk-page">
      <div className="bk-hdr">
        <h2 className="bk-title">Cuadro de Eliminatorias</h2>
        <p className="bk-sub">FIFA World Cup 2026</p>
      </div>

      <div className="bk-scroll">
        {/* Phase labels */}
        <div className="bk-phr">
          {PH.map(([w, label], i) => (
            <div key={i} style={{ width: w, flexShrink: 0, textAlign: 'center' }}
                 className="bk-phlbl">
              {label}
            </div>
          ))}
        </div>

        {/* Bracket body */}
        <div className="bk-body" style={{ height: BH }}>
          {/* ── Left half ── */}
          <Round ms={r32L} />
          <Conn n={4} side="r" />
          <Round ms={r16L} />
          <Conn n={2} side="r" />
          <Round ms={qfL} />
          <Conn n={1} side="r" />
          <Round ms={sfL} />
          <HLine />

          {/* ── Final (copa + slot) + 3er puesto ── */}
          <div style={{
            width: SW + 20, flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center',
          }}>
            <div style={{
              height: BH, width: '100%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 8,
            }}>
              {/* Podium: 2° left, 1° center-top, 3° right */}
              <div className="bk-podium">
                <div className="bk-pod-step bk-pod-2">
                  <span className="bk-pod-medal">🥈</span>
                  <span className="bk-pod-lbl">2° Puesto</span>
                </div>
                <div className="bk-pod-step bk-pod-1">
                  <span className="bk-pod-medal">🥇</span>
                  <span className="bk-pod-lbl">1° Puesto</span>
                </div>
                <div className="bk-pod-step bk-pod-3">
                  <span className="bk-pod-medal">🥉</span>
                  <span className="bk-pod-lbl">3° Puesto</span>
                </div>
              </div>
              <img src="/cup2026.png" alt="Copa del Mundo" className="bk-cup" />
              <Slot m={fin} big />
              <img src="/logo.png" alt="Chebra" className="bk-logo-bottom" />
            </div>
          </div>

          {/* ── Right half ── */}
          <HLine />
          <Round ms={sfR} />
          <Conn n={1} side="l" />
          <Round ms={qfR} />
          <Conn n={2} side="l" />
          <Round ms={r16R} />
          <Conn n={4} side="l" />
          <Round ms={r32R} />
        </div>

      </div>
    </div>
  )
}
