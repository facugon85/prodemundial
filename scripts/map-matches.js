#!/usr/bin/env node
/**
 * map-matches.js
 *
 * Cruza los partidos de football-data.org con los registros de Supabase
 * y setea external_id en cada match. Ejecutar UNA sola vez (o re-ejecutar
 * para actualizar — idempotente si el external_id ya coincide).
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... FOOTBALL_DATA_TOKEN=... node scripts/map-matches.js
 *
 * Requiere Node 18+ (fetch nativo).
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL          = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY
const FOOTBALL_DATA_TOKEN   = process.env.FOOTBALL_DATA_TOKEN

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !FOOTBALL_DATA_TOKEN) {
  console.error('Faltan variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_KEY, FOOTBALL_DATA_TOKEN')
  process.exit(1)
}

// Traducción completa EN → ES para todos los equipos del Mundial 2026
const EN_TO_ES = {
  'Mexico':                          'México',
  'South Africa':                    'Sudáfrica',
  'South Korea':                     'Corea del Sur',
  'Czech Republic':                  'R. Checa',
  'Czechia':                         'R. Checa',
  'Canada':                          'Canadá',
  'Bosnia and Herzegovina':          'Bosnia y Herzegovina',
  'United States':                   'Estados Unidos',
  'United States of America':        'Estados Unidos',
  'USA':                             'Estados Unidos',
  'Paraguay':                        'Paraguay',
  'Haiti':                           'Haití',
  'Scotland':                        'Escocia',
  'Australia':                       'Australia',
  'Turkey':                          'Turquía',
  'Türkiye':                         'Turquía',
  'Brazil':                          'Brasil',
  'Morocco':                         'Marruecos',
  'Qatar':                           'Qatar',
  'Switzerland':                     'Suiza',
  "Ivory Coast":                     'Costa de Marfil',
  "Côte d'Ivoire":                   'Costa de Marfil',
  "Cote d'Ivoire":                   'Costa de Marfil',
  'Ecuador':                         'Ecuador',
  'Germany':                         'Alemania',
  'Curaçao':                         'Curazao',
  'Curacao':                         'Curazao',
  'Netherlands':                     'Países Bajos',
  'Japan':                           'Japón',
  'Sweden':                          'Suecia',
  'Tunisia':                         'Túnez',
  'Iran':                            'Irán',
  'IR Iran':                         'Irán',
  'New Zealand':                     'Nueva Zelanda',
  'Spain':                           'España',
  'Cape Verde':                      'Cabo Verde',
  'Belgium':                         'Bélgica',
  'Egypt':                           'Egipto',
  'Saudi Arabia':                    'Arabia Saudita',
  'Uruguay':                         'Uruguay',
  'France':                          'Francia',
  'Senegal':                         'Senegal',
  'Iraq':                            'Irak',
  'Norway':                          'Noruega',
  'Argentina':                       'Argentina',
  'Algeria':                         'Argelia',
  'Austria':                         'Austria',
  'Jordan':                          'Jordania',
  'Portugal':                        'Portugal',
  'DR Congo':                        'RD Congo',
  'Democratic Republic of the Congo':'RD Congo',
  'Congo DR':                        'RD Congo',
  'Uzbekistan':                      'Uzbekistán',
  'Colombia':                        'Colombia',
  'England':                         'Inglaterra',
  'Croatia':                         'Croacia',
  'Ghana':                           'Ghana',
  'Panama':                          'Panamá',
  'Venezuela':                       'Venezuela',
  'Chile':                           'Chile',
  'Peru':                            'Perú',
  'Bolivia':                         'Bolivia',
  'Costa Rica':                      'Costa Rica',
  'Honduras':                        'Honduras',
  'El Salvador':                     'El Salvador',
  'Jamaica':                         'Jamaica',
  'Trinidad and Tobago':             'Trinidad y Tobago',
  'Kenya':                           'Kenia',
  'Nigeria':                         'Nigeria',
  'Cameroon':                        'Camerún',
  'Tanzania':                        'Tanzania',
  'Zimbabwe':                        'Zimbabue',
  'Mozambique':                      'Mozambique',
  'Zambia':                          'Zambia',
  'Angola':                          'Angola',
  'Sudan':                           'Sudán',
  'Ethiopia':                        'Etiopía',
  'Uganda':                          'Uganda',
  'Rwanda':                          'Ruanda',
  'Benin':                           'Benín',
  'Guinea':                          'Guinea',
  'Mali':                            'Malí',
  'Burkina Faso':                    'Burkina Faso',
  'Niger':                           'Níger',
  'Gabon':                           'Gabón',
  'Equatorial Guinea':               'Guinea Ecuatorial',
  'Central African Republic':        'Rep. Centroafricana',
  'Libya':                           'Libia',
  'Tunisia':                         'Túnez',
  'Palestine':                       'Palestina',
  'Lebanon':                         'Líbano',
  'Syria':                           'Siria',
  'Kuwait':                          'Kuwait',
  'Bahrain':                         'Baréin',
  'Oman':                            'Omán',
  'United Arab Emirates':            'Emiratos Árabes',
  'UAE':                             'Emiratos Árabes',
  'Indonesia':                       'Indonesia',
  'Thailand':                        'Tailandia',
  'Vietnam':                         'Vietnam',
  'Philippines':                     'Filipinas',
  'Malaysia':                        'Malasia',
  'India':                           'India',
  'China PR':                        'China',
  'China':                           'China',
  'Tajikistan':                      'Tayikistán',
  'Kyrgyzstan':                      'Kirguistán',
  'Turkmenistan':                    'Turkmenistán',
  'Kazakhstan':                      'Kazajistán',
  'Greece':                          'Grecia',
  'Hungary':                         'Hungría',
  'Romania':                         'Rumanía',
  'Denmark':                         'Dinamarca',
  'Finland':                         'Finlandia',
  'Ireland':                         'Irlanda',
  'Wales':                           'Gales',
  'Northern Ireland':                'Irlanda del Norte',
  'Slovakia':                        'Eslovaquia',
  'Slovenia':                        'Eslovenia',
  'Serbia':                          'Serbia',
  'Albania':                         'Albania',
  'North Macedonia':                 'Macedonia del Norte',
  'Kosovo':                          'Kosovo',
  'Montenegro':                      'Montenegro',
  'Bulgaria':                        'Bulgaria',
  'Ukraine':                         'Ucrania',
  'Poland':                          'Polonia',
  'Russia':                          'Rusia',
  'Belarus':                         'Bielorrusia',
  'Georgia':                         'Georgia',
  'Azerbaijan':                      'Azerbaiyán',
  'Armenia':                         'Armenia',
  'Cyprus':                          'Chipre',
  'Iceland':                         'Islandia',
  'Faroe Islands':                   'Islas Feroe',
  'Luxembourg':                      'Luxemburgo',
  'Malta':                           'Malta',
  'Lithuania':                       'Lituania',
  'Latvia':                          'Letonia',
  'Estonia':                         'Estonia',
  'Moldova':                         'Moldavia',
  'Andorra':                         'Andorra',
  'San Marino':                      'San Marino',
  'Liechtenstein':                   'Liechtenstein',
  'Gibraltar':                       'Gibraltar',
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // 1. Fetch todos los partidos del Mundial desde football-data.org
  console.log('Fetching matches desde football-data.org...')
  const apiRes = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
    headers: { 'X-Auth-Token': FOOTBALL_DATA_TOKEN },
  })
  if (!apiRes.ok) {
    const body = await apiRes.text()
    throw new Error(`API error ${apiRes.status}: ${body}`)
  }
  const { matches: apiMatches } = await apiRes.json()
  console.log(`  → ${apiMatches.length} partidos desde la API`)

  // 2. Fetch todos los partidos de Supabase
  const { data: dbMatches, error: dbErr } = await supabase
    .from('matches')
    .select('id, t1, t2, date, phase, external_id')
  if (dbErr) throw new Error(`Supabase error: ${dbErr.message}`)
  console.log(`  → ${dbMatches.length} partidos en la DB\n`)

  // Índice por par de equipos en español (solo los que tienen equipos definidos)
  const byTeams = {}
  for (const m of dbMatches) {
    if (m.t1 && m.t1 !== 'Por definir' && m.t2 && m.t2 !== 'Por definir') {
      byTeams[`${m.t1}|${m.t2}`] = m
    }
  }

  const mapped    = []
  const skipped   = []
  const unmatched = []

  for (const g of apiMatches) {
    const homeEN = g.homeTeam?.name
    const awayEN = g.awayTeam?.name

    // Partidos KO sin equipos definidos aún
    if (!homeEN || !awayEN || homeEN === 'TBD' || awayEN === 'TBD') {
      unmatched.push({
        apiId: g.id,
        stage: g.stage,
        date:  g.utcDate?.slice(0, 10),
        reason: 'equipos no definidos aún (KO)',
      })
      continue
    }

    const homeES = EN_TO_ES[homeEN]
    const awayES = EN_TO_ES[awayEN]

    if (!homeES || !awayES) {
      unmatched.push({
        apiId: g.id,
        homeEN, awayEN,
        reason: `sin traducción ES: ${!homeES ? homeEN : ''}${!homeES && !awayES ? ' / ' : ''}${!awayES ? awayEN : ''}`,
      })
      continue
    }

    const key   = `${homeES}|${awayES}`
    const match = byTeams[key]

    if (!match) {
      unmatched.push({ apiId: g.id, homeES, awayES, reason: 'no encontrado en DB (par invertido o nombre distinto)' })
      continue
    }

    // Ya tiene external_id
    if (match.external_id !== null) {
      skipped.push({ localId: match.id, apiId: g.id, existing: match.external_id })
      if (match.external_id !== g.id) {
        console.warn(`  ⚠ CONFLICTO: local #${match.id} (${homeES} vs ${awayES}) tiene external_id=${match.external_id}, API dice ${g.id}`)
      }
      continue
    }

    // Actualizar external_id
    const { error: updErr } = await supabase
      .from('matches')
      .update({ external_id: g.id })
      .eq('id', match.id)

    if (updErr) {
      console.error(`  ✗ Error actualizando #${match.id}: ${updErr.message}`)
      unmatched.push({ apiId: g.id, homeES, awayES, reason: updErr.message })
    } else {
      mapped.push({
        localId: match.id,
        apiId:   g.id,
        teams:   `${homeES} vs ${awayES}`,
        date:    g.utcDate?.slice(0, 10),
      })
    }
  }

  // ── Resumen ──────────────────────────────────────────────────────────────
  console.log(`✅ Mapeados: ${mapped.length}`)
  for (const m of mapped) {
    console.log(`   local #${String(m.localId).padStart(3)} ↔ API ${m.apiId}: ${m.teams} (${m.date})`)
  }

  if (skipped.length > 0) {
    console.log(`\n⏩ Ya tenían external_id: ${skipped.length}`)
    for (const m of skipped) console.log(`   local #${m.localId} → API ${m.apiId}`)
  }

  const koUnmatched  = unmatched.filter(m => m.reason?.includes('KO'))
  const realProblems = unmatched.filter(m => !m.reason?.includes('KO'))

  if (koUnmatched.length > 0) {
    console.log(`\n🔒 KO sin equipos definidos: ${koUnmatched.length} (normal, se mapearán cuando avance el torneo)`)
  }

  if (realProblems.length > 0) {
    console.log(`\n⚠️  Necesitan revisión manual (${realProblems.length}):`)
    for (const m of realProblems) {
      console.log(`   API ${m.apiId}: ${m.homeES ?? m.homeEN} vs ${m.awayES ?? m.awayEN} — ${m.reason}`)
    }
    process.exit(1)
  }

  const total = mapped.length + skipped.length
  console.log(`\nTotal mapeados (incluye previos): ${total} / ${dbMatches.length}`)
}

main().catch(err => { console.error(err); process.exit(1) })
