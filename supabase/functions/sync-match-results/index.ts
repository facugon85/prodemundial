import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const API_BASE = 'https://api.football-data.org/v4/competitions/WC/matches'

interface ApiScore {
  home: number | null
  away: number | null
}

interface ApiMatch {
  id: number
  status: string
  stage: string
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
    fullTime: ApiScore
    halfTime:  ApiScore
  }
  homeTeam: { id: number; name: string }
  awayTeam: { id: number; name: string }
}

interface DbMatch {
  id: number
  phase: string
  t1: string
  f1: string
  t2: string
  f2: string
  status: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Protección opcional: set CRON_SECRET en Dashboard → Edge Functions → Secrets
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret) {
    const auth = req.headers.get('x-cron-secret')
      ?? req.headers.get('authorization')?.replace('Bearer ', '')
    if (auth !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const token = Deno.env.get('FOOTBALL_DATA_TOKEN')!

  try {
    // Dos requests simultáneos (2 de 10 permitidos por minuto)
    const [finishedRes, liveRes] = await Promise.all([
      fetch(`${API_BASE}?status=FINISHED`, { headers: { 'X-Auth-Token': token } }),
      fetch(`${API_BASE}?status=IN_PLAY`,  { headers: { 'X-Auth-Token': token } }),
    ])

    if (!finishedRes.ok) throw new Error(`API FINISHED ${finishedRes.status}`)
    if (!liveRes.ok)     throw new Error(`API IN_PLAY ${liveRes.status}`)

    const { matches: finished }: { matches: ApiMatch[] } = await finishedRes.json()
    const { matches: live }:     { matches: ApiMatch[] } = await liveRes.json()

    const updated:     number[] = []
    const liveUpdated: number[] = []
    const errors:      string[] = []

    // ── FINISHED: evaluar predicciones y propagar bracket ─────────────────
    for (const g of finished) {
      try {
        const h = g.score.fullTime.home
        const a = g.score.fullTime.away
        if (h === null || a === null) continue

        const { data: match, error: findErr } = await supabase
          .from('matches')
          .select('id, phase, t1, f1, t2, f2, status')
          .eq('external_id', g.id)
          .single<DbMatch>()

        if (findErr || !match) continue
        if (match.status === 'synced') continue

        const isKO = match.phase !== 'group'

        // En KO, score.winner indica quién ganó (incluyendo AT/penales)
        const advancer: string | null = isKO
          ? (g.score.winner === 'HOME_TEAM' ? 'home' : 'away')
          : null

        // 1. Escribir resultado — result_h/result_a son los operacionales para la RPC;
        //    home_score/away_score son espejo informativo de la API.
        const { error: updErr } = await supabase
          .from('matches')
          .update({
            result_h:   h,
            result_a:   a,
            home_score: h,
            away_score: a,
            api_status: 'FINISHED',
            winner:     g.score.winner,
            advancer,
          })
          .eq('id', match.id)
          .neq('status', 'synced')

        if (updErr) { errors.push(`#${match.id} update: ${updErr.message}`); continue }

        // 2. Evaluar predicciones y generar premios
        const { error: rpcErr } = await supabase.rpc('process_match_result', { p_match_id: match.id })
        if (rpcErr) { errors.push(`#${match.id} rpc: ${rpcErr.message}`); continue }

        // 3. Propagar bracket en fases KO
        if (isKO && advancer) {
          const { error: bracketErr } = await supabase.rpc('propagate_bracket', { p_match_id: match.id })
          if (bracketErr) errors.push(`#${match.id} bracket: ${bracketErr.message}`)
        }

        updated.push(match.id)
      } catch (err) {
        errors.push(`API ${g.id} FINISHED: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // ── IN_PLAY / PAUSED: actualizar score parcial, sin evaluar predicciones ─
    for (const g of live) {
      try {
        // Usa fullTime si ya hay datos, si no halfTime (PAUSED en el descanso)
        const h = g.score.fullTime.home ?? g.score.halfTime.home
        const a = g.score.fullTime.away ?? g.score.halfTime.away

        const { error: updErr } = await supabase
          .from('matches')
          .update({
            home_score: h,
            away_score: a,
            api_status: g.status,
          })
          .eq('external_id', g.id)
          .neq('status', 'synced')

        if (updErr) errors.push(`API ${g.id} LIVE: ${updErr.message}`)
        else liveUpdated.push(g.id)
      } catch (err) {
        errors.push(`API ${g.id} LIVE: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return new Response(
      JSON.stringify({
        updated:   updated.length,
        match_ids: updated,
        live:      liveUpdated.length,
        errors,
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
