-- ============================================================
--  simulate_groups.sql
--  Asigna resultados aleatorios a todos los partidos de grupos
--  que estén en estado 'open' o 'pending'.
--
--  Correr en: Supabase → SQL Editor
--  NOTA: No procesa predicciones ni premios (solo actualiza
--        el resultado en la tabla matches).
--        Para procesar premios correr process_all_group_prizes.sql
-- ============================================================

UPDATE public.matches
SET
  status   = 'synced',
  result_h = floor(random() * 4)::integer,
  result_a = floor(random() * 4)::integer,
  advancer = NULL
WHERE
  phase  = 'group'
  AND status IN ('open', 'pending');

-- Verificar cuántos se actualizaron
SELECT count(*) AS partidos_simulados
FROM public.matches
WHERE phase = 'group' AND status = 'synced';
