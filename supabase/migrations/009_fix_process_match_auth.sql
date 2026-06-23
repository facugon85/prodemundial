-- Fix: process_match_result raised 'Unauthorized' when called from the auto-sync
-- Edge Function because auth.uid() is NULL with the service role key.
-- Allow the call when auth.uid() is NULL (service role / internal), and only
-- enforce the admin check when there IS an authenticated user session.

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
  -- auth.uid() is NULL when called via service role (Edge Functions, pg_cron).
  -- Only enforce admin check for authenticated client sessions.
  if auth.uid() is not null and not exists (
    select 1 from public.profiles where id = auth.uid() and is_admin
  ) then
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
