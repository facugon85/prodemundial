-- ============================================================
--  Fix match dates and times
--  Only updates `date` and `time` columns — no other fields touched
-- ============================================================

-- Grupo stage fixes
UPDATE matches SET time = '22:00'  WHERE id = 15;  -- Brasil vs Haití: 9 PM ET = 22:00 ARG
UPDATE matches SET date = '20 Jun' WHERE id = 21;  -- Turquía vs Paraguay: medianoche ET → madrugada sáb 20 Jun ARG
UPDATE matches SET date = '21 Jun' WHERE id = 34;  -- Japón vs Túnez: medianoche ET → madrugada lun 21 Jun ARG
UPDATE matches SET date = '17 Jun' WHERE id = 56;  -- Austria vs Jordania: medianoche ET → madrugada mar 17 Jun ARG

-- Octavos de final (r32) — ids 73–88
UPDATE matches SET date = '01 Jul', time = '18:00' WHERE id = 73;
UPDATE matches SET date = '01 Jul', time = '22:00' WHERE id = 74;
UPDATE matches SET date = '02 Jul', time = '18:00' WHERE id = 75;
UPDATE matches SET date = '02 Jul', time = '22:00' WHERE id = 76;
UPDATE matches SET date = '03 Jul', time = '18:00' WHERE id = 77;
UPDATE matches SET date = '03 Jul', time = '22:00' WHERE id = 78;
UPDATE matches SET date = '04 Jul', time = '18:00' WHERE id = 79;
UPDATE matches SET date = '04 Jul', time = '22:00' WHERE id = 80;
UPDATE matches SET date = '05 Jul', time = '16:00' WHERE id = 81;
UPDATE matches SET date = '05 Jul', time = '20:00' WHERE id = 82;
UPDATE matches SET date = '05 Jul', time = '23:00' WHERE id = 83;
UPDATE matches SET date = '06 Jul', time = '18:00' WHERE id = 84;
UPDATE matches SET date = '06 Jul', time = '22:00' WHERE id = 85;
UPDATE matches SET date = '07 Jul', time = '18:00' WHERE id = 86;
UPDATE matches SET date = '07 Jul', time = '22:00' WHERE id = 87;
UPDATE matches SET date = '08 Jul', time = '18:00' WHERE id = 88;

-- Ronda de 16 (r16) — ids 89–96: sin cambios ✅
-- Cuartos de final (qf) — ids 97–100: sin cambios ✅
-- Semifinales (sf) — ids 101–102: sin cambios ✅

-- Tercer puesto — id 103
UPDATE matches SET date = '19 Jul', time = '20:00' WHERE id = 103;

-- Final — id 104
UPDATE matches SET date = '19 Jul', time = '22:00' WHERE id = 104;
