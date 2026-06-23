import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const APP_URL    = Deno.env.get('APP_URL')    ?? 'https://fixture.chebra.com.ar'
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Prode Mundial 2026 <noreply@chebra.com.ar>'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verify caller is admin
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    const { data: { user } } = await supabase.auth.getUser(token)
    const { data: profile } = await supabase
      .from('profiles').select('is_admin').eq('id', user?.id ?? '').single()
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: CORS })
    }

    // IDs específicos pasados desde el admin (selección manual)
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const requestedIds: string[] = body.userIds ?? []

    // display_name de profiles
    const { data: allProfiles } = await supabase
      .from('profiles').select('id, display_name, is_admin')
    const adminIds    = new Set((allProfiles ?? []).filter((p: { is_admin: boolean }) => p.is_admin).map((p: { id: string }) => p.id))
    const displayName = Object.fromEntries(
      (allProfiles ?? []).map((p: { id: string; display_name: string }) => [p.id, p.display_name]),
    )

    // auth.admin.listUsers tiene todos los emails (Google, Facebook, email)
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 })

    let targets

    if (requestedIds.length > 0) {
      // Selección manual: enviar solo a los IDs indicados (sin filtrar por predicciones)
      const requestedSet = new Set(requestedIds)
      targets = authUsers
        .filter((u) => u.email && requestedSet.has(u.id))
        .map((u) => ({
          id:    u.id,
          email: u.email!,
          name:  displayName[u.id] || u.user_metadata?.full_name || u.email!.split('@')[0],
        }))
    } else {
      // Sin selección: enviar a todos los inactivos (sin predicciones en partidos abiertos)
      const { data: openMatches } = await supabase
        .from('matches').select('id').eq('status', 'open')

      if (!openMatches?.length) {
        return new Response(
          JSON.stringify({ sent: 0, skipped: 0, message: 'No hay partidos abiertos en este momento' }),
          { headers: { ...CORS, 'Content-Type': 'application/json' } },
        )
      }

      const openIds = openMatches.map((m: { id: number }) => m.id)
      const { data: activePreds } = await supabase
        .from('predictions').select('user_id').in('match_id', openIds)
      const activeIds = new Set((activePreds ?? []).map((p: { user_id: string }) => p.user_id))

      targets = authUsers
        .filter((u) => u.email && !adminIds.has(u.id) && !activeIds.has(u.id))
        .map((u) => ({
          id:    u.id,
          email: u.email!,
          name:  displayName[u.id] || u.user_metadata?.full_name || u.email!.split('@')[0],
        }))
    }

    if (!targets.length) {
      return new Response(
        JSON.stringify({ sent: 0, skipped: 0, message: 'No hay destinatarios para enviar ✓' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')!
    let sent = 0, failed = 0

    for (const u of targets) {
      const name = u.name

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to:   u.email,
          subject: '⚽ ¡Todavía podés predecir los próximos partidos!',
          html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f1e0;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#f4f1e0;">

    <!-- Header -->
    <div style="background-color:#202D23;padding:32px;text-align:center;">
      <a href="https://chebra.com.ar" style="display:block;text-decoration:none;">
        <img src="https://chebra.com.ar/img/faviocon.png" alt="Chebra" style="height:56px;width:auto;display:block;margin:0 auto 12px auto;" />
        <img src="https://chebra.com.ar/img/chebraw.png" alt="Chebra" style="height:28px;width:auto;display:block;margin:0 auto;" />
      </a>
    </div>

    <!-- Franja naranja -->
    <div style="height:4px;background-color:#ff923f;"></div>

    <!-- Cuerpo -->
    <div style="padding:40px 32px;background-color:#f4f1e0;">
      <h2 style="color:#22201c;font-size:22px;margin:0 0 16px;">⚽ ¡Hola, ${name}!</h2>
      <p style="color:#202D23;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Hay partidos del <strong>Prode Mundial 2026</strong> con apuestas abiertas y todavía no hiciste tus predicciones. ¡Ingresá antes de que empiecen y sumá puntos!
      </p>

      <!-- Premios -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
        <tr>
          <td style="background-color:#e8e4d0;border-radius:8px;padding:16px 20px;">
            <p style="margin:0 0 12px;color:#202D23;font-size:14px;">
              🍺 <strong>Acertás el ganador</strong> → Ganás un porrón + 5 puntos
            </p>
            <p style="margin:0 0 12px;color:#202D23;font-size:14px;">
              🎯 <strong>Acertás el ganador con resultado exacto</strong> → Ganás un porrón + 10 puntos
            </p>
            <p style="margin:0;color:#202D23;font-size:14px;">
              🏆 <strong>El que más puntos acumule</strong> → <span style="color:#b63b28;font-weight:bold;">¡Gana el Premio Mayor!</span>
            </p>
          </td>
        </tr>
      </table>

      <div style="text-align:center;">
        <a href="${APP_URL}"
           style="background-color:#b63b28;color:#f4f1e0;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:bold;display:inline-block;">
          Ir al Prode →
        </a>
      </div>

      <p style="color:#202D23;font-size:13px;line-height:1.5;opacity:0.7;margin:32px 0 0;">
        Recibís este correo porque te registraste en el Prode del Mundial 2026 de Chebra.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color:#22201c;padding:20px 32px;text-align:center;">
      <p style="color:#f4f1e0;font-size:12px;margin:0;opacity:0.6;">© 2026 Chebra. Todos los derechos reservados.</p>
    </div>

  </div>
</body>
</html>`,
        }),
      })

      if (res.ok) {
        sent++
        await supabase.from('profiles').update({ last_reminder_at: new Date().toISOString() }).eq('id', u.id)
      } else {
        failed++
      }
    }

    return new Response(
      JSON.stringify({ sent, failed, total: targets.length }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
