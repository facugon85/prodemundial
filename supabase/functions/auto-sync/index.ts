import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EN_TO_ES: Record<string, string> = {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Optional cron secret: set CRON_SECRET in Supabase Dashboard → Edge Functions → Secrets
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret) {
    const authHeader = req.headers.get('x-cron-secret') ?? req.headers.get('authorization')?.replace('Bearer ', '')
    if (authHeader !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    // Fetch external API
    const apiRes = await fetch('https://worldcup26.ir/get/games')
    if (!apiRes.ok) throw new Error(`API HTTP ${apiRes.status}`)
    const { games } = await apiRes.json()

    // Get our unsynced, non-locked matches
    const { data: dbMatches, error: dbErr } = await supabase
      .from('matches')
      .select('id, t1, t2, f1, f2, status, phase')
      .not('status', 'eq', 'synced')
      .not('status', 'eq', 'locked')

    if (dbErr) throw new Error(dbErr.message)

    // Build index by team pair in Spanish
    const byTeams: Record<string, { id: number; t1: string; f1: string; t2: string; f2: string; phase: string }> = {}
    for (const m of dbMatches ?? []) {
      if (m.t1 && m.t1 !== 'Por definir') byTeams[`${m.t1}|${m.t2}`] = m
    }

    const synced: number[] = []
    const errors: string[] = []

    for (const g of games) {
      if (g.finished !== 'TRUE') continue

      const home = EN_TO_ES[g.home_team_name_en]
      const away = EN_TO_ES[g.away_team_name_en]
      if (!home || !away) continue

      const match = byTeams[`${home}|${away}`]
      if (!match) continue

      const h = parseInt(g.home_score, 10)
      const a = parseInt(g.away_score, 10)
      if (isNaN(h) || isNaN(a)) continue

      const advancer: string | null = match.phase !== 'group' ? (h >= a ? 'home' : 'away') : null

      // 1. Mark match as synced with result
      const { error: updErr } = await supabase
        .from('matches')
        .update({ status: 'synced', result_h: h, result_a: a, advancer })
        .eq('id', match.id)
        .neq('status', 'synced')

      if (updErr) { errors.push(`#${match.id} update: ${updErr.message}`); continue }

      // 2. Evaluate predictions & generate prizes
      const { error: rpcErr } = await supabase.rpc('process_match_result', { p_match_id: match.id })
      if (rpcErr) errors.push(`#${match.id} rpc: ${rpcErr.message}`)

      // 3. Propagate bracket for KO matches (lógica centralizada en SQL)
      if (match.phase !== 'group' && advancer) {
        const { error: bracketErr } = await supabase.rpc('propagate_bracket', { p_match_id: match.id })
        if (bracketErr) errors.push(`#${match.id} bracket: ${bracketErr.message}`)
      }

      synced.push(match.id)
    }

    return new Response(
      JSON.stringify({ synced: synced.length, match_ids: synced, errors }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
