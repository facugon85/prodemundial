-- Automatic sync: call the auto-sync Edge Function every 5 minutes via pg_cron + pg_net.
--
-- Prerequisites (run once before applying this migration):
--   supabase functions deploy auto-sync
--
-- Optional hardening: set a CRON_SECRET in the Dashboard → Edge Functions → auto-sync → Secrets.
-- Then replace the x-cron-secret value below with the same secret.
-- If CRON_SECRET is not set in the function, all requests are accepted (default).

create extension if not exists pg_net with schema extensions;

do $$
begin
  if exists (select from cron.job where jobname = 'auto-sync-worldcup-results') then
    perform cron.unschedule('auto-sync-worldcup-results');
  end if;
end $$;

select cron.schedule(
  'auto-sync-worldcup-results',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://savowznjbnudjfbcfhax.supabase.co/functions/v1/auto-sync',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
