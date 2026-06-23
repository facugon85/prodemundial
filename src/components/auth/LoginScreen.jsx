import { useState, useEffect } from 'react'
import { Mail, MapPin, MailOpen } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { FIXTURE } from '../../data/fixture.js'
import { useLiveScores } from '../../hooks/useLiveScores.js'

// ── next / live match helper ──────────────────────────────────
const MONTH_MAP = {
  'Ene':0,'Feb':1,'Mar':2,'Abr':3,'May':4,'Jun':5,
  'Jul':6,'Ago':7,'Sep':8,'Oct':9,'Nov':10,'Dic':11,
}
function parseDate(dateStr, timeStr) {
  const [day, mon] = dateStr.trim().split(' ')
  const [h, m] = timeStr.split(':').map(Number)
  return new Date(2026, MONTH_MAP[mon], parseInt(day, 10), h, m)
}
function getHighlightMatch(matchesList) {
  const now     = new Date()
  const ago2h   = new Date(now.getTime() - 2 * 60 * 60 * 1000)
  let live = null, next = null, nextDate = null

  for (const m of matchesList) {
    if (m.status === 'locked') continue
    const md = parseDate(m.date, m.time)
    if (md >= ago2h && md <= now && !live) {
      live = { match: m, isLive: true }
    }
    if (md > now && (!nextDate || md < nextDate)) {
      nextDate = md; next = { match: m, isLive: false }
    }
  }
  return live || next
}

export default function LoginScreen() {
  const { loginWithGoogle, loginWithFacebook, loginWithEmail, loginDemo } = useApp()
  const [mode, setMode]       = useState('oauth') // 'oauth' | 'email'
  const [tab, setTab]         = useState('login')  // 'login' | 'register'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [showPass, setShowPass] = useState(false)

  function switchTab(t) { setTab(t); setError(''); setEmailSent(false) }

  async function handleEmailSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await loginWithEmail(email, password, tab === 'register')
      // signUp sin sesión activa = Supabase requiere confirmación de email
      if (result?.needsConfirmation) {
        setEmailSent(true)
      }
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('Invalid login credentials')) {
        setError('Email o contraseña incorrectos.')
      } else if (msg.includes('User already registered')) {
        setError('Ya existe una cuenta con ese email. Ingresá en la pestaña "Ingresar".')
      } else if (msg.includes('Password should be')) {
        setError('La contraseña debe tener al menos 6 caracteres.')
      } else {
        setError(msg || 'Ocurrió un error. Intentá de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-brand-circle">
          <img src="/logo.png" alt="Logo" className="login-brand-logo" />
        </div>
        <div className="login-logo">PRODE <span>2026</span></div>
        <div className="login-sub">CHEBRA · Mundial FIFA</div>
        <div className="badge-pill">104 partidos</div>

        <MatchPreview />

        {mode === 'oauth' && (
          <>
            <button className="btn-google" onClick={loginWithGoogle}>
              <GoogleIcon /> Continuar con Google
            </button>
            {/* Facebook — pendiente de activar en Meta Developers
            <button className="btn-fb" onClick={loginWithFacebook}>
              <FacebookIcon /> Continuar con Facebook
            </button>
            */}
            <div className="login-divider">o</div>
            <button className="btn-email" onClick={() => setMode('email')}>
              <Mail size={16} strokeWidth={1.5} style={{ verticalAlign:'middle', marginRight:6 }} />
              Continuar con correo
            </button>
            {import.meta.env.DEV && (
              <div className="login-demo-hint">
                ¿Querés probar?{' '}
                <button onClick={() => loginDemo('user')}>Entrar como usuario</button>
                {' · '}
                <button onClick={() => loginDemo('admin')}>Entrar como admin</button>
              </div>
            )}
          </>
        )}

        {mode === 'email' && (
          <div className="email-form">
            {/* Tabs */}
            <div className="email-tabs">
              <button
                type="button"
                className={`email-tab${tab === 'login' ? ' active' : ''}`}
                onClick={() => switchTab('login')}
              >
                Ingresar
              </button>
              <button
                type="button"
                className={`email-tab${tab === 'register' ? ' active' : ''}`}
                onClick={() => switchTab('register')}
              >
                Crear cuenta
              </button>
            </div>

            {/* Confirmación enviada */}
            {emailSent ? (
              <div className="email-sent-msg">
                <div style={{ fontSize: 28, marginBottom: 8 }}><MailOpen size={28} strokeWidth={1.5} /></div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>¡Revisá tu correo!</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                  Te enviamos un link de confirmación a <strong>{email}</strong>.<br />
                  Hacé click en el link para activar tu cuenta.
                </div>
                <button
                  type="button"
                  className="btn-back"
                  style={{ marginTop: 14, alignSelf: 'center' }}
                  onClick={() => { setEmailSent(false); switchTab('login') }}
                >
                  ← Volver a ingresar
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit}>
                <div className="form-group">
                  <label className="form-label">Correo electrónico</label>
                  <input
                    className="form-input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="vos@ejemplo.com"
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="········"
                      required
                      minLength={6}
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text3)', fontSize: 16, padding: 0, lineHeight: 1,
                      }}
                      tabIndex={-1}
                    >
                      {showPass
                        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                  {error && <div className="form-error">{error}</div>}
                </div>
                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading
                    ? <><span className="spin">↻</span> {tab === 'register' ? 'Creando cuenta…' : 'Ingresando…'}</>
                    : tab === 'register' ? 'Crear cuenta' : 'Ingresar'
                  }
                </button>
              </form>
            )}

            <button type="button" className="btn-back" onClick={() => setMode('oauth')}>
              ← Volver
            </button>
          </div>
        )}

        <div className="login-terms">
          Al continuar aceptás los términos del prode y las condiciones del establecimiento.
        </div>

      </div>

      <div className="login-footer-sig">
        © {new Date().getFullYear()} Chebra.
        {' '}· Hecho con 🧉 en Buenos Aires por{' '}
        <a href="https://www.cufagon.xyz/" target="_blank" rel="noopener noreferrer" className="login-sig-cufa">CUFA.</a>
        {' '}· <span className="login-sig-ver">v2.1.2</span>
      </div>
    </div>
  )
}

// ── MatchPreview ──────────────────────────────────────────────
function useCountdown(targetDate) {
  const calc = () => {
    const diff = targetDate - new Date()
    if (diff <= 0) return null
    const d = Math.floor(diff / 86400000)
    const h = Math.floor((diff % 86400000) / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    return { d, h, m, s }
  }
  const [remaining, setRemaining] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setRemaining(calc()), 1000)
    return () => clearInterval(id)
  }, [targetDate])
  return remaining
}

const MUNDIAL_START = new Date(2026, 5, 11, 16, 0) // 11 Jun 2026 16:00

const forceArgRibbon = import.meta.env.DEV &&
  new URLSearchParams(window.location.search).has('arg')

function argPlayingToday() {
  const now = new Date()
  return FIXTURE.some(m => {
    if (m.t1 !== 'Argentina' && m.t2 !== 'Argentina') return false
    const [day, mon] = (m.date ?? '').trim().split(' ')
    const monthNum = MONTH_MAP[mon]
    if (monthNum === undefined) return false
    const d = new Date(2026, monthNum, parseInt(day, 10))
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth()    === now.getMonth() &&
           d.getDate()     === now.getDate()
  })
}

function MatchPreview() {
  const { matches } = useApp()
  const info = getHighlightMatch(matches)
  const worldCupStarted = new Date() >= MUNDIAL_START
  const countdown  = useCountdown(worldCupStarted ? new Date(0) : MUNDIAL_START)
  const liveScores = useLiveScores(FIXTURE)

  if (!info) return null
  const { match: m, isLive } = info
  const live = isLive ? liveScores[m.id] : null
  const showArgRibbon = forceArgRibbon || argPlayingToday()

  return (
    <div className={`lmp${isLive ? ' lmp--live' : ''}`}>
      {showArgRibbon && (
        <div className="arg-ribbon-wrap">
          <div className="arg-ribbon">
            <img src="/sol-de-mayo.svg" width="18" height="18" alt="" />
          </div>
        </div>
      )}
      <div className="lmp-badge">
        {isLive ? <><span className="lmp-dot" />EN VIVO{live?.minute ? ` · ${live.minute}'` : ''}</> : 'PRÓXIMO PARTIDO'}
      </div>
      <div className="lmp-round">{m.round}</div>
      <div className="lmp-teams">
        <div className="lmp-team">
          <span className="lmp-flag">{m.f1}</span>
          <span className="lmp-name">{m.t1}</span>
        </div>
        <div className="lmp-center">
          {live
            ? <span className="lmp-score">{live.home} - {live.away}</span>
            : <><span className="lmp-time">{m.time}</span><span className="lmp-date-str">{m.date}</span></>
          }
        </div>
        <div className="lmp-team">
          <span className="lmp-flag">{m.f2}</span>
          <span className="lmp-name">{m.t2}</span>
        </div>
      </div>
      {m.stadium && <div className="lmp-stadium"><MapPin size={11} strokeWidth={1.5} style={{ verticalAlign:'middle', marginRight:3 }} />{m.stadium}</div>}
      {!worldCupStarted && countdown && (
        <div className="lmp-countdown">
          {countdown.d > 0 && <span><b>{countdown.d}</b>d</span>}
          <span><b>{String(countdown.h).padStart(2,'0')}</b>h</span>
          <span><b>{String(countdown.m).padStart(2,'0')}</b>m</span>
          <span><b>{String(countdown.s).padStart(2,'0')}</b>s</span>
        </div>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}
