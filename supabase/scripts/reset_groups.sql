-- ============================================================
--  reset_groups.sql
--  Revierte toda la fase de grupos + elimina el cuadro de
--  llaves, predicciones evaluadas y premios generados.
--
--  Correr en: Supabase → SQL Editor
--  ⚠  DESTRUCTIVO — borra premios y resultados de predicciones.
--     Usar solo en entorno de pruebas.
-- ============================================================

BEGIN;

-- 1. Borrar premios de partidos de grupo
DELETE FROM public.prizes
WHERE prediction_id IN (
  SELECT pr.id
  FROM   public.predictions pr
  JOIN   public.matches     m  ON m.id = pr.match_id
  WHERE  m.phase = 'group'
);

-- 2. Limpiar resultado de predicciones de grupo
UPDATE public.predictions
SET result = NULL
WHERE match_id IN (
  SELECT id FROM public.matches WHERE phase = 'group'
);

-- 3. Resetear partidos de grupo → open
UPDATE public.matches
SET
  status   = 'open',
  result_h = NULL,
  result_a = NULL,
  advancer = NULL
WHERE phase = 'group';

-- 4. Resetear cuadro de eliminatorias → locked + Por definir
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
WHERE phase IN ('r32', 'r16', 'qf', 'sf', '3rd', 'final');

COMMIT;

-- Verificar estado final
SELECT phase, status, count(*) AS total
FROM   public.matches
GROUP  BY phase, status
ORDER  BY phase, status;
