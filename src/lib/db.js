// Data access layer — localStorage today, Supabase tomorrow.
// Components only talk to AppContext; this file is only imported by AppContext.
// Swap each function body to a Supabase call without touching the callers.

const KEY = 'prode2026'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') }
  catch { return {} }
}

function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

// ── Predictions ──────────────────────────────────────────────
export function getPredictions(userId) {
  return load().predictions?.[userId] ?? {}
}

export function savePrediction(userId, matchId, h, a) {
  const data = load()
  data.predictions ??= {}
  data.predictions[userId] ??= {}
  data.predictions[userId][matchId] = { h, a, saved: true }
  save(data)
}

// ── History ──────────────────────────────────────────────────
export function getHistory(userId) {
  return load().history?.[userId] ?? []
}

export function addHistory(userId, entry) {
  const data = load()
  data.history ??= {}
  data.history[userId] ??= []
  if (!data.history[userId].find(e => e.matchId === entry.matchId)) {
    data.history[userId].push(entry)
  }
  save(data)
}

// ── Prizes ───────────────────────────────────────────────────
export function getPrizes(userId) {
  return (load().prizes ?? []).filter(p => p.userId === userId)
}

export function getAllPrizes() {
  return load().prizes ?? []
}

export function addPrize(prize) {
  const data = load()
  data.prizes ??= []
  data.prizes.push(prize)
  save(data)
}

export function redeemPrize(code) {
  const data = load()
  const prize = data.prizes?.find(p => p.code === code)
  if (!prize) return false
  prize.redeemed = true
  save(data)
  return true
}

// ── Match states ─────────────────────────────────────────────
export function getMatchStates() {
  return load().matchStates ?? {}
}

export function updateMatchState(matchId, status, result = null) {
  const data = load()
  data.matchStates ??= {}
  const prev = data.matchStates[matchId] ?? {}
  data.matchStates[matchId] = { ...prev, status, result }
  save(data)
}

export function updateMatchTeams(matchId, t1, f1, t2, f2) {
  const data = load()
  data.matchStates ??= {}
  data.matchStates[matchId] ??= { status: 'open', result: null }
  Object.assign(data.matchStates[matchId], { t1, f1, t2, f2 })
  save(data)
}

// ── Prize config ─────────────────────────────────────────────
const DEFAULT_PRIZE_CONFIG = {
  exact:  { title: 'Premio A', description: 'Resultado exacto' },
  winner: { title: 'Premio B', description: 'Ganador correcto' },
}

export function getPrizeConfig() {
  return load().prizeConfig ?? DEFAULT_PRIZE_CONFIG
}

export function savePrizeConfig(config) {
  const data = load()
  data.prizeConfig = config
  save(data)
}

// ── Ranking (all-users aggregate) ───────────────────────────
export function getAllPredictions() {
  return load().predictions ?? {}
}

// ── User registry ────────────────────────────────────────────
export function registerUser(user) {
  const data = load()
  data.users ??= {}
  const existing = data.users[user.id]
  data.users[user.id] = {
    id:           user.id,
    name:         user.name,
    email:        user.email,
    avatar:       user.avatar ?? null,
    phone:        user.phone ?? existing?.phone ?? null,
    isAdmin:      user.isAdmin ?? false,
    registeredAt: existing?.registeredAt ?? new Date().toISOString(),
    lastSeen:     new Date().toISOString(),
  }
  save(data)
}

export function getAllUsers() {
  return Object.values(load().users ?? {})
}

export function getUserStats(userId) {
  const data     = load()
  const history  = data.history?.[userId] ?? []
  const predCount = Object.keys(data.predictions?.[userId] ?? {}).length
  const prizes   = (data.prizes ?? []).filter(p => p.userId === userId)
  const exact    = history.filter(h => h.result === 'exact').length
  const winner   = history.filter(h => h.result === 'winner').length
  return {
    pts:          exact * 10 + winner * 5,
    predictions:  predCount,
    prizes:       prizes.length,
    activePrizes: prizes.filter(p => !p.redeemed).length,
  }
}
