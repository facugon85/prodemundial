import MatchList from '../common/MatchList.jsx'

export default function PredecirPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Próximos <span>Partidos</span></div>
          <div className="page-sub">Predecí antes del pitazo — se bloquea al inicio</div>
        </div>
      </div>
      <MatchList />
    </div>
  )
}
