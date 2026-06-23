# Prode Mundial 2026 — Fixture (Chebra)

App de predicciones para el Mundial FIFA 2026. Los usuarios predicen resultados de partidos y ganan premios (códigos canjeables) si aciertan el marcador exacto o el ganador.

## Stack

- **Frontend**: React 18 + Vite (JSX, sin TypeScript)
- **Backend / DB**: Supabase (PostgreSQL + Auth + RLS)
- **Fallback offline**: localStorage vía `src/lib/db.js`
- **Iconos**: lucide-react
- **Deploy**: Vercel

## Comandos

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run preview  # previsualizar el build
```

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_ADMIN_EMAILS=admin@ejemplo.com,otro@ejemplo.com
```

Si las variables no están presentes, la app funciona en modo demo usando `localStorage`.

## Arquitectura

### Estado global — `src/context/AppContext.jsx`

Todo el estado de la app vive en un único contexto (`AppProvider`). Los componentes consumen via `useApp()`. **No crear stores adicionales ni fetch directo en componentes.**

Estados principales:
- `user` — usuario autenticado o `null`
- `matches` — array de partidos (fixture + estados en vivo)
- `predictions` — mapa `{ [matchId]: { h, a, saved } }` del usuario actual
- `prizes` — premios del usuario actual
- `history` — historial de predicciones evaluadas
- `standings` — tabla de posiciones de grupos (derivada, se recalcula automáticamente)

### Capa de datos — `src/lib/db.js`

Adapter de `localStorage`. Solo se importa desde `AppContext`. Cuando Supabase está configurado (`supabaseConfigured === true`), Supabase es la fuente de verdad y `db.js` se usa como best-effort sync local.

### Fixture estático — `src/data/fixture.js`

Array inmutable con los 104 partidos del Mundial. IDs:
- **1–72**: Fase de grupos (12 grupos × 6 partidos)
- **73–88**: Ronda de 32 (R32)
- **89–96**: Ronda de 16 (R16)
- **97–100**: Cuartos de final (QF)
- **101–102**: Semifinales (SF)
- **103**: Tercer puesto
- **104**: Final

## Modelo de datos

### Match status
```
open     → apuestas abiertas
pending  → apuestas cerradas, esperando resultado
synced   → resultado cargado y predicciones evaluadas
locked   → partido de fase KO sin equipos definidos aún
```

### Predicción outcome
```
exact   → marcador exacto (10 pts, código WC26-EXACT-XXXXXX)
winner  → ganador correcto (5 pts, código WC26-WIN-XXXXXX)
miss    → sin premio
```

### Bracket KO
El mapa `BRACKET_NEXT` en `AppContext.jsx` define cómo avanza el ganador (y el perdedor en semis para el 3° puesto) al siguiente partido. Cuando se registra un resultado en fase KO, `_processResult` propaga automáticamente el equipo ganador al partido siguiente en Supabase y en el estado local.

## Tablas Supabase

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Extiende `auth.users`. Tiene `is_admin`, `phone`, `display_name`, `full_name`, `birth_date`, `onboarding_completed` |
| `matches` | Fixture completo. La función RPC `process_match_result` actualiza el status a `synced` |
| `predictions` | Una fila por usuario × partido. `result` es `null` hasta que el partido se sincroniza |
| `prizes` | Generados por la RPC `process_match_result`. Tienen un código único |

RLS habilitado en todas las tablas. Admins se identifican por `is_admin = true` en `profiles`.

## Auth

Soporta tres modos:
1. **Google OAuth** (`loginWithGoogle`)
2. **Facebook OAuth** (`loginWithFacebook`)
3. **Email + password** (`loginWithEmail` — registrar o iniciar sesión)
4. **Demo** (`loginDemo('admin' | 'user')`) — solo localStorage, sin Supabase

Admin se determina consultando `profiles.is_admin` tras el login (`resolveAdmin`).

## Páginas y navegación

La navegación es manejada por `page` en el contexto (sin router externo):

| page | Componente | Descripción |
|------|-----------|-------------|
| `predecir` | `PredecirPage` | Ingresar predicciones por partido |
| `bracket` | `BracketPage` | Cuadro de eliminatorias visual |
| `historial` | `HistorialPage` | Predicciones pasadas con resultado |
| `premios` | `PremiosPage` | Códigos de premio ganados |
| `ranking` | `RankingPage` | Tabla de posiciones de todos los usuarios |
| `profile` | `ProfilePage` | Editar perfil del usuario |
| `admin` | `AdminPage` | Panel de administración (solo admins) |

## Flujo de onboarding

Si el usuario logueado no es admin y `onboarding_completed = false`, se muestra `OnboardingWizard` antes de la app. Al completarlo se llama `completeOnboarding()` que setea el flag en Supabase y navega a `predecir`.

## Configuración de premios

La descripción/nombre de cada tipo de premio es configurable desde el admin (tab "Premios").

- **Fuente de verdad**: tabla `app_settings` en Supabase, fila `key = 'prize_config'`, columna `value` (JSONB)
- **Fallback**: localStorage via `db.getPrizeConfig()` / `db.savePrizeConfig()`
- **Estructura**:
  ```json
  {
    "exact":  { "title": "Premio A", "description": "1 copa de vino tinto" },
    "winner": { "title": "Premio B", "description": "Media docena de empanadas" }
  }
  ```
- **En contexto**: `prizeConfig` (lectura) + `updatePrizeConfig(config)` (escritura)
- **Se muestra en**: `PremiosPage` (card del usuario) y `ValidarTab` (cuando el bartender escanea un código válido)
- **Migration**: `supabase/migrations/007_prize_config.sql` — hay que correrla en producción para activar la feature

## Puntos a tener en cuenta

- `supabaseConfigured` es un booleano exportado desde `src/lib/supabase.js`. Siempre verificar antes de hacer llamadas a Supabase.
- Las predicciones solo se pueden guardar cuando el partido está en `status: 'open'`.
- El sistema de bracket KO usa los terceros mejor clasificados de grupos para los partidos 85–88 (mejor de 8 thirds).
- `calcStandings` y `buildBracket` son funciones puras en `AppContext` que se ejecutan en cada render a partir del estado `matches`.
- La RPC `process_match_result` corre con `security definer` y valida que el caller sea admin.
