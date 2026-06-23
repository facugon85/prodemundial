-- ============================================================
--  reset_knockout.sql
--  Borra todos los resultados y equipos del cuadro de llaves.
--  Los grupos NO se tocan.
--
--  Correr en: Supabase → SQL Editor
-- ============================================================

BEGIN;

-- 1. Borrar premios de partidos de llaves
DELETE FROM public.prizes
WHERE match_id IN (
  SELECT id FROM public.matches
  WHERE phase IN ('r32','r16','qf','sf','3rd','final')
);

-- 2. Limpiar resultado de predicciones de llaves
UPDATE public.predictions
SET result = NULL
WHERE match_id IN (
  SELECT id FROM public.matches
  WHERE phase IN ('r32','r16','qf','sf','3rd','final')
);

-- 3. Resetear partidos de llaves → locked + Por definir
UPDATE public.matches
SET
  status   = 'locked',
  t1       = 'Por definir',
  f1       = '🏳️',
  t2       = 'Por definir',
  f2       = '🏳️',
  result_h = NULL,
  result_a = NULL,
  advancer = NULL
WHERE phase IN ('r32','r16','qf','sf','3rd','final');

COMMIT;

-- Verificar
SELECT phase, status, count(*) AS total
FROM   public.matches
WHERE  phase IN ('r32','r16','qf','sf','3rd','final')
GROUP  BY phase, status
ORDER  BY phase;
