-- ============================================================
--  006_onboarding.sql
--  Marca si el usuario completó el wizard de bienvenida
-- ============================================================

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;
