-- ============================================================
--  setup_cron.sql
--  Ejecutar desde el SQL Editor de Supabase (no via db push)
--  Requiere: pg_cron y pg_net habilitados en Extensions
-- ============================================================

-- 1. Habilitar extensiones (si no están activas)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Crear el cron job — reemplazar TU_ANON_KEY con el valor de
--    VITE_SUPABASE_ANON_KEY del .env (es público, no es secreto)
select cron.schedule(
  'auto-sync-results',            -- nombre del job (único)
  '*/5 * * * *',                  -- cada 5 minutos
  $$
  select net.http_post(
    url     := 'https://savowznjbnudjfbcfhax.supabase.co/functions/v1/auto-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey',       'TU_ANON_KEY'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Para verificar que quedó creado:
-- select * from cron.job;

-- Para eliminar el job si necesitás cambiarlo:
-- select cron.unschedule('auto-sync-results');
