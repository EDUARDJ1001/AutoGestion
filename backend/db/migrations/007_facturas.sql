-- Facturas / comprobantes emitidos: snapshot de lo cobrado por visita.
-- Idempotente.

CREATE SEQUENCE IF NOT EXISTS factura_numero_seq START 1;

CREATE TABLE IF NOT EXISTS facturas (
  id SERIAL PRIMARY KEY,
  visita_id INTEGER NOT NULL REFERENCES visitas(id),
  numero VARCHAR(40) NOT NULL UNIQUE,
  subtotal_servicios NUMERIC(12, 2) NOT NULL DEFAULT 0,
  subtotal_materiales NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  observaciones TEXT,
  emitida_por INTEGER REFERENCES usuarios(id),
  estado VARCHAR(20) NOT NULL DEFAULT 'Emitida',
  fecha_emision TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facturas_visita_id ON facturas(visita_id);

CREATE TABLE IF NOT EXISTS factura_lineas (
  id SERIAL PRIMARY KEY,
  factura_id INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  cantidad NUMERIC(10, 2) NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  CONSTRAINT chk_factura_lineas_tipo CHECK (tipo IN ('Servicio', 'Material'))
);

CREATE INDEX IF NOT EXISTS idx_factura_lineas_factura_id ON factura_lineas(factura_id);
