-- Trigger: cuando se carga result_h/result_a en un partido,
-- evalúa predicciones automáticamente sin necesidad de llamar la RPC manualmente.
-- Funciona para cualquier fuente: cron, sincronización manual del admin o cualquier update futuro.

CREATE OR REPLACE FUNCTION auto_process_match_result()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Solo actuar si ambos resultados están presentes y cambiaron (o se setearon por primera vez)
  IF NEW.result_h IS NOT NULL AND NEW.result_a IS NOT NULL
     AND (OLD.result_h IS DISTINCT FROM NEW.result_h
          OR OLD.result_a IS DISTINCT FROM NEW.result_a) THEN
    PERFORM process_match_result(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_match_result_set ON public.matches;

CREATE TRIGGER on_match_result_set
  AFTER UPDATE OF result_h, result_a ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION auto_process_match_result();
