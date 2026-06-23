import { Target, BarChart2, Ticket, Trophy, GitBranch, User, Settings2 } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'

const NAV_ICONS = {
  predecir: Target,
  historial: BarChart2,
  premios:  Ticket,
  ranking:  Trophy,
  cuadro:   GitBranch,
  perfil:   User,
  admin:    Settings2,
}

export default function BottomNav() {
  const { user, page, goPage, pendingCount, availPrizes } = useApp()
  if (!user) return null

  const items = [
    { id: 'predecir', label: 'Predecir' },
    { id: 'historial', label: 'Historial' },
    { id: 'premios',  label: 'Premios',  badge: availPrizes || null, badgeClass: 'gold' },
    { id: 'ranking',  label: 'Ranking' },
    { id: 'cuadro',   label: 'Cuadro' },
    { id: 'perfil',   label: 'Perfil' },
    ...(user.isAdmin ? [{ id: 'admin', label: 'Admin', badge: pendingCount || null, badgeClass: 'orange' }] : []),
  ]

  return (
    <div className="bottom-nav">
      {items.map(item => {
        const Icon = NAV_ICONS[item.id]
        return (
          <button
            key={item.id}
            className={`bn-item${page === item.id ? ' active' : ''}`}
            onClick={() => goPage(item.id)}
          >
            <span className="bn-icon">{Icon && <Icon size={20} strokeWidth={1.5} />}</span>
            <span>{item.label}</span>
            {item.badge != null && (
              <span className={`bn-badge${item.badgeClass ? ' ' + item.badgeClass : ''}`}>{item.badge}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
