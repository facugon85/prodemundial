import { Ticket } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'

const EXPIRY_MS = 3 * 24 * 60 * 60 * 1000

function expiryLabel(createdAt) {
  if (!createdAt) return null
  const exp = new Date(new Date(createdAt).getTime() + EXPIRY_MS)
  const now  = new Date()
  // redondear para arriba a la hora siguiente
  const expR = new Date(exp)
  if (expR.getMinutes() > 0 || expR.getSeconds() > 0) {
    expR.setMinutes(0, 0, 0)
    expR.setHours(expR.getHours() + 1)
  }
  const d = expR.getDate(), m = expR.getMonth() + 1
  const hh = expR.getHours().toString().padStart(2, '0')
  if (exp < now) return { expired: true,  text: `Venció el ${d}/${m} a las ${hh}hs` }
  return { expired: false, text: `Válido hasta el ${d}/${m} a las ${hh}hs` }
}

export default function PremiosPage() {
  const { prizes, prizeConfig } = useApp()

  function copyCode(code, btn) {
    navigator.clipboard?.writeText(code).catch(() => {})
    btn.textContent = '✓ Copiado'
    setTimeout(() => { btn.textContent = 'Copiar' }, 1600)
  }

  const exactDesc = prizeConfig?.exact?.description || '1 porrón'

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Mis <span>Premios</span></div>
          <div className="page-sub">Mostrá el código al bartender para canjearlo</div>
        </div>
      </div>

      <div style={{
        background: 'rgba(182,59,40,.05)',
        border: '1px solid rgba(182,59,40,.2)',
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        marginBottom: 16,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 26, lineHeight: 1 }}>🍺</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-dark)' }}>
            Acertá el marcador exacto y ganás <strong style={{ color: 'var(--color-primary)' }}>{exactDesc}</strong>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            Mostrá tu código al bartender · Válido 72 hs desde el resultado
          </div>
        </div>
      </div>

      {prizes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Ticket size={40} strokeWidth={1} /></div>
          <div className="empty-state-text">
            Todavía no ganaste premios.<br/>
            ¡Los premios se generan automáticamente al terminar cada partido!
          </div>
        </div>
      ) : (
        prizes.map(p => {
          const exp      = expiryLabel(p.createdAt)
          const expired  = !p.redeemed && exp?.expired
          const stateKey = p.redeemed ? 'used' : expired ? 'expired' : p.type
          return (
            <div key={p.id} className={`prize-card ${stateKey}`}>
              <div className="prize-top">
                <span className={`prize-type-label ptl-${stateKey}`}>
                  {prizeConfig[p.type]?.title ?? (p.type === 'exact' ? 'Premio A' : 'Premio B')}
                </span>
                {p.redeemed
                  ? <span className="result-badge rb-miss">Canjeado</span>
                  : expired
                    ? <span className="result-badge rb-pending">Vencido</span>
                    : <span className="result-badge rb-exact">Disponible</span>
                }
              </div>
              {prizeConfig[p.type]?.description && (
                <div style={{ fontSize:13, color:'var(--text2)', marginBottom:4, fontWeight:500 }}>
                  {prizeConfig[p.type].description}
                </div>
              )}
              <div className="prize-match">{p.match}</div>
              <div className="prize-code-box">
                <span className={`prize-code${p.redeemed || expired ? ' used' : ''}`}>{p.code}</span>
                {!p.redeemed && !expired && (
                  <button className="btn-copy" onClick={e => copyCode(p.code, e.target)}>
                    Copiar
                  </button>
                )}
              </div>
              {exp && (
                <div style={{ fontSize:11, color: expired ? 'var(--color-error, #c0392b)' : 'var(--text3)', marginTop:6, fontWeight: expired ? 600 : 400 }}>
                  {exp.text}
                </div>
              )}
              <div className="prize-foot">
                <span className={`pulse-dot ${p.redeemed || expired ? 'dot-used' : 'dot-active'}`} />
                {p.redeemed ? 'Canjeado en barra' : expired ? 'Este código ya no es válido' : 'Mostrá este código al bartender'}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
