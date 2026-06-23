import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'

const TOTAL = 4

// ── Progress bar ─────────────────────────────────────────────
function ProgressBar({ step }) {
  return (
    <div className="ob-progress">
      {Array.from({ length: TOTAL }, (_, i) => (
        <div key={i} className="ob-progress-item">
          <div className={`ob-dot ${i < step ? 'done' : i === step ? 'active' : ''}`}>
            {i < step ? '✓' : i + 1}
          </div>
          {i < TOTAL - 1 && <div className={`ob-line ${i < step ? 'done' : ''}`} />}
        </div>
      ))}
    </div>
  )
}

// ── Step 1: Welcome ───────────────────────────────────────────
function Step1() {
  return (
    <div className="ob-step">
      <div className="ob-hero-icon">
        <div style={{ background: '#1e2118', borderRadius: '50%', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/logo.png" alt="Chebra" style={{ width: 60, height: 60, objectFit: 'contain' }} />
        </div>
      </div>
      <h2 className="ob-title">Bienvenido al Prode</h2>
      <p className="ob-desc">
        104 partidos del Mundial FIFA 2026. Predecí resultados, acumulá puntos
        y ganá premios en Chebra.
      </p>
      <div className="ob-intro-list">
        {['Cómo se puntúa', 'Ejemplo en vivo', 'Premios disponibles'].map((item, i) => (
          <div key={i} className="ob-intro-item">
            <div className="ob-intro-num">{i + 1}</div>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Step 2: Scoring ───────────────────────────────────────────
function Step2() {
  const cards = [
    {
      icon: '🎯',
      title: 'Resultado exacto',
      pts: '10 puntos',
      desc: 'Acertás el marcador exacto, ej: 2-1',
      accent: '#c0392b',
      bg: 'rgba(192,57,43,.08)',
    },
    {
      icon: '✓',
      title: 'Ganador correcto',
      pts: '5 puntos',
      desc: 'Acertás quién gana o si es empate',
      accent: '#e67e22',
      bg: 'rgba(230,126,34,.08)',
    },
    {
      icon: '✗',
      title: 'No acertás',
      pts: '0 puntos',
      desc: 'Ni el marcador ni el ganador',
      accent: '#888',
      bg: 'rgba(136,136,136,.08)',
    },
  ]
  return (
    <div className="ob-step">
      <div className="ob-hero-icon">📊</div>
      <h2 className="ob-title">Cómo se puntúa</h2>
      <div className="ob-score-cards">
        {cards.map((c, i) => (
          <div key={i} className="ob-score-card" style={{ background: c.bg }}>
            <div className="ob-score-badge" style={{ background: c.accent }}>
              {c.icon}
            </div>
            <div className="ob-score-body">
              <div className="ob-score-title">{c.title}</div>
              <div className="ob-score-pts" style={{ color: c.accent }}>{c.pts}</div>
              <div className="ob-score-desc">{c.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Step 3: Live example ──────────────────────────────────────
function Step3() {
  const rows = [
    {
      pred: 'Predijiste 2 - 1',
      note: 'Resultado exacto',
      pts: '+10 pts',
      bg: 'rgba(192,57,43,.10)',
      color: '#c0392b',
    },
    {
      pred: 'Predijiste 3 - 1',
      note: 'Ganador correcto',
      pts: '+5 pts',
      bg: 'rgba(230,126,34,.10)',
      color: '#e67e22',
    },
    {
      pred: 'Predijiste 0 - 1',
      note: 'No acertaste',
      pts: '0 pts',
      bg: 'rgba(136,136,136,.08)',
      color: '#888',
    },
  ]
  return (
    <div className="ob-step">
      <div className="ob-hero-icon">⚽</div>
      <h2 className="ob-title">Ejemplo en vivo</h2>
      <div className="ob-match-header">
        <div className="ob-match-teams">Argentina <span className="ob-vs">vs</span> Francia</div>
        <div className="ob-match-real">Resultado real: <strong>2 - 1</strong></div>
      </div>
      <div className="ob-example-rows">
        {rows.map((r, i) => (
          <div key={i} className="ob-example-row" style={{ background: r.bg }}>
            <span className="ob-ex-pred">{r.pred}</span>
            <span className="ob-ex-note" style={{ color: r.color }}>{r.note}</span>
            <span className="ob-ex-pts" style={{ color: r.color }}>{r.pts}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Step 4: Prizes ────────────────────────────────────────────
function Step4() {
  return (
    <div className="ob-step">
      <div className="ob-hero-icon">🎁</div>
      <h2 className="ob-title">Premios</h2>
      <div className="ob-prize-list">
        <div className="ob-prize-item">
          <div className="ob-prize-icon">🍺</div>
          <div className="ob-prize-body">
            <div className="ob-prize-title">Ganador de la fecha</div>
            <div className="ob-prize-desc">
              El jugador con más puntos en esa fecha recibe un código para
              canjear una pinta en la barra.
            </div>
          </div>
        </div>
        <div className="ob-prize-item">
          <div className="ob-prize-icon">🏆</div>
          <div className="ob-prize-body">
            <div className="ob-prize-title">Campeón del mundial</div>
            <div className="ob-prize-desc">
              El jugador con más puntos acumulados al finalizar los 104 partidos
              se lleva el premio mayor del bar.
            </div>
          </div>
        </div>
        <div className="ob-prize-item ob-prize-qr">
          <div className="ob-prize-icon">📲</div>
          <div className="ob-prize-body">
            <div className="ob-prize-title">¿Cómo canjear?</div>
            <div className="ob-prize-desc">
              Mostrá tu código en <strong>Mis premios</strong> al barman para canjearlo.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const STEPS = [Step1, Step2, Step3, Step4]

// ── Wizard shell ──────────────────────────────────────────────
export default function OnboardingWizard() {
  const { completeOnboarding } = useApp()
  const [step, setStep] = useState(0)
  const [fading, setFading] = useState(false)
  const [loading, setLoading] = useState(false)

  const StepView = STEPS[step]

  function navigate(next) {
    setFading(true)
    setTimeout(() => {
      setStep(next)
      setFading(false)
    }, 200)
  }

  async function handleNext() {
    if (step < TOTAL - 1) {
      navigate(step + 1)
    } else {
      setLoading(true)
      await completeOnboarding()
      setLoading(false)
    }
  }

  return (
    <div className="ob-overlay">
      <div className="ob-card">
        <ProgressBar step={step} />

        <div className="ob-body">
          <div className={`ob-step-wrap${fading ? ' ob-fading' : ''}`}>
            <StepView />
          </div>
        </div>

        <div className="ob-footer">
          <button
            className="ob-btn ob-btn-ghost"
            onClick={() => navigate(step - 1)}
            disabled={step === 0}
          >
            ← Anterior
          </button>
          <div className="ob-counter">{step + 1} de {TOTAL}</div>
          <button
            className="ob-btn ob-btn-primary"
            onClick={handleNext}
            disabled={loading}
          >
            {loading
              ? <><span className="spin">↻</span> Cargando…</>
              : step === TOTAL - 1
                ? 'Empezar a jugar'
                : 'Siguiente →'}
          </button>
        </div>
      </div>
    </div>
  )
}
