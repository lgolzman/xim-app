-- =============================================
-- SOFT DELETE DE EJERCICIOS EN RUTINAS
-- =============================================

ALTER TABLE block_exercises
ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX idx_block_exercises_active ON block_exercises(active);
