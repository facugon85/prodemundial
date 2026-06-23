-- Configuración global de la app (clave-valor JSONB)
create table public.app_settings (
  key        text        primary key,
  value      jsonb       not null,
  updated_at timestamptz not null default now()
);

-- Valores por defecto de premios
insert into public.app_settings (key, value) values (
  'prize_config',
  '{"exact": {"title": "Premio A", "description": "Resultado exacto"}, "winner": {"title": "Premio B", "description": "Ganador correcto"}}'::jsonb
);

alter table public.app_settings enable row level security;

create policy "settings_select" on public.app_settings for select using (true);
create policy "settings_admin_write" on public.app_settings for update using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);
