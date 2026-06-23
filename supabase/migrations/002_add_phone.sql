-- Agregar campo teléfono al perfil de usuario
alter table public.profiles
  add column if not exists phone text;
