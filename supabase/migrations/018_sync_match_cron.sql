-- Reemplaza el cron de auto-sync (worldcup26.ir) por sync-match-results (football-data.org).
--
-- Ventana activa: 20:00-06:59 UTC (partidos del Mundial van 22:00-05:00 UTC-3 = 01:00-08:00 UTC)
-- Se usan dos jobs porque el cron estándar no puede cruzar medianoche en una sola expresión.
--
-- Prerequisito: supabase functions deploy sync-match-results

-- Limpiar jobs anteriores
DO $$
BEGIN
  IF EXISTS (SELECT FROM cron.job WHERE jobname = 'auto-sync-worldcup-results') THEN
    PERFORM cron.unschedule('auto-sync-worldcup-results');
  END IF;
  IF EXISTS (SELECT FROM cron.job WHERE jobname = 'auto-sync-results') THEN
    PERFORM cron.unschedule('auto-sync-results');
  END IF;
  IF EXISTS (SELECT FROM cron.job WHERE jobname = 'sync-match-results-evening') THEN
    PERFORM cron.unschedule('sync-match-results-evening');
  END IF;
  IF EXISTS (SELECT FROM cron.job WHERE jobname = 'sync-match-results-night') THEN
    PERFORM cron.unschedule('sync-match-results-night');
  END IF;
END $$;

-- Ventana tarde: 20:00-23:59 UTC (cada 5 minutos)
SELECT cron.schedule(
  'sync-match-results-evening',
  '*/5 20-23 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://savowznjbnudjfbcfhax.supabase.co/functions/v1/sync-match-results',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- Ventana noche/madrugada: 00:00-06:59 UTC (cada 5 minutos)
SELECT cron.schedule(
  'sync-match-results-night',
  '*/5 0-6 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://savowznjbnudjfbcfhax.supabase.co/functions/v1/sync-match-results',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- Verificar: SELECT jobname, schedule FROM cron.job;
