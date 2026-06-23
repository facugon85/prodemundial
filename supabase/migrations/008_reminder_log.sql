-- ============================================================
--  008_reminder_log.sql
--  Registra cuándo se envió el último recordatorio a cada usuario
-- ============================================================

alter table public.profiles
  add column if not exists last_reminder_at timestamptz;
