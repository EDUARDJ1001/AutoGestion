-- Lineas manuales agregadas a una visita (servicio o material que no existe en catalogo).
-- No afectan el inventario; solo aportan al borrador del resumen de cobro.
-- Idempotente.

CREATE TABLE IF NOT EXISTS visita_items (
  id SERIAL PRIMARY KEY,
  visita_id INTEGER NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  cantidad NUMERIC(10, 2) NOT NULL DEFAULT 1,
  precio_sugerido NUMERIC(12, 2) NOT NULL DEFAULT 0,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_visita_items_tipo CHECK (tipo IN ('Servicio', 'Material')),
  CONSTRAINT chk_visita_items_cantidad CHECK (cantidad > 0),
  CONSTRAINT chk_visita_items_precio CHECK (precio_sugerido >= 0)
);

CREATE INDEX IF NOT EXISTS idx_visita_items_visita_id ON visita_items(visita_id);
