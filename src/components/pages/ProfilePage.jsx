import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'

export default function ProfilePage() {
  const { user, updateProfile, stats, supabaseConfigured, logout, goPage } = useApp()

  const nameParts = (user.fullName ?? '').split(' ')
  const [firstName, setFirstName] = useState(nameParts[0] ?? '')
  const [lastName,  setLastName]  = useState(nameParts.slice(1).join(' '))
  const [name,      setName]      = useState(user.name      ?? '')
  const [phone,     setPhone]     = useState(
    (user.phone ?? '').replace(/^\+?549?/, '')
  )
  const [birthDate, setBirthDate] = useState(user.birthDate ?? '')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [ranking,   setRanking]   = useState([])

  useEffect(() => {
    if (!supabaseConfigured) return
    async function loadRanking() {
      const { supabase } = await import('../../lib/supabase.js')
      const { data } = await supabase.rpc('get_ranking')
      setRanking(
        (data ?? []).map(r => ({
          id:     r.user_id,
          name:   r.name,
          exact:  Number(r.exact),
          winner: Number(r.winner),
          pts:    Number(r.pts),
        })).slice(0, 5)
      )
    }
    loadRanking()
  }, [supabaseConfigured])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('El nombre no puede estar vacío.'); return }
    setLoading(true)
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || null
    try {
      const cleanPhone = phone.trim().replace(/\D/g, '')
      const fullPhone = cleanPhone ? `+549${cleanPhone}` : null
      await updateProfile({ name: name.trim(), fullName, phone: fullPhone, birthDate: birthDate || null })
    } catch (err) {
      setError(err.message || 'Error al guardar.')
    } finally {
      setLoading(false)
    }
  }

  const initials = user.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Mi <span>Perfil</span></div>
          <div className="page-sub">Completá tus datos para poder recibir promos y novedades del bar</div>
        </div>
      </div>

      <div className="profile-2col">
        {/* ── Left: form ─────────────────────────────────── */}
        <div className="profile-card">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              {user.avatar ? <img src={user.avatar} alt="" /> : <span>{initials}</span>}
            </div>
            <div className="profile-nick">{user.name}</div>
            <div className="user-badge" style={{ marginTop: 4 }}>{stats?.pts ?? 0} pts</div>
            {user.isAdmin && (
              <span className="result-badge rb-pending" style={{ fontSize: 10, marginTop: 4 }}>
                Administrador
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input
                  className="form-input"
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Juan"
                  maxLength={60}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido</label>
                <input
                  className="form-input"
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="García"
                  maxLength={60}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Nombre para mostrar <span className="form-ref">*</span>
              </label>
              <input
                className="form-input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Apodo o nombre corto"
                maxLength={60}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email <span className="form-ref">*</span></label>
              <input
                className="form-input"
                type="email"
                value={user.email ?? ''}
                readOnly
                style={{ opacity: 0.55, cursor: 'default' }}
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <div style={{ display: 'flex' }}>
                  <span style={{
                    padding: '10px 10px', lineHeight: 1,
                    background: '#f3f3f3',
                    border: '1px solid var(--color-border)',
                    borderRight: 'none',
                    borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
                    fontSize: 14, color: '#888', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center',
                  }}>+549</span>
                  <input
                    className="form-input"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="1168980563"
                    maxLength={12}
                    style={{ borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', flex: 1 }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha de naci.</label>
                <input
                  className="form-input"
                  type="date"
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {error && <div className="form-error" style={{ marginBottom: 10 }}>{error}</div>}

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? <><span className="spin">↻</span> Guardando…</> : 'Guardar cambios'}
            </button>

            <div className="form-footnotes">
              <div><span className="form-ref">*</span> campo obligatorio</div>
            </div>
          </form>
        </div>

        {/* ── Right: stats + ranking ──────────────────────── */}
        <div className="profile-right">
          <div className="profile-mobile-logo">
            <img src="/img/logo.png" alt="Chebra" />
          </div>

          <div className="profile-stats-card">
            <div className="profile-section-title">Mis Estadísticas</div>
            <div className="profile-stats-row">
              <div className="profile-stat">
                <div className="profile-stat-num">{stats?.exact ?? 0}</div>
                <div className="profile-stat-lbl">Exactos</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-num">{stats?.winner ?? 0}</div>
                <div className="profile-stat-lbl">Ganadores</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-num">{stats?.pts ?? 0}</div>
                <div className="profile-stat-lbl">Puntos</div>
              </div>
            </div>
          </div>

          <div className="profile-ranking-card">
            <div className="profile-section-title">Top 5 Ranking</div>
            {ranking.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text3)', padding: '10px 0' }}>
                Sin resultados aún.
              </div>
            ) : ranking.map((r, i) => {
              const isMe = r.id === user?.id
              return (
                <div key={r.id} className={`profile-rank-row${isMe ? ' profile-rank-me' : ''}`}>
                  <div className="profile-rank-pos">{i + 1}</div>
                  <div className="profile-rank-name">{r.name}{isMe ? ' (vos)' : ''}</div>
                  <div className="profile-rank-pts">{r.pts} pts</div>
                </div>
              )
            })}
          </div>

          <button onClick={() => goPage('onboarding')} className="profile-help-btn">
            Cómo jugar
          </button>
        </div>
      </div>

      <div className="profile-mobile-actions">
        <button onClick={logout} className="profile-logout-mobile">
          Cerrar sesión
        </button>
        <button onClick={() => goPage('onboarding')} className="profile-logo-btn">
          <img src="/img/logo.png" alt="Chebra" />
        </button>
      </div>
    </div>
  )
}
