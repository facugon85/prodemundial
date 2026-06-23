-- Limpieza pre-lanzamiento
-- Borra premios y resultados de prueba. Conserva usuarios y predicciones.

-- Política que faltaba para que los reverts del admin funcionen
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prizes' and policyname = 'prizes_admin_delete'
  ) then
    execute $p$
      create policy "prizes_admin_delete" on public.prizes for delete using (
        exists (select 1 from public.profiles where id = auth.uid() and is_admin)
      )
    $p$;
  end if;
end
$$;

-- Premios
delete from public.prizes;

-- Resultados de predicciones (se conservan los pronósticos)
update public.predictions set result = null where result is not null;

-- Partidos de grupos
update public.matches
set status = 'open', result_h = null, result_a = null, advancer = null
where phase = 'group';

-- Eliminatorias al estado inicial
update public.matches
set status   = 'locked',
    t1       = 'Por definir', f1 = '🏳️',
    t2       = 'Por definir', f2 = '🏳️',
    result_h = null, result_a = null, advancer = null
where phase in ('r32', 'r16', 'qf', 'sf', '3rd', 'final');
