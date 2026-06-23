-- RPC para calcular ranking server-side, evitando el límite de filas de PostgREST
CREATE OR REPLACE FUNCTION get_ranking()
RETURNS TABLE(
  user_id    uuid,
  name       text,
  avatar_url text,
  pred_count bigint,
  exact      bigint,
  winner     bigint,
  pts        bigint
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    p.user_id,
    COALESCE(pr.display_name, LEFT(p.user_id::text, 8)) AS name,
    pr.avatar_url,
    COUNT(*)                                             AS pred_count,
    COUNT(*) FILTER (WHERE p.result = 'exact')           AS exact,
    COUNT(*) FILTER (WHERE p.result = 'winner')          AS winner,
    COUNT(*) FILTER (WHERE p.result = 'exact')  * 10
      + COUNT(*) FILTER (WHERE p.result = 'winner') * 5 AS pts
  FROM predictions p
  LEFT JOIN profiles pr ON pr.id = p.user_id
  GROUP BY p.user_id, pr.display_name, pr.avatar_url
  ORDER BY pts DESC;
$$;
