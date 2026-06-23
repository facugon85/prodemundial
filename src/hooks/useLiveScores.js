import { useState, useEffect, useRef } from 'react'

const EN_TO_ES = {
  'Mexico':'México','South Africa':'Sudáfrica','South Korea':'Corea del Sur',
  'Czech Republic':'R. Checa','Canada':'Canadá',
  'Bosnia and Herzegovina':'Bosnia y Herzegovina','United States':'Estados Unidos',
  'Paraguay':'Paraguay','Haiti':'Haití','Scotland':'Escocia','Australia':'Australia',
  'Turkey':'Turquía','Brazil':'Brasil','Morocco':'Marruecos','Qatar':'Qatar',
  'Switzerland':'Suiza','Ivory Coast':'Costa de Marfil','Ecuador':'Ecuador',
  'Germany':'Alemania','Curaçao':'Curazao','Netherlands':'Países Bajos','Japan':'Japón',
  'Sweden':'Suecia','Tunisia':'Túnez','Iran':'Irán','New Zealand':'Nueva Zelanda',
  'Spain':'España','Cape Verde':'Cabo Verde','Belgium':'Bélgica','Egypt':'Egipto',
  'Saudi Arabia':'Arabia Saudita','Uruguay':'Uruguay','France':'Francia',
  'Senegal':'Senegal','Iraq':'Irak','Norway':'Noruega','Argentina':'Argentina',
  'Algeria':'Argelia','Austria':'Austria','Jordan':'Jordania','Portugal':'Portugal',
  'Democratic Republic of the Congo':'RD Congo','Uzbekistan':'Uzbekistán',
  'Colombia':'Colombia','England':'Inglaterra','Croatia':'Croacia',
  'Ghana':'Ghana','Panama':'Panamá',
}

// Returns { [ourMatchId]: { home, away, minute } } for in-progress games
// Polls every 60 seconds. Silent on error.
export function useLiveScores(matches) {
  const [liveScores, setLiveScores] = useState({})
  const matchesRef = useRef(matches)

  useEffect(() => { matchesRef.current = matches }, [matches])

  useEffect(() => {
    let cancelled = false

    async function fetchLive() {
      try {
        const res = await fetch('https://worldcup26.ir/get/games', { cache: 'no-store' })
        if (!res.ok) return
        const { games } = await res.json()

        // Index current matches by ES team pair (excludes TBD teams)
        const byTeams = {}
        for (const m of matchesRef.current) {
          if (m.t1 && m.t1 !== 'Por definir') byTeams[`${m.t1}|${m.t2}`] = m.id
        }

        const live = {}
        for (const g of games) {
          if (g.finished === 'TRUE' || g.time_elapsed === 'notstarted') continue
          const home = EN_TO_ES[g.home_team_name_en]
          const away = EN_TO_ES[g.away_team_name_en]
          if (!home || !away) continue
          const matchId = byTeams[`${home}|${away}`]
          if (!matchId) continue
          live[matchId] = {
            home: parseInt(g.home_score, 10) || 0,
            away: parseInt(g.away_score, 10) || 0,
            minute: g.time_elapsed,
          }
        }

        if (!cancelled) setLiveScores(live)
      } catch {
        // network errors don't break the app
      }
    }

    fetchLive()
    const id = setInterval(fetchLive, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return liveScores
}
