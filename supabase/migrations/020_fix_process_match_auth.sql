-- Restaura el null guard en process_match_result.
-- La migración 016 re-introdujo el check sin protección para auth.uid() NULL,
-- lo que bloquea llamadas desde el SQL editor, triggers y el cron (service role).
-- Cuando auth.uid() es NULL se permite el paso (contexto interno de confianza).

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
  -- auth.uid() es NULL cuando llaman desde service role, trigger o SQL editor.
  -- Solo bloquear si hay sesión autenticada y no es admin.
  if auth.uid() is not null and not exists (
    select 1 from public.profiles where id = auth.uid() and is_admin
  ) then
    raise exception 'Unauthorized';
  end if;

  select result_h, result_a into m from public.matches where id = p_match_id;

  for p in (
    select pred.* from public.predictions pred
    join public.profiles prof on prof.id = pred.user_id
    where pred.match_id = p_match_id
      and pred.result is null
      and prof.is_admin = false
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

    -- Solo marcador exacto genera cupón
    if res = 'exact' then
      c := generate_prize_code('exact');
      insert into public.prizes (user_id, prediction_id, match_id, type, code)
      values (p.user_id, p.id, p_match_id, 'exact', c);
    end if;
  end loop;

  update public.matches set status = 'synced' where id = p_match_id;
end;
$$;
