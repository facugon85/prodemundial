import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import * as db from '../lib/db.js'
import { FIXTURE } from '../data/fixture.js'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

// ── helpers ──────────────────────────────────────────────────

function genCode(type) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let c = ''
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)]
  return `WC26-${type === 'exact' ? 'EXACT' : 'WIN'}-${c}`
}

// advancer: 'home' | 'away' | null (null = grupo, no hay alargue/penales)
function evalPred(pred, real, advancer = null) {
  if (pred.h === real.h && pred.a === real.a) return 'exact'
  if (advancer) {
    // Eliminatoria: "ganador" = adivinar quien avanza
    const pw = pred.h > pred.a ? 'home' : pred.h < pred.a ? 'away' : null
    return pw === advancer ? 'winner' : 'miss'
  }
  // Fase de grupos: ganador por marcador
  const pw = pred.h > pred.a ? 'home' : pred.h < pred.a ? 'away' : 'draw'
  const rw = real.h > real.a ? 'home' : real.h < real.a ? 'away' : 'draw'
  return pw === rw ? 'winner' : 'miss'
}

function applyStates(baseMatches, states) {
  return baseMatches.map(m => {
    const s = states[m.id]
    if (!s) return m
    return {
      ...m,
      status: s.status,
      result: s.result,
      ...(s.t1 ? { t1: s.t1, f1: s.f1, t2: s.t2, f2: s.f2 } : {}),
      ...(s.date ? { date: s.date } : {}),
      ...(s.time ? { time: s.time } : {}),
    }
  })
}

// ── Bracket progression map ──────────────────────────────────
// For each KO match: winner goes to next.next/slot, loser (SF only) goes to 3rd place
const BRACKET_NEXT = {
  73:{next:89,slot:'home'}, 74:{next:89,slot:'away'},
  75:{next:90,slot:'home'}, 76:{next:90,slot:'away'},
  77:{next:91,slot:'home'}, 78:{next:91,slot:'away'},
  79:{next:92,slot:'home'}, 80:{next:92,slot:'away'},
  81:{next:93,slot:'home'}, 82:{next:93,slot:'away'},
  83:{next:94,slot:'home'}, 84:{next:94,slot:'away'},
  85:{next:95,slot:'home'}, 86:{next:95,slot:'away'},
  87:{next:96,slot:'home'}, 88:{next:96,slot:'away'},
  89:{next:97,slot:'home'}, 90:{next:97,slot:'away'},
  91:{next:98,slot:'home'}, 92:{next:98,slot:'away'},
  93:{next:99,slot:'home'}, 94:{next:99,slot:'away'},
  95:{next:100,slot:'home'},96:{next:100,slot:'away'},
  97:{next:101,slot:'home'},98:{next:101,slot:'away'},
  99:{next:102,slot:'home'},100:{next:102,slot:'away'},
  101:{next:104,slot:'home',loser:{next:103,slot:'home'}},
  102:{next:104,slot:'away',loser:{next:103,slot:'away'}},
}

// ── Group standings ───────────────────────────────────────────

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

function calcStandings(matches) {
  const map = {}
  for (const m of matches.filter(x => x.phase === 'group')) {
    for (const [name, flag] of [[m.t1, m.f1],[m.t2, m.f2]]) {
      const k = `${m.group}:${name}`
      map[k] ??= { group: m.group, name, flag, pts:0, pj:0, gf:0, gc:0 }
    }
    if (m.status === 'synced' && m.result) {
      const { h, a } = m.result
      const k1 = `${m.group}:${m.t1}`, k2 = `${m.group}:${m.t2}`
      map[k1].pj++; map[k2].pj++
      map[k1].gf += h; map[k1].gc += a
      map[k2].gf += a; map[k2].gc += h
      if (h > a)      { map[k1].pts += 3 }
      else if (h < a) { map[k2].pts += 3 }
      else            { map[k1].pts += 1; map[k2].pts += 1 }
    }
  }
  const sortFn = (a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    const gda = a.gf - a.gc, gdb = b.gf - b.gc
    if (gdb !== gda) return gdb - gda
    return b.gf - a.gf
  }
  const byGroup = {}
  for (const g of GROUPS) {
    byGroup[g] = Object.values(map).filter(t => t.group === g).sort(sortFn)
  }
  return byGroup
}

function buildBracket(byGroup) {
  // R32 match IDs 73-84: winner[i] vs runner-up[(i+3)%12]
  // R32 match IDs 85-88: best 8 third-place teams (seeded 1-8)
  const assignments = {}
  for (let i = 0; i < 12; i++) {
    const w = byGroup[GROUPS[i]]?.[0]
    const r = byGroup[GROUPS[(i + 3) % 12]]?.[1]
    if (w && r) assignments[73 + i] = { t1: w.name, f1: w.flag, t2: r.name, f2: r.flag }
  }
  const thirds = GROUPS
    .map(g => byGroup[g]?.[2]).filter(Boolean)
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      const gda = a.gf - a.gc, gdb = b.gf - b.gc
      if (gdb !== gda) return gdb - gda
      return b.gf - a.gf
    }).slice(0, 8)
  const pairs = [[0,7],[1,6],[2,5],[3,4]]
  for (let i = 0; i < 4; i++) {
    const t1 = thirds[pairs[i][0]], t2 = thirds[pairs[i][1]]
    if (t1 && t2) assignments[85 + i] = { t1: t1.name, f1: t1.flag, t2: t2.name, f2: t2.flag }
  }
  return assignments
}

function computeStats(history) {
  const exact = history.filter(h => h.result === 'exact').length
  const winner = history.filter(h => h.result === 'winner').length
  return { exact, winner, pts: exact * 10 + winner * 5 }
}

// ── provider ─────────────────────────────────────────────────

export function AppProvider({ children }) {
  const [user, setUser]           = useState(null)
  const [authLoading, setAuthLoading] = useState(supabaseConfigured)
  const [page, setPage]           = useState('predecir')
  const [matches, setMatches]     = useState(FIXTURE)
  const [predictions, setPreds]   = useState({})
  const [prizes, setPrizes]       = useState([])
  const [history, setHistory]     = useState([])
  const [notifs, setNotifs]       = useState([])
  const [prizeConfig, setPrizeConfig] = useState(db.getPrizeConfig())
  const [syncLog, setSyncLog]     = useState([
    { time: '—', type: 'info', msg: 'Sistema listo. Conectado a API-Football.' },
  ])
  const notifId = useRef(0)

  // ── auth ────────────────────────────────────────────────────

  useEffect(() => {
    if (!supabaseConfigured) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const u = await resolveAdmin(buildUser(session.user))
        db.registerUser(u)
        setUser(u)
        if (u.isAdmin) setPage('admin')
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setPreds({})
        setPrizes([])
        setHistory([])
        setPage('predecir')
      } else {
        setUser(null)
      }
      if (event === 'INITIAL_SESSION') setAuthLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load public match data on mount so pre-login screens show correct times
  useEffect(() => {
    if (!supabaseConfigured) return
    supabase
      .from('matches')
      .select('id, status, result_h, result_a, advancer, t1, f1, t2, f2, date, time')
      .then(({ data: matchRows }) => {
        if (!matchRows) return
        const states = {}
        for (const m of matchRows) {
          states[m.id] = {
            status: m.status,
            result: m.result_h !== null ? { h: m.result_h, a: m.result_a, advancer: m.advancer } : null,
            ...(m.t1 && m.t1 !== 'Por definir' ? { t1: m.t1, f1: m.f1, t2: m.t2, f2: m.f2 } : {}),
            ...(m.date ? { date: m.date } : {}),
            ...(m.time ? { time: m.time } : {}),
          }
        }
        setMatches(applyStates(FIXTURE, states))
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function buildUser(u) {
    return {
      id: u.id,
      name: u.user_metadata?.full_name || u.email.split('@')[0],
      email: u.email,
      avatar: u.user_metadata?.avatar_url || null,
      phone: null,
      isAdmin: false,
    }
  }

  // Carga is_admin + phone desde la tabla profiles; upserta el perfil si es nuevo
  async function resolveAdmin(baseUser) {
    if (!supabaseConfigured) return baseUser
    try {
      // Upsert + select en un solo round-trip
      const { data } = await supabase
        .from('profiles')
        .upsert({
          id:           baseUser.id,
          email:        baseUser.email,
          display_name: baseUser.name,
          avatar_url:   baseUser.avatar,
        }, { onConflict: 'id' })
        .select('is_admin, phone, display_name, full_name, birth_date, email, onboarding_completed')
        .maybeSingle()
      return {
        ...baseUser,
        isAdmin:              data?.is_admin             === true,
        phone:                data?.phone                ?? null,
        name:                 data?.display_name         || baseUser.name,
        fullName:             data?.full_name            ?? null,
        birthDate:            data?.birth_date           ?? null,
        email:                data?.email                || baseUser.email,
        onboardingCompleted:  data?.onboarding_completed ?? false,
      }
    } catch {
      return { ...baseUser, isAdmin: false }
    }
  }

  // ── load user data ───────────────────────────────────────────

  async function loadAll() {
    if (!user) return
    {
      if (supabaseConfigured) {
        // ── Match states (fuente de verdad: Supabase) ──
        const { data: matchRows } = await supabase
          .from('matches')
          .select('id, status, result_h, result_a, advancer, t1, f1, t2, f2, date, time')
        if (matchRows) {
          const states = {}
          for (const m of matchRows) {
            states[m.id] = {
              status: m.status,
              result: m.result_h !== null
                ? { h: m.result_h, a: m.result_a, advancer: m.advancer }
                : null,
              ...(m.t1 && m.t1 !== 'Por definir' ? { t1: m.t1, f1: m.f1, t2: m.t2, f2: m.f2 } : {}),
              ...(m.date ? { date: m.date } : {}),
              ...(m.time ? { time: m.time } : {}),
            }
          }
          // Backfill next-round teams for synced KO matches where they weren't propagated
          const toFix = []
          for (const m of matchRows) {
            const prog = BRACKET_NEXT[m.id]
            if (!prog || m.status !== 'synced' || !m.advancer) continue
            for (const { next, slot, team } of [
              { next: prog.next, slot: prog.slot,
                team: m.advancer === 'home' ? { t: m.t1, f: m.f1 } : { t: m.t2, f: m.f2 } },
              ...(prog.loser ? [{ next: prog.loser.next, slot: prog.loser.slot,
                team: m.advancer === 'home' ? { t: m.t2, f: m.f2 } : { t: m.t1, f: m.f1 } }] : []),
            ]) {
              const nx = states[next] ?? {}
              const missing = slot === 'home' ? (!nx.t1 || nx.t1 === 'Por definir') : (!nx.t2 || nx.t2 === 'Por definir')
              if (missing) {
                const upd = slot === 'home' ? { t1: team.t, f1: team.f } : { t2: team.t, f2: team.f }
                states[next] = { ...nx, ...upd }
                toFix.push({ id: next, upd })
              }
            }
          }
          setMatches(applyStates(FIXTURE, states))
          // Write missing teams back to Supabase (best-effort, no await chain)
          for (const { id, upd } of toFix)
            supabase.from('matches').update(upd).eq('id', id)
        }

        // ── Predicciones del usuario ──
        const { data: predRows } = await supabase
          .from('predictions')
          .select('match_id, pred_h, pred_a')
          .eq('user_id', user.id)
        const preds = {}
        for (const p of predRows ?? []) {
          preds[p.match_id] = { h: p.pred_h, a: p.pred_a, saved: true }
        }
        setPreds(preds)

        // ── Premios del usuario ──
        const { data: prizeRows } = await supabase
          .from('prizes')
          .select('id, type, code, redeemed, created_at, match_id, matches(t1, f1, t2, f2, result_h, result_a)')
          .eq('user_id', user.id)
        setPrizes((prizeRows ?? []).map(p => ({
          id:        p.id,
          userId:    user.id,
          type:      p.type,
          code:      p.code,
          redeemed:  p.redeemed,
          createdAt: p.created_at,
          match:     p.matches
            ? `${p.matches.f1} ${p.matches.t1} ${p.matches.result_h}–${p.matches.result_a} ${p.matches.t2} ${p.matches.f2}`
            : '',
        })))

        // ── Historial (predicciones con resultado) ──
        const { data: histRows } = await supabase
          .from('predictions')
          .select('match_id, pred_h, pred_a, result, matches(round, date, t1, f1, t2, f2, result_h, result_a)')
          .eq('user_id', user.id)
          .not('result', 'is', null)
        setHistory((histRows ?? []).map(p => ({
          matchId: p.match_id,
          round:   p.matches?.round ?? '',
          date:    p.matches?.date  ?? '',
          t1: p.matches?.t1 ?? '', f1: p.matches?.f1 ?? '',
          t2: p.matches?.t2 ?? '', f2: p.matches?.f2 ?? '',
          pred:   { h: p.pred_h, a: p.pred_a },
          real:   { h: p.matches?.result_h, a: p.matches?.result_a },
          result: p.result,
        })))

        // ── Prize config ──
        const { data: settingsRow } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'prize_config')
          .maybeSingle()
        if (settingsRow?.value) setPrizeConfig(settingsRow.value)

      } else {
        // ── Fallback localStorage ──
        setPreds(db.getPredictions(user.id))
        setPrizes(db.getPrizes(user.id))
        setHistory(db.getHistory(user.id))
        setMatches(applyStates(FIXTURE, db.getMatchStates()))
        setPrizeConfig(db.getPrizeConfig())
      }
    }
  }

  useEffect(() => { loadAll() }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── notifications ───────────────────────────────────────────

  const addNotif = useCallback((type, title, body) => {
    const id = ++notifId.current
    setNotifs(n => [...n, { id, type, title, body, hiding: false }])
    setTimeout(() => setNotifs(n => n.map(x => x.id === id ? { ...x, hiding: true } : x)), 4000)
    setTimeout(() => setNotifs(n => n.filter(x => x.id !== id)), 4500)
  }, [])

  function addLog(type, msg) {
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    setSyncLog(l => [{ time, type, msg }, ...l].slice(0, 20))
  }

  // ── auth actions ────────────────────────────────────────────

  async function loginWithGoogle() {
    if (!supabaseConfigured) return addNotif('error', '⚠️ Sin configurar', 'Agregá las credenciales de Supabase en .env.local')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) addNotif('error', '❌ Error Google', error.message)
  }

  async function loginWithFacebook() {
    if (!supabaseConfigured) return addNotif('error', '⚠️ Sin configurar', 'Agregá las credenciales de Supabase en .env.local')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: window.location.origin },
    })
    if (error) addNotif('error', '❌ Error Facebook', error.message)
  }

  async function updateProfile({ name, fullName, phone, birthDate }) {
    const updated = { ...user, name, fullName: fullName ?? user.fullName, phone, birthDate: birthDate ?? user.birthDate }
    if (supabaseConfigured) {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: name, full_name: fullName ?? null, phone, birth_date: birthDate ?? null })
        .eq('id', user.id)
      if (error) throw error
    }
    db.registerUser(updated)
    setUser(updated)
    addNotif('success', '✓ Perfil actualizado', 'Tus datos fueron guardados.')
  }

  async function completeOnboarding() {
    if (supabaseConfigured && !user?.onboardingCompleted) {
      await supabase.from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)
      setUser(prev => ({ ...prev, onboardingCompleted: true }))
    }
    goPage('predecir')
  }

  async function loginWithEmail(email, password, isRegister = false) {
    if (!supabaseConfigured) throw new Error('Supabase no configurado')
    if (isRegister) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      // Si no hay sesión, Supabase requiere confirmación por email
      if (!data.session) return { needsConfirmation: true }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    }
  }

  function loginDemo(role) {
    const u = {
      id: `demo-${role}`,
      name: role === 'admin' ? 'Admin Demo' : 'Usuario Demo',
      email: role === 'admin' ? 'admin@demo.com' : 'user@demo.com',
      avatar: null,
      isAdmin: role === 'admin',
    }
    db.registerUser(u)
    setUser(u)
    if (u.isAdmin) setPage('admin')
  }

  async function logout() {
    // Limpiar estado local inmediatamente para que la UI responda sin esperar a Supabase
    setUser(null)
    setPreds({})
    setPrizes([])
    setHistory([])
    setPage('predecir')
    if (supabaseConfigured) {
      await supabase.auth.signOut()
    }
  }

  // ── navigation ──────────────────────────────────────────────

  function goPage(p) { setPage(p) }

  // ── predictions ─────────────────────────────────────────────

  async function savePrediction(matchId, h, a) {
    db.savePrediction(user.id, matchId, h, a)
    setPreds(prev => ({ ...prev, [matchId]: { h, a, saved: true } }))
    const m = matches.find(x => x.id === matchId)
    addNotif('success', '✓ Predicción guardada', `${m.t1} ${h}–${a} ${m.t2} · Bloqueada.`)
    if (supabaseConfigured) {
      const { error } = await supabase
        .from('predictions')
        .upsert({ user_id: user.id, match_id: matchId, pred_h: h, pred_a: a }, { onConflict: 'user_id,match_id' })
      if (error) addNotif('error', '⚠️ Error al guardar', error.message)
    }
  }

  // ── admin: bracket ───────────────────────────────────────────

  const standings = calcStandings(matches)

  async function applyBracket() {
    const assignments = buildBracket(standings)
    if (Object.keys(assignments).length === 0) {
      addNotif('error', '⚠️ Sin datos', 'No hay suficientes resultados de grupos para armar el cuadro.')
      return
    }
    for (const [idStr, teams] of Object.entries(assignments)) {
      const matchId = parseInt(idStr)
      if (!supabaseConfigured) db.updateMatchTeams(matchId, teams.t1, teams.f1, teams.t2, teams.f2)
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, ...teams, status: 'open' } : m))
      if (supabaseConfigured) {
        await supabase.from('matches').update({ ...teams, status: 'open' }).eq('id', matchId)
      }
    }
    addNotif('success', '✓ Cuadro generado', `${Object.keys(assignments).length} partidos de octavos asignados.`)
    addLog('ok', 'Fase de llaves generada automáticamente')
  }

  // Auto-generar bracket cuando se sincronizan todos los partidos de grupos
  const bracketApplying = useRef(false)
  useEffect(() => {
    const groupMatches = matches.filter(m => m.phase === 'group')
    if (groupMatches.length < 72) return
    const allSynced      = groupMatches.every(m => m.status === 'synced')
    const r32NotAssigned = matches.filter(m => m.phase === 'r32').every(m => !m.t1 || m.t1 === 'Por definir')
    if (allSynced && r32NotAssigned && !bracketApplying.current) {
      bracketApplying.current = true
      applyBracket().finally(() => { bracketApplying.current = false })
    }
  }, [matches]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── admin: match management ──────────────────────────────────

  async function closeMatch(matchId) {
    const m = matches.find(x => x.id === matchId)
    if (!m || m.status !== 'open') return
    db.updateMatchState(matchId, 'pending')
    setMatches(prev => prev.map(x => x.id === matchId ? { ...x, status: 'pending' } : x))
    addLog('warn', `Apuestas cerradas — ${m.t1} vs ${m.t2}`)
    addNotif('info', '🔒 Apuestas cerradas', `${m.t1} vs ${m.t2}`)
    if (supabaseConfigured) {
      await supabase.from('matches').update({ status: 'pending' }).eq('id', matchId)
    }
  }

  // advancer: 'home' | 'away' | null  (null en fase de grupos)
  function saveManualResult(matchId, h, a, advancer = null) {
    _processResult(matchId, { h, a, advancer }, 'manual')
  }

  function simulateSync(matchId) {
    const m = matches.find(x => x.id === matchId)
    if (!m || m.status === 'synced') return
    addLog('info', `Consultando API-Football — ${m.t1} vs ${m.t2}…`)

    // Optimistically show syncing state
    setMatches(prev => prev.map(x => x.id === matchId ? { ...x, _syncing: true } : x))

    setTimeout(() => {
      const result = m._autoResult || { h: Math.floor(Math.random() * 4), a: Math.floor(Math.random() * 4) }
      _processResult(matchId, result, 'auto')
    }, 2200)
  }

  function simulateAllPending() {
    const pending = matches.filter(m => m.status === 'pending')
    if (!pending.length) { addNotif('info', 'ℹ️ Sin pendientes', 'Todos los partidos ya están sincronizados.'); return }
    pending.forEach((m, i) => setTimeout(() => simulateSync(m.id), i * 1000))
  }

  async function _processResult(matchId, result, source) {
    const m = matches.find(x => x.id === matchId)
    const pred = predictions[matchId]
    const advancer = result.advancer ?? null
    const outcome = pred?.saved ? evalPred(pred, result, advancer) : 'miss'

    const advancerLabel = advancer === 'home' ? m.t1 : advancer === 'away' ? m.t2 : null
    const scoreLabel    = `${result.h}–${result.a}${advancerLabel ? ` (avanza ${advancerLabel})` : ''}`

    // Persist match state locally (only when Supabase is not configured)
    if (!supabaseConfigured) db.updateMatchState(matchId, 'synced', result)

    // Persist history entry locally
    const histEntry = {
      matchId, round: m.round, date: m.date,
      t1: m.t1, f1: m.f1, t2: m.t2, f2: m.f2,
      pred: pred ?? { h: '?', a: '?' },
      real: result, result: outcome,
    }
    db.addHistory(user.id, histEntry)
    setHistory(prev => [...prev.filter(e => e.matchId !== matchId), histEntry])

    // Persist result + prizes in Supabase (server-side RPC handles all users)
    if (supabaseConfigured) {
      const { error: errResult } = await supabase
        .from('matches')
        .update({ status: 'synced', result_h: result.h, result_a: result.a, advancer })
        .eq('id', matchId)
      if (errResult) addLog('error', `Error actualizando partido en Supabase: ${errResult.message}`)

      const { error: errPrize } = await supabase
        .rpc('process_match_result', { p_match_id: matchId })
      if (errPrize) addLog('error', `Error generando premios en Supabase: ${errPrize.message}`)

      // Reload prizes from Supabase so the player sees the real server-generated code
      if (outcome === 'exact') {
        const { data: freshPrizes } = await supabase
          .from('prizes')
          .select('id, type, code, redeemed, created_at, match_id, matches(t1, f1, t2, f2, result_h, result_a)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        if (freshPrizes) {
          const mapped = freshPrizes.map(p => ({
            id: p.id, userId: user.id, type: p.type, code: p.code, redeemed: p.redeemed,
            createdAt: p.created_at,
            match: p.matches
              ? `${p.matches.f1} ${p.matches.t1} ${p.matches.result_h}–${p.matches.result_a} ${p.matches.t2} ${p.matches.f2}`
              : '',
          }))
          setPrizes(mapped)
          const newPrize = mapped.find(p => p.type === 'exact' && p.match?.includes(m.t1))
          const realCode = newPrize?.code ?? '—'
          addNotif('prize', '🎯 Resultado exacto!', `${m.t1} ${scoreLabel} ${m.t2} · Código: ${realCode}`)
          addLog('ok', `${m.t1} ${scoreLabel} ${m.t2} — Premio exacto 🎯 → ${realCode}`)
        }
      } else if (outcome === 'winner') {
        addNotif('prize', '✅ Ganador correcto!', `${m.t1} ${scoreLabel} ${m.t2} · +5 pts`)
        addLog('ok', `${m.t1} ${scoreLabel} ${m.t2} — Ganador correcto (+5 pts, sin cupón)`)
      } else {
        addLog('info', `${m.t1} ${scoreLabel} ${m.t2} — sin premio`)
        addNotif('info', '😔 Sin premio esta vez', `${m.t1} ${scoreLabel} ${m.t2}`)
      }
    } else {
      // localStorage fallback: generate code locally (solo exacto genera cupón)
      if (outcome === 'exact') {
        const code = genCode(outcome)
        const prize = {
          id: Date.now(), userId: user.id, type: outcome,
          match: `${m.f1} ${m.t1} ${scoreLabel} ${m.t2} ${m.f2}`,
          code, redeemed: false,
        }
        db.addPrize(prize)
        setPrizes(prev => [...prev, prize])
        addNotif('prize', '🎯 Resultado exacto!', `${m.t1} ${scoreLabel} ${m.t2} · Código: ${code}`)
        addLog('ok', `${m.t1} ${scoreLabel} ${m.t2} — Premio exacto 🎯 → ${code}`)
      } else if (outcome === 'winner') {
        addNotif('prize', '✅ Ganador correcto!', `${m.t1} ${scoreLabel} ${m.t2} · +5 pts`)
        addLog('ok', `${m.t1} ${scoreLabel} ${m.t2} — Ganador correcto (+5 pts, sin cupón)`)
      } else {
        addLog('info', `${m.t1} ${scoreLabel} ${m.t2} — sin premio`)
        addNotif('info', '😔 Sin premio esta vez', `${m.t1} ${scoreLabel} ${m.t2}`)
      }
    }

    addLog('ok', `Evaluación completada vía ${source === 'auto' ? 'API (auto)' : 'admin (manual)'}`)

    // Auto-derive advancer for KO matches when score is decisive
    const effAdv = advancer
      ?? (m.phase !== 'group' && result.h !== result.a
          ? (result.h > result.a ? 'home' : 'away')
          : null)

    // Update match state (advancer at top-level so bracket can read it)
    setMatches(prev => prev.map(x =>
      x.id === matchId ? { ...x, status: 'synced', result, advancer: effAdv, _syncing: false } : x
    ))

    // Propagate winner (and loser for semis) to next KO match
    const prog = BRACKET_NEXT[matchId]
    if (prog && effAdv) {
      const winner = effAdv === 'home' ? { t: m.t1, f: m.f1 } : { t: m.t2, f: m.f2 }
      const loser  = effAdv === 'home' ? { t: m.t2, f: m.f2 } : { t: m.t1, f: m.f1 }

      const propagate = async (targetId, slot, team) => {
        const nx = matches.find(x => x.id === targetId)
        if (!nx) return
        const upd = slot === 'home' ? { t1: team.t, f1: team.f } : { t2: team.t, f2: team.f }
        const newT1 = slot === 'home' ? team.t : nx.t1
        const newT2 = slot === 'away' ? team.t : nx.t2
        const open  = newT1 && newT1 !== 'Por definir' && newT2 && newT2 !== 'Por definir'
        if (open) upd.status = 'open'
        setMatches(prev => prev.map(x => x.id === targetId ? { ...x, ...upd } : x))
        db.updateMatchTeams?.(targetId, newT1, slot === 'home' ? team.f : nx.f1,
                                        newT2, slot === 'away' ? team.f : nx.f2)
        if (supabaseConfigured)
          await supabase.from('matches').update(upd).eq('id', targetId)
      }

      await propagate(prog.next, prog.slot, winner)
      if (prog.loser) await propagate(prog.loser.next, prog.loser.slot, loser)
    }
  }

  // ── prize redemption ────────────────────────────────────────

  async function redeemCode(code) {
    if (supabaseConfigured) {
      // Supabase is source of truth — update directly, no localStorage check
      const { data, error } = await supabase
        .from('prizes')
        .update({ redeemed: true, redeemed_at: new Date().toISOString() })
        .eq('code', code)
        .eq('redeemed', false)
        .select('id')
      if (error || !data?.length) return false
      setPrizes(prev => prev.map(p => p.code === code ? { ...p, redeemed: true } : p))
      db.redeemPrize(code) // best-effort localStorage sync
      return true
    }
    // localStorage fallback
    const ok = db.redeemPrize(code)
    if (!ok) return false
    setPrizes(prev => prev.map(p => p.code === code ? { ...p, redeemed: true } : p))
    return true
  }

  // ── admin: revert finalized match ───────────────────────────

  async function revertMatch(matchId) {
    // localStorage
    db.updateMatchState(matchId, 'open', null)

    // React state
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status: 'open', result: null } : m))
    setHistory(prev => prev.filter(e => e.matchId !== matchId))
    setPrizes(prev => prev.filter(p => {
      // Remove prizes linked to this match (local prizes use match string, not matchId)
      // Best effort: keep prizes not associated with this matchId
      return p.matchId !== matchId
    }))

    if (supabaseConfigured) {
      // Reset match in Supabase
      await supabase
        .from('matches')
        .update({ status: 'open', result_h: null, result_a: null, advancer: null })
        .eq('id', matchId)
      // Clear prediction results so they can be re-evaluated
      await supabase
        .from('predictions')
        .update({ result: null })
        .eq('match_id', matchId)
      // Delete prizes for this match
      await supabase
        .from('prizes')
        .delete()
        .eq('match_id', matchId)
    }

    const m = matches.find(x => x.id === matchId)
    addLog('warn', `Resultado revertido — ${m?.t1} vs ${m?.t2}`)
    addNotif('info', '↩ Partido revertido', `${m?.t1} vs ${m?.t2} volvió a estado abierto.`)
  }

  // ── admin: reset match predictions ─────────────────────────

  async function resetMatchPredictions(matchId) {
    if (supabaseConfigured) {
      await supabase.from('predictions').delete().eq('match_id', matchId)
      await supabase.from('matches').update({ status: 'open', result_h: null, result_a: null }).eq('id', matchId)
    }
    db.updateMatchState(matchId, 'open', null)
    setPreds(prev => { const n = { ...prev }; delete n[matchId]; return n })
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status: 'open', result: null } : m))
    addLog('warn', `Predicciones del partido #${matchId} eliminadas`)
    addNotif('info', '🗑 Predicciones eliminadas', `Partido #${matchId} reseteado.`)
  }

  // ── simulate full group stage ────────────────────────────────

  async function simulateGroupStage() {
    const targets = matches.filter(
      m => m.phase === 'group' && (m.status === 'open' || m.status === 'pending')
    )
    if (!targets.length) {
      addNotif('info', 'ℹ️ Grupos ya completos', 'Todos los partidos de grupos tienen resultado.')
      return
    }

    function rand() { return Math.floor(Math.random() * 4) }
    const results = targets.map(m => ({ id: m.id, h: rand(), a: rand() }))

    // Update local state immediately so standings recalculate
    setMatches(prev => prev.map(m => {
      const r = results.find(x => x.id === m.id)
      return r ? { ...m, status: 'synced', result: { h: r.h, a: r.a } } : m
    }))

    results.forEach(r => db.updateMatchState(r.id, 'synced', { h: r.h, a: r.a }))

    addNotif('ok', '⚽ Grupos simulados', `${results.length} partidos finalizados. Ya podés generar el cuadro.`)
    addLog('ok', `Simulación grupos: ${results.length} partidos`)

    if (!supabaseConfigured) return

    // Batch-update matches in Supabase
    const { error } = await supabase.from('matches').upsert(
      results.map(r => ({ id: r.id, status: 'synced', result_h: r.h, result_a: r.a, advancer: null }))
    )
    if (error) { addLog('error', `Supabase upsert error: ${error.message}`); return }

    // Process prizes in parallel (best-effort)
    const rpcs = await Promise.allSettled(
      results.map(r => supabase.rpc('process_match_result', { p_match_id: r.id }))
    )
    const errs = rpcs.filter(r => r.status === 'rejected' || r.value?.error).length
    if (errs) addLog('warn', `${errs} errores al procesar premios en Supabase`)
    else addLog('ok', 'Premios de simulación procesados en Supabase')
  }

  // ── revert full group stage ──────────────────────────────────

  async function revertGroupStage() {
    const TBD = { t1: 'Por definir', f1: '🏳️', t2: 'Por definir', f2: '🏳️' }

    // Reset local state: group → open, knockout → locked+TBD
    setMatches(prev => prev.map(m => {
      if (m.phase === 'group')
        return { ...m, status: 'open', result: null }
      if (['r32','r16','qf','sf','3rd','final'].includes(m.phase))
        return { ...m, ...TBD, status: 'locked', result: null, advancer: null }
      return m
    }))

    // localStorage: group matches
    const groupIds = matches.filter(m => m.phase === 'group').map(m => m.id)
    groupIds.forEach(id => db.updateMatchState(id, 'open', null))

    const koIds = matches
      .filter(m => ['r32','r16','qf','sf','3rd','final'].includes(m.phase))
      .map(m => m.id)
    koIds.forEach(id => {
      db.updateMatchState(id, 'locked', null)
      db.updateMatchTeams?.(id, 'Por definir', '🏳️', 'Por definir', '🏳️')
    })

    addNotif('info', '↩ Grupos revertidos', 'Todos los partidos de grupos volvieron a estado abierto.')
    addLog('warn', 'Revert grupos: estado local limpiado')

    if (!supabaseConfigured) return

    // Supabase: prizes → predictions → matches (group) → matches (KO)
    await supabase.from('prizes')
      .delete()
      .in('prediction_id',
        (await supabase.from('predictions').select('id')
          .in('match_id', groupIds)).data?.map(r => r.id) ?? []
      )

    await supabase.from('predictions')
      .update({ result: null })
      .in('match_id', groupIds)

    await supabase.from('matches')
      .update({ status: 'open', result_h: null, result_a: null, advancer: null })
      .in('id', groupIds)

    await supabase.from('matches')
      .update({ status: 'locked', ...TBD, result_h: null, result_a: null, advancer: null })
      .in('id', koIds)

    addLog('ok', 'Revert grupos: Supabase sincronizado')
  }

  async function revertKnockout() {
    const TBD = { t1: 'Por definir', f1: '🏳️', t2: 'Por definir', f2: '🏳️' }
    const koPhases = ['r32','r16','qf','sf','3rd','final']
    const koIds = matches.filter(m => koPhases.includes(m.phase)).map(m => m.id)

    // React state
    setMatches(prev => prev.map(m =>
      koPhases.includes(m.phase)
        ? { ...m, ...TBD, status: 'locked', result: null, advancer: null }
        : m
    ))

    addNotif('info', '↩ Llaves revertidas', 'El cuadro de eliminatorias volvió a cero.')
    addLog('warn', 'Revert knockout: estado local limpiado')

    if (!supabaseConfigured) return

    // Supabase: prizes → predictions → matches KO
    const { data: predRows } = await supabase
      .from('predictions').select('id').in('match_id', koIds)
    const predIds = predRows?.map(r => r.id) ?? []

    if (predIds.length)
      await supabase.from('prizes').delete().in('prediction_id', predIds)

    await supabase.from('predictions')
      .update({ result: null }).in('match_id', koIds)

    await supabase.from('matches')
      .update({ status: 'locked', ...TBD, result_h: null, result_a: null, advancer: null })
      .in('id', koIds)

    addLog('ok', 'Revert knockout: Supabase sincronizado')
  }

  // ── prize config ────────────────────────────────────────────

  async function updatePrizeConfig(config) {
    setPrizeConfig(config)
    db.savePrizeConfig(config)
    if (supabaseConfigured) {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: config, updated_at: new Date().toISOString() })
        .eq('key', 'prize_config')
      if (error) { addNotif('error', '⚠️ Error al guardar', error.message); return }
    }
    addNotif('success', '✓ Premios actualizados', 'La configuración ya es visible para todos.')
  }

  // ── derived ─────────────────────────────────────────────────

  const stats = computeStats(history)

  const openCount = matches.filter(m => m.status === 'open').length
  const pendingCount = matches.filter(m => m.status === 'pending').length
  const availPrizes = prizes.filter(p => !p.redeemed).length

  // ── value ───────────────────────────────────────────────────

  const value = {
    user, authLoading, page, matches, predictions, prizes, history, notifs, syncLog,
    stats, openCount, pendingCount, availPrizes,
    standings, prizeConfig,
    loginWithGoogle, loginWithFacebook, loginWithEmail, loginDemo, logout,
    goPage, savePrediction,
    closeMatch, saveManualResult, simulateSync, simulateAllPending,
    applyBracket, resetMatchPredictions, revertMatch, simulateGroupStage, revertGroupStage, revertKnockout,
    redeemCode, addNotif, reloadData: loadAll,
    supabaseConfigured, updateProfile, completeOnboarding, updatePrizeConfig,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
