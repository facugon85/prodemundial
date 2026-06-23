-- Integración con football-data.org API (reemplaza worldcup26.ir)
-- Nuevas columnas para espejo de datos de la API (no operacionales para predicciones)
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS home_score  INT,
  ADD COLUMN IF NOT EXISTS away_score  INT,
  ADD COLUMN IF NOT EXISTS api_status  TEXT DEFAULT 'TIMED',
  ADD COLUMN IF NOT EXISTS winner      TEXT,
  ADD COLUMN IF NOT EXISTS external_id INT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_matches_external_id ON public.matches(external_id);
CREATE INDEX IF NOT EXISTS idx_matches_api_status  ON public.matches(api_status);

-- Fix: migrations 014 y 016 reintrodujeron el check de admin sin el fix de la 009.
-- Con service role key (Edge Functions / pg_cron), auth.uid() es NULL y la query
-- no retorna filas → not exists = TRUE → raise Unauthorized.
-- Solo aplicar el check cuando hay una sesión de usuario autenticada.
CREATE OR REPLACE FUNCTION public.process_match_result(p_match_id INT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  m   RECORD;
  p   RECORD;
  res TEXT;
  pw  TEXT;
  rw  TEXT;
  c   TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT result_h, result_a INTO m FROM public.matches WHERE id = p_match_id;

  FOR p IN (
    SELECT pred.* FROM public.predictions pred
    JOIN public.profiles prof ON prof.id = pred.user_id
    WHERE pred.match_id = p_match_id
      AND pred.result IS NULL
      AND prof.is_admin = FALSE
  ) LOOP
    IF p.pred_h = m.result_h AND p.pred_a = m.result_a THEN
      res := 'exact';
    ELSE
      pw := CASE WHEN p.pred_h > p.pred_a THEN 'home'
                 WHEN p.pred_h < p.pred_a THEN 'away'
                 ELSE 'draw' END;
      rw := CASE WHEN m.result_h > m.result_a THEN 'home'
                 WHEN m.result_h < m.result_a THEN 'away'
                 ELSE 'draw' END;
      res := CASE WHEN pw = rw THEN 'winner' ELSE 'miss' END;
    END IF;

    UPDATE public.predictions SET result = res WHERE id = p.id;

    IF res = 'exact' THEN
      c := generate_prize_code('exact');
      INSERT INTO public.prizes (user_id, prediction_id, match_id, type, code)
      VALUES (p.user_id, p.id, p_match_id, 'exact', c);
    END IF;
  END LOOP;

  UPDATE public.matches SET status = 'synced' WHERE id = p_match_id;
END;
$$;

-- Lógica de bracket KO extraída a SQL para que tanto auto-sync (manual)
-- como sync-match-results (cron) la compartan sin duplicar código.
CREATE OR REPLACE FUNCTION public.propagate_bracket(p_match_id INT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  m          RECORD;
  winner_t   TEXT;
  winner_f   TEXT;
  loser_t    TEXT;
  loser_f    TEXT;
  next_id    INT;
  next_slot  TEXT;
  loser_next INT;
  loser_slot TEXT;
  nx         RECORD;
BEGIN
  SELECT t1, f1, t2, f2, advancer INTO m
  FROM public.matches WHERE id = p_match_id;

  IF m.advancer IS NULL THEN RETURN; END IF;

  IF m.advancer = 'home' THEN
    winner_t := m.t1; winner_f := m.f1;
    loser_t  := m.t2; loser_f  := m.f2;
  ELSE
    winner_t := m.t2; winner_f := m.f2;
    loser_t  := m.t1; loser_f  := m.f1;
  END IF;

  -- BRACKET_NEXT: a qué partido avanza el ganador de cada partido KO
  next_id := CASE p_match_id
    WHEN 73  THEN 89  WHEN 74  THEN 89
    WHEN 75  THEN 90  WHEN 76  THEN 90
    WHEN 77  THEN 91  WHEN 78  THEN 91
    WHEN 79  THEN 92  WHEN 80  THEN 92
    WHEN 81  THEN 93  WHEN 82  THEN 93
    WHEN 83  THEN 94  WHEN 84  THEN 94
    WHEN 85  THEN 95  WHEN 86  THEN 95
    WHEN 87  THEN 96  WHEN 88  THEN 96
    WHEN 89  THEN 97  WHEN 90  THEN 97
    WHEN 91  THEN 98  WHEN 92  THEN 98
    WHEN 93  THEN 99  WHEN 94  THEN 99
    WHEN 95  THEN 100 WHEN 96  THEN 100
    WHEN 97  THEN 101 WHEN 98  THEN 101
    WHEN 99  THEN 102 WHEN 100 THEN 102
    WHEN 101 THEN 104 WHEN 102 THEN 104
    ELSE NULL
  END;

  next_slot := CASE p_match_id
    WHEN 73  THEN 'home' WHEN 74  THEN 'away'
    WHEN 75  THEN 'home' WHEN 76  THEN 'away'
    WHEN 77  THEN 'home' WHEN 78  THEN 'away'
    WHEN 79  THEN 'home' WHEN 80  THEN 'away'
    WHEN 81  THEN 'home' WHEN 82  THEN 'away'
    WHEN 83  THEN 'home' WHEN 84  THEN 'away'
    WHEN 85  THEN 'home' WHEN 86  THEN 'away'
    WHEN 87  THEN 'home' WHEN 88  THEN 'away'
    WHEN 89  THEN 'home' WHEN 90  THEN 'away'
    WHEN 91  THEN 'home' WHEN 92  THEN 'away'
    WHEN 93  THEN 'home' WHEN 94  THEN 'away'
    WHEN 95  THEN 'home' WHEN 96  THEN 'away'
    WHEN 97  THEN 'home' WHEN 98  THEN 'away'
    WHEN 99  THEN 'home' WHEN 100 THEN 'away'
    WHEN 101 THEN 'home' WHEN 102 THEN 'away'
    ELSE NULL
  END;

  -- Semis: el perdedor va al partido por el 3° puesto
  loser_next := CASE p_match_id WHEN 101 THEN 103 WHEN 102 THEN 103 ELSE NULL END;
  loser_slot := CASE p_match_id WHEN 101 THEN 'home' WHEN 102 THEN 'away' ELSE NULL END;

  IF next_id IS NULL THEN RETURN; END IF;

  -- Propagar ganador al siguiente partido
  SELECT t1, t2 INTO nx FROM public.matches WHERE id = next_id;

  IF next_slot = 'home' THEN
    UPDATE public.matches
    SET t1 = winner_t, f1 = winner_f,
        status = CASE
          WHEN COALESCE(nx.t2, 'Por definir') != 'Por definir' THEN 'open'
          ELSE status
        END
    WHERE id = next_id;
  ELSE
    UPDATE public.matches
    SET t2 = winner_t, f2 = winner_f,
        status = CASE
          WHEN COALESCE(nx.t1, 'Por definir') != 'Por definir' THEN 'open'
          ELSE status
        END
    WHERE id = next_id;
  END IF;

  -- Propagar perdedor al partido por el 3° puesto (solo semis 101/102)
  IF loser_next IS NOT NULL THEN
    IF loser_slot = 'home' THEN
      UPDATE public.matches SET t1 = loser_t, f1 = loser_f WHERE id = loser_next;
    ELSE
      UPDATE public.matches SET t2 = loser_t, f2 = loser_f WHERE id = loser_next;
    END IF;

    SELECT t1, t2 INTO nx FROM public.matches WHERE id = loser_next;
    IF COALESCE(nx.t1, 'Por definir') != 'Por definir'
       AND COALESCE(nx.t2, 'Por definir') != 'Por definir' THEN
      UPDATE public.matches SET status = 'open' WHERE id = loser_next;
    END IF;
  END IF;
END;
$$;
