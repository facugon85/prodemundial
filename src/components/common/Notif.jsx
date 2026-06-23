import { useApp } from '../../context/AppContext.jsx'

export default function Notif() {
  const { notifs } = useApp()
  if (!notifs.length) return null
  return (
    <div className="notif-container">
      {notifs.map(n => (
        <div key={n.id} className={`notif-item ${n.type} ${n.hiding ? 'hiding' : ''}`}>
          <div className="notif-title">{n.title}</div>
          <div className="notif-body">{n.body}</div>
        </div>
      ))}
    </div>
  )
}
