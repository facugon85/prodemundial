import { useEffect } from 'react'

export default function ConfirmDialog({ title, body, confirmLabel = 'Confirmar', danger = false, onConfirm, onCancel }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn 120ms ease',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#2a3b2d',
          border: '1px solid rgba(244,241,224,.12)',
          borderRadius: 12,
          padding: '28px 28px 24px',
          maxWidth: 380,
          width: '100%',
          boxShadow: '0 24px 48px rgba(0,0,0,.6)',
          animation: 'slideUp 150ms ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 17, fontWeight: 600, color: 'rgba(244,241,224,.95)', marginBottom: 10 }}>
          {title}
        </div>
        {body && (
          <div style={{ fontSize: 13, color: 'rgba(244,241,224,.55)', lineHeight: 1.55, marginBottom: 24 }}>
            {body}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: 'transparent', border: '1px solid rgba(244,241,224,.18)',
              color: 'rgba(244,241,224,.6)', cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: danger ? 'rgba(182,59,40,.25)' : '#c45c2e',
              border: danger ? '1px solid rgba(182,59,40,.5)' : '1px solid #c45c2e',
              color: danger ? '#e87060' : '#fff',
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
