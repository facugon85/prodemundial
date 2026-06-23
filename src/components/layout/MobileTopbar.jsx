import { useApp } from '../../context/AppContext.jsx'

export default function MobileTopbar() {
  const { user, stats } = useApp()
  if (!user) return null
  return (
    <div className="mobile-topbar">
      <div className="mtb-logo">PRODE <span>2026</span> <img src="/logo.png" alt="Chebra" className="mtb-brand-logo" /></div>
      <div className="mtb-pts">{stats.pts} pts</div>
      <div className="mtb-avatar">
        {user.avatar ? <img src={user.avatar} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} /> : '⚽'}
      </div>
    </div>
  )
}
