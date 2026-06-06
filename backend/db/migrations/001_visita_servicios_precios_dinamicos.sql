ALTER TABLE visita_servicios
  ADD COLUMN IF NOT EXISTS precio_acordado NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS cantidad NUMERIC(10, 2) NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_visita_servicios_precio_acordado'
  ) THEN
    ALTER TABLE visita_servicios
      ADD CONSTRAINT chk_visita_servicios_precio_acordado
      CHECK (precio_acordado IS NULL OR precio_acordado >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_visita_servicios_cantidad'
  ) THEN
    ALTER TABLE visita_servicios
      ADD CONSTRAINT chk_visita_servicios_cantidad
      CHECK (cantidad > 0);
  END IF;
END $$;
