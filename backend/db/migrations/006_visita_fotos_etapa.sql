-- Liga cada foto de la visita a la etapa en la que se subio (opcional).
-- Permite mostrar en el dashboard de que avance proviene cada foto.
-- Idempotente.

ALTER TABLE visita_fotos
  ADD COLUMN IF NOT EXISTS visita_etapa_id INTEGER
  REFERENCES visita_etapas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_visita_fotos_etapa_id
  ON visita_fotos(visita_etapa_id);
