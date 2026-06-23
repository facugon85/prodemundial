import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import MatchCard from './MatchCard.jsx'
import { PHASE_LABELS } from '../../data/fixture.js'
import { useLiveScores } from '../../hooks/useLiveScores.js'

const MONTH_NUM = {
  'Ene':1,'Feb':2,'Mar':3,'Abr':4,'May':5,'Jun':6,
  'Jul':7,'Ago':8,'Sep':9,'Oct':10,'Nov':11,'Dic':12,
}

function kickoffMinus5(date, time) {
  const [day, mon] = date.trim().split(' ')
  const [h, m] = time.split(':').map(Number)
  const kickoff = new Date(2026, (MONTH_NUM[mon] ?? 1) - 1, parseInt(day, 10), h, m)
  return new Date() >= kickoff.getTime() - 5 * 60 * 1000
}

function toCardStatus(s, date, time) {
  switch (s) {
    case 'open':    return (date && time && kickoffMinus5(date, time)) ? 'live' : 'upcoming'
    case 'pending': return 'live'
    case 'synced':  return 'finished'
    default:        return 'closed'
  }
}

function computePoints(pred, result) {
  if (!pred || !result) return undefined
  if (pred.home === result.home && pred.away === result.away) return 10
  const pw = pred.home > pred.away ? 'h' : pred.home < pred.away ? 'a' : 'd'
  const rw = result.home > result.away ? 'h' : result.home < result.away ? 'a' : 'd'
  return pw === rw ? 5 : 0
}

function dateKey(str) {
  const [day, mon] = str.trim().split(' ')
  return (MONTH_NUM[mon] ?? 0) * 100 + parseInt(day, 10)
}
function timeKey(str) {
  const [h, m] = str.split(':').map(Number)
  return h * 60 + m
}

const PHASE_ORDER = ['group','r32','r16','qf','sf','3rd','final']

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

export default function MatchList() {
  const { matches, predictions, savePrediction } = useApp()
  const liveScores = useLiveScores(matches)
  const [filter, setFilter]       = useState('open')
  const [groupFilter, setGroupFilter] = useState(null)
  const [expanded, setExpanded]   = useState(new Set())
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  function toggle(key) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function selectGroup(g) {
    setGroupFilter(prev => prev === g ? null : g)
  }

  const base = filter === 'open'
    ? matches.filter(m => m.status === 'open')
    : matches.filter(m => m.status !== 'locked')

  const visible = groupFilter
    ? base.filter(m => m.phase !== 'group' || m.group === groupFilter)
    : base

  const tree = {}
  for (const m of visible) {
    tree[m.phase] ??= {}
    ;(tree[m.phase][m.date] ??= []).push(m)
  }
  for (const phase of Object.keys(tree))
    for (const date of Object.keys(tree[phase]))
      tree[phase][date].sort((a, b) => timeKey(a.time) - timeKey(b.time))

  const phases       = PHASE_ORDER.filter(p => tree[p])
  const isMultiPhase = phases.length > 1

  return (
    <div className="ml">
      <div className="ml-tabs">
        {['open','all'].map(f => (
          <button
            key={f}
            className={`ml-tab${filter === f ? ' ml-tab--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'open' ? 'Abiertos' : 'Todos'}
          </button>
        ))}
      </div>

      <div className="ml-group-filters">
        {GROUPS.map(g => (
          <button
            key={g}
            className={`ml-gf-btn${groupFilter === g ? ' ml-gf-btn--active' : ''}`}
            onClick={() => selectGroup(g)}
          >
            {g}
          </button>
        ))}
      </div>

      {phases.length === 0 && (
        <div className="ml-empty">
          <div className="ml-empty-icon">{filter === 'open' ? '✅' : '⚽'}</div>
          <p>{filter === 'open' ? 'Apostaste a todos los partidos disponibles.' : 'No hay partidos para mostrar.'}</p>
        </div>
      )}

      {phases.map(phase => {
        const datesInPhase = Object.keys(tree[phase]).sort((a, b) => dateKey(a) - dateKey(b))

        return (
          <div key={phase} className="ml-phase-block">
            {isMultiPhase && (
              <div className="ml-phase-header">
                <span className="ml-phase-label">{PHASE_LABELS[phase] ?? phase}</span>
              </div>
            )}

            {datesInPhase.map(date => {
              const ms  = tree[phase][date]
              const key = `${phase}-${date}`
              const isCollapsed = !expanded.has(key)
              return (
                <div key={date} className="ml-date-group">
                  <button
                    className={`ml-date-heading${isCollapsed ? ' ml-date-heading--closed' : ''}`}
                    onClick={() => toggle(key)}
                  >
                    <span className="ml-date-label">{date}</span>
                    <span className="ml-date-count">{ms.length} partido{ms.length !== 1 ? 's' : ''}</span>
                    <span className="ml-chevron" style={{ marginLeft: 'auto' }} />
                  </button>
                  <div className={`ml-accordion${isCollapsed ? ' ml-accordion--closed' : ''}`}>
                  <div className="ml-accordion-inner">
                  <div className="ml-grid">
                    {ms.map(m => {
                      const pred       = predictions[m.id]
                      const prediction = pred?.saved ? { home: pred.h, away: pred.a } : undefined
                      const result     = m.result ? { home: m.result.h, away: m.result.a } : undefined
                      const pts        = computePoints(prediction, result)
                      return (
                        <MatchCard
                          key={m.id}
                          matchId={m.id}
                          group={m.round}
                          date={`${m.date} · ${m.time}`}
                          status={toCardStatus(m.status, m.date, m.time)}
                          teamHome={{ name: m.t1, flag: m.f1 }}
                          teamAway={{ name: m.t2, flag: m.f2 }}
                          prediction={prediction}
                          result={result}
                          points={pts}
                          liveScore={liveScores[m.id]}
                          onConfirm={(id, { home, away }) => savePrediction(id, home, away)}
                        />
                      )
                    })}
                  </div>
                  </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
