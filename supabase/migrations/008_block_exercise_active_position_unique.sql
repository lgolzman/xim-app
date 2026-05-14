-- =============================================
-- POSICIONES ÚNICAS SOLO PARA EJERCICIOS ACTIVOS
-- =============================================

ALTER TABLE block_exercises
DROP CONSTRAINT IF EXISTS block_exercises_block_id_position_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_block_exercises_active_block_position
ON block_exercises(block_id, position)
WHERE active = TRUE;
