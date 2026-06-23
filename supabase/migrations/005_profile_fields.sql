-- ============================================================
--  005_profile_fields.sql
--  Agrega nombre completo y fecha de nacimiento al perfil
-- ============================================================

alter table public.profiles
  add column if not exists full_name   text,
  add column if not exists birth_date  date;
