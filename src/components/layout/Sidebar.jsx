import { useState } from 'react'
import { Target, BarChart2, Ticket, Trophy, GitBranch, User, Settings2, Users, RefreshCw, Bell, Lock, Wand2, Clock, ScanLine } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'

const VERSION_NOTES = [
  { Icon: Clock,      text: 'Cupones con fecha de vencimiento (168hs)' },
  { Icon: Ticket,     text: 'Estado "Vencido" en premios y panel admin' },
  { Icon: BarChart2,  text: 'Puntos calculados en tiempo real desde Supabase' },
  { Icon: Users,      text: 'Ver predicciones de cada usuario desde el admin' },
  { Icon: RefreshCw,  text: 'Corrección de sincronización automática de resultados' },
]

export default function Sidebar() {
  const { user, page, goPage, stats, pendingCount, availPrizes, logout } = useApp()
  const [versionOpen, setVersionOpen] = useState(false)

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-title">PRODE <span>2026</span> <img src="/logo.png" alt="Chebra" className="sidebar-brand-logo" /></div>
        <div className="logo-sub">Mundial FIFA</div>
      </div>

      <div className="sidebar-user">
        <div className="avatar">
          <img src={user.avatar || '/logo.png'} alt="" />
          <div className="avatar-online" />
        </div>
        <div style={{ flex: 1 }}>
          <div className="user-name">{user.name}</div>
          <div className="user-badge" style={{ marginTop: 4, display: 'inline-block' }}>{stats.pts} pts</div>
        </div>
      </div>

      <div className="sidebar-nav">
        {!user.isAdmin && (
          <>
            <div className="nav-section">Jugador</div>
            <NavItem Icon={Target}    label="Predecir partidos" page="predecir" current={page} onClick={goPage} />
            <NavItem Icon={BarChart2} label="Mi historial" page="historial" current={page} onClick={goPage} />
            <NavItem Icon={Ticket}    label="Mis premios" page="premios" current={page} onClick={goPage}
              badge={availPrizes || null} badgeClass="gold" />
            <NavItem Icon={Trophy}    label="Ranking" page="ranking" current={page} onClick={goPage} />
            <NavItem Icon={GitBranch} label="Cuadro de llaves" page="cuadro" current={page} onClick={goPage} />
            <NavItem Icon={User}      label="Mi perfil" page="perfil" current={page} onClick={goPage} />
          </>
        )}

        {user.isAdmin && (
          <>
            <div className="nav-section">Administración</div>
            <NavItem Icon={Settings2}  label="Panel admin" page="admin" current={page} onClick={goPage}
              badge={pendingCount || null} badgeClass="orange" />
            <NavItem Icon={ScanLine}   label="Validar cupones" page="validar" current={page} onClick={goPage} />
            <NavItem Icon={Users}      label="Usuarios" page="usuarios" current={page} onClick={goPage} />
            <NavItem Icon={Trophy}     label="Ranking" page="ranking" current={page} onClick={goPage} />
            <NavItem Icon={GitBranch}  label="Cuadro de llaves" page="cuadro" current={page} onClick={goPage} />
          </>
        )}
      </div>

      <div style={{ padding: '12px 16px' }}>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          {versionOpen && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 10px)', left: 0, right: 0,
              background: '#1a1f1a', border: '1px solid rgba(244,241,224,.12)',
              borderRadius: 10, padding: '14px 14px 10px',
              boxShadow: '0 -8px 24px rgba(0,0,0,.4)',
              zIndex: 100,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(244,241,224,.9)', letterSpacing: 1, textTransform: 'uppercase' }}>
                  Novedades v2.1.2
                </span>
                <button onClick={() => setVersionOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(244,241,224,.4)', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {VERSION_NOTES.map((n, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 11, color: 'rgba(244,241,224,.65)', alignItems: 'flex-start' }}>
                    <span style={{ flexShrink: 0, opacity: 0.7 }}><n.Icon size={12} strokeWidth={1.5} /></span>
                    <span style={{ lineHeight: 1.4 }}>{n.text}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 10, color: 'rgba(244,241,224,.25)', textAlign: 'center' }}>
                Prode 2026 · Chebra
              </div>
            </div>
          )}
          <button
            onClick={() => setVersionOpen(v => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(244,241,224,.25)', fontSize: 10, letterSpacing: .5,
              fontFamily: 'inherit', padding: '2px 0', transition: 'color 150ms',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(244,241,224,.55)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(244,241,224,.25)'}
          >
            v2.1.2
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <span style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 500, fontSize: 38, color: 'rgba(244,241,224,.9)', letterSpacing: 3, lineHeight: 1 }}>CHEBRA</span>
        </div>
        <button onClick={logout} style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px solid rgba(244,241,224,.15)', borderRadius: 8, color: 'rgba(244,241,224,.45)', fontSize: 12, cursor: 'pointer', transition: 'color 200ms' }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

function NavItem({ Icon, label, page, current, onClick, badge, badgeClass }) {
  return (
    <div className={`nav-item${current === page ? ' active' : ''}`} onClick={() => onClick(page)}>
      <span className="ni-icon">{Icon && <Icon size={16} strokeWidth={1.5} />}</span>
      {label}
      {badge != null && (
        <span className={`ni-badge${badgeClass ? ' ' + badgeClass : ''}`}>{badge}</span>
      )}
    </div>
  )
}
