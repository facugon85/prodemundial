import { useState, useEffect } from 'react'

function isNumeric(v) {
  return v !== '' && v !== null && v !== undefined && !isNaN(Number(v))
}

const PILL = {
  upcoming: { label: 'PRÓXIMO',    cls: 'mc-pill--upcoming' },
  live:     { label: 'EN VIVO',    cls: 'mc-pill--live' },
  closed:   { label: 'CERRADO',    cls: 'mc-pill--closed' },
  finished: { label: 'FINALIZADO', cls: 'mc-pill--finished' },
}

export default function MatchCard({
  matchId,
  group,
  date,
  status = 'upcoming',
  teamHome,
  teamAway,
  prediction,
  result,
  points,
  liveScore,
  onConfirm,
}) {
  const [homeVal, setHomeVal] = useState(() => prediction != null ? String(prediction.home) : '')
  const [awayVal, setAwayVal] = useState(() => prediction != null ? String(prediction.away) : '')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (prediction != null) {
      setHomeVal(String(prediction.home))
      setAwayVal(String(prediction.away))
      setEditing(false)
    }
  }, [prediction?.home, prediction?.away])

  const confirmed  = prediction != null
  const canEdit    = status === 'upcoming'
  const showSaved  = confirmed && canEdit && !editing
  const blocked    = !canEdit || showSaved
  const homeFilled = isNumeric(homeVal)
  const awayFilled = isNumeric(awayVal)
  const bothFilled = homeFilled && awayFilled
  const pill       = PILL[status] || PILL.upcoming

  const changed = confirmed
    ? Number(homeVal) !== prediction.home || Number(awayVal) !== prediction.away
    : true

  function handleConfirm() {
    if (!bothFilled || blocked) return
    if (confirmed && !changed) return
    setEditing(false)
    onConfirm?.(matchId, { home: Number(homeVal), away: Number(awayVal) })
  }

  function handleCancel() {
    if (prediction != null) {
      setHomeVal(String(prediction.home))
      setAwayVal(String(prediction.away))
    }
    setEditing(false)
  }

  let btnCls      = 'mc-btn'
  let btnText     = 'Confirmar predicción'
  let btnDisabled = true
  let showHint    = false

  if (!canEdit) {
    btnCls  = 'mc-btn mc-btn--muted'
    btnText = status === 'live' ? 'Partido en curso' : 'Predicción cerrada'
  } else if (bothFilled) {
    if (confirmed && !changed) {
      btnCls  = 'mc-btn mc-btn--confirmed'
      btnText = '✓ Guardada'
    } else {
      btnCls      = 'mc-btn mc-btn--ready'
      btnText     = confirmed ? '✎ Actualizar' : 'Confirmar predicción'
      btnDisabled = false
    }
  } else {
    btnCls   = 'mc-btn mc-btn--incomplete'
    showHint = true
  }

  return (
    <div className="mc">
      {/* ── Header ── */}
      <div className="mc-header">
        <span className="mc-group">{group}</span>
        <div className="mc-header-right">
          <span className="mc-date">{date}</span>
          <span className={`mc-pill ${pill.cls}`}>{pill.label}</span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mc-body">
        <McTeam {...teamHome} />

        <div className="mc-score-zone">
          {status === 'finished' ? (
            result && (
              <div className="mc-result-zone">
                <div className="mc-result-score">{result.home} – {result.away}</div>
                <div className="mc-result-meta">
                  <span className="mc-result-label">resultado</span>
                  {prediction && (
                    <span className="mc-result-pred">pred: {prediction.home}–{prediction.away}</span>
                  )}
                </div>
              </div>
            )
          ) : status === 'live' && liveScore ? (
            <div className="mc-live-zone">
              <div className="mc-live-score">{liveScore.home} – {liveScore.away}</div>
              <div className="mc-live-min">⚽ {liveScore.minute}</div>
            </div>
          ) : (
            <>
              {/* Saved score — collapses when editing */}
              <div className={`mc-collapse${showSaved ? ' mc-collapse--open' : ''}`}>
                <div className="mc-collapse-inner">
                  <div className="mc-cw-center">
                    <span className="mc-saved-inline-score">
                      {prediction?.home ?? '–'} – {prediction?.away ?? '–'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Inputs — collapses when saved */}
              <div className={`mc-collapse${!showSaved ? ' mc-collapse--open' : ''}`}>
                <div className="mc-collapse-inner">
                  <div className="mc-cw-center">
                    <div className="mc-inputs">
                      <input
                        className={`mc-input${homeFilled ? ' mc-input--filled' : ''}`}
                        type="number" min="0" max="20" placeholder="–"
                        value={homeVal}
                        onChange={e => setHomeVal(e.target.value)}
                        disabled={blocked}
                        inputMode="numeric"
                      />
                      <span className="mc-sep">:</span>
                      <input
                        className={`mc-input${awayFilled ? ' mc-input--filled' : ''}`}
                        type="number" min="0" max="20" placeholder="–"
                        value={awayVal}
                        onChange={e => setAwayVal(e.target.value)}
                        disabled={blocked}
                        inputMode="numeric"
                      />
                    </div>
                    <span className="mc-pred-label">
                      {editing && confirmed
                        ? `guardado: ${prediction.home ?? '–'} – ${prediction.away ?? '–'}`
                        : 'tu predicción'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <McTeam {...teamAway} />
      </div>

      {/* ── Footer ── */}
      <div className="mc-footer">
        {status === 'finished' ? (
          points !== undefined && (
            <div className={`mc-points ${points > 0 ? 'mc-points--earned' : 'mc-points--zero'}`}>
              {points > 0 ? `+${points} pts` : '0 pts · sin puntos'}
            </div>
          )
        ) : (
          <>
            {/* Saved state: Editar button */}
            <div className={`mc-collapse${showSaved ? ' mc-collapse--open' : ''}`}>
              <div className="mc-collapse-inner">
                <div className="mc-cw-right">
                  <button className="mc-btn-edit" onClick={() => setEditing(true)}>Editar</button>
                </div>
              </div>
            </div>

            {/* Edit/open state: action buttons */}
            <div className={`mc-collapse${!showSaved ? ' mc-collapse--open' : ''}`}>
              <div className="mc-collapse-inner">
                <div className="mc-cw-stretch">
                  <div className="mc-btn-row">
                    <button className={btnCls} disabled={btnDisabled} onClick={handleConfirm}>
                      {btnText}
                    </button>
                    {editing && confirmed && (
                      <button className="mc-btn-cancel" onClick={handleCancel}>Cancelar</button>
                    )}
                  </div>
                  {showHint && <p className="mc-hint">Completá los dos marcadores para confirmar</p>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function McTeam({ name, flag }) {
  return (
    <div className="mc-team">
      <span className="mc-flag">{flag}</span>
      <span className="mc-team-name">{name}</span>
    </div>
  )
}
