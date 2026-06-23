-- Agrega campo advancer a matches para eliminatorias con alargue/penales
alter table public.matches
  add column if not exists advancer text check (advancer in ('home','away'));

-- Actualiza process_match_result para usar advancer al evaluar predicciones
create or replace function process_match_result(p_match_id int)
returns void
language plpgsql security definer as $$
declare
  m   record;
  p   record;
  res text;
  pw  text;
begin
  select result_h, result_a, advancer, phase into m
  from public.matches where id = p_match_id;

  for p in (
    select * from public.predictions
    where match_id = p_match_id and result is null
  ) loop

    -- Exacto: marcador al 90' coincide exactamente
    if p.pred_h = m.result_h and p.pred_a = m.result_a then
      res := 'exact';

    -- Eliminatoria con advancer: ganador = quien predijo el que avanzó
    elsif m.advancer is not null then
      pw := case
        when p.pred_h > p.pred_a then 'home'
        when p.pred_h < p.pred_a then 'away'
        else null
      end;
      res := case when pw = m.advancer then 'winner' else 'miss' end;

    -- Fase de grupos: ganador por signo del marcador
    else
      declare
        pred_sign text;
        real_sign text;
      begin
        pred_sign := case
          when p.pred_h > p.pred_a then 'home'
          when p.pred_h < p.pred_a then 'away'
          else 'draw' end;
        real_sign := case
          when m.result_h > m.result_a then 'home'
          when m.result_h < m.result_a then 'away'
          else 'draw' end;
        res := case when pred_sign = real_sign then 'winner' else 'miss' end;
      end;
    end if;

    update public.predictions set result = res where id = p.id;

    if res in ('exact', 'winner') then
      insert into public.prizes (user_id, prediction_id, match_id, type, code)
      values (p.user_id, p.id, p_match_id, res, generate_prize_code(res))
      on conflict do nothing;
    end if;

  end loop;
end;
$$;
