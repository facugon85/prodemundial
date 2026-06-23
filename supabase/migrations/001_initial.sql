-- ============================================================
--  Prode Mundial 2026 — Supabase schema
-- ============================================================

-- Perfiles de usuario (extiende auth.users)
create table public.profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  email         text        not null,
  display_name  text,
  avatar_url    text,
  is_admin      boolean     not null default false,
  created_at    timestamptz not null default now()
);

-- Partidos (se cargan una sola vez con el fixture completo)
create table public.matches (
  id        serial      primary key,
  phase     text        not null,          -- group | r32 | r16 | qf | sf | 3rd | final
  "group"   text,                          -- A-L, null para knockout
  round     text        not null,
  date      text        not null,
  time      text        not null,
  t1        text        not null,
  f1        text        not null,
  t2        text        not null,
  f2        text        not null,
  status    text        not null default 'open',   -- open | pending | synced | locked
  result_h  smallint,
  result_a  smallint,
  created_at timestamptz not null default now()
);

-- Predicciones
create table public.predictions (
  id         serial      primary key,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  match_id   integer     not null references public.matches(id),
  pred_h     smallint    not null,
  pred_a     smallint    not null,
  result     text,                         -- exact | winner | miss | null (pendiente)
  created_at timestamptz not null default now(),
  unique (user_id, match_id)
);

-- Premios generados
create table public.prizes (
  id             serial      primary key,
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  prediction_id  integer     not null references public.predictions(id),
  match_id       integer     not null references public.matches(id),
  type           text        not null,     -- exact | winner
  code           text        not null unique,
  redeemed       boolean     not null default false,
  redeemed_at    timestamptz,
  created_at     timestamptz not null default now()
);

-- ============================================================
--  Row-Level Security
-- ============================================================

alter table public.profiles   enable row level security;
alter table public.matches     enable row level security;
alter table public.predictions enable row level security;
alter table public.prizes      enable row level security;

-- profiles: todos pueden leer, cada uno edita el suyo
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- matches: todos pueden leer; solo admins escriben
create policy "matches_select" on public.matches for select using (true);
create policy "matches_admin_write" on public.matches for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);

-- predictions: todos ven todas (para ranking); cada uno crea/edita las suyas
create policy "predictions_select" on public.predictions for select using (true);
create policy "predictions_insert" on public.predictions for insert with check (auth.uid() = user_id);
create policy "predictions_update" on public.predictions for update using (
  auth.uid() = user_id
  and exists (select 1 from public.matches where id = match_id and status = 'open')
);

-- prizes: cada usuario ve las suyas; admins ven todas
create policy "prizes_select" on public.prizes for select using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);
create policy "prizes_admin_update" on public.prizes for update using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);
create policy "prizes_admin_delete" on public.prizes for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);

-- predictions: admins pueden borrar (para resetear partidos)
create policy "predictions_admin_delete" on public.predictions for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);

-- ============================================================
--  Funciones auxiliares
-- ============================================================

-- Genera un código de premio único
create or replace function generate_prize_code(prize_type text)
returns text
language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code  text := '';
  i     int;
begin
  for i in 1..6 loop
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return 'WC26-' || case when prize_type = 'exact' then 'EXACT' else 'WIN' end || '-' || code;
end;
$$;

-- Procesa el resultado de un partido: evalúa predicciones y genera premios
create or replace function process_match_result(p_match_id int)
returns void
language plpgsql security definer as $$
declare
  m   record;
  p   record;
  res text;
  pw  text;
  rw  text;
  c   text;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'Unauthorized';
  end if;

  select result_h, result_a into m from public.matches where id = p_match_id;

  for p in (
    select * from public.predictions
    where match_id = p_match_id and result is null
  ) loop
    if p.pred_h = m.result_h and p.pred_a = m.result_a then
      res := 'exact';
    else
      pw := case when p.pred_h > p.pred_a then 'home'
                 when p.pred_h < p.pred_a then 'away'
                 else 'draw' end;
      rw := case when m.result_h > m.result_a then 'home'
                 when m.result_h < m.result_a then 'away'
                 else 'draw' end;
      res := case when pw = rw then 'winner' else 'miss' end;
    end if;

    update public.predictions set result = res where id = p.id;

    if res in ('exact', 'winner') then
      c := generate_prize_code(res);
      insert into public.prizes (user_id, prediction_id, match_id, type, code)
      values (p.user_id, p.id, p_match_id, res, c);
    end if;
  end loop;

  update public.matches set status = 'synced' where id = p_match_id;
end;
$$;

-- Trigger: crear perfil al registrarse
create or replace function handle_new_user()
returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
