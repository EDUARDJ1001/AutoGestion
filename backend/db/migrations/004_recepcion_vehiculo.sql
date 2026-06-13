CREATE TABLE IF NOT EXISTS visita_recepciones (
  id SERIAL PRIMARY KEY,
  visita_id INTEGER NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
  nivel_combustible INTEGER,
  exteriores JSONB NOT NULL DEFAULT '{}'::jsonb,
  interiores JSONB NOT NULL DEFAULT '{}'::jsonb,
  accesorios JSONB NOT NULL DEFAULT '{}'::jsonb,
  componentes_mecanicos JSONB NOT NULL DEFAULT '{}'::jsonb,
  trabajo_a_realizar TEXT,
  comentarios_cliente TEXT,
  autoriza_presupuesto_previo BOOLEAN NOT NULL DEFAULT false,
  autoriza_sin_presupuesto BOOLEAN NOT NULL DEFAULT false,
  autoriza_pruebas BOOLEAN NOT NULL DEFAULT false,
  acepta_condiciones BOOLEAN NOT NULL DEFAULT false,
  nombre_aceptacion VARCHAR(150),
  firma_cliente TEXT,
  recibido_por INTEGER REFERENCES usuarios(id),
  fecha_recepcion TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_visita_recepciones_visita UNIQUE (visita_id),
  CONSTRAINT chk_visita_recepciones_combustible CHECK (
    nivel_combustible IS NULL OR (nivel_combustible >= 0 AND nivel_combustible <= 100)
  )
);

CREATE INDEX IF NOT EXISTS idx_visita_recepciones_visita_id ON visita_recepciones(visita_id);
CREATE INDEX IF NOT EXISTS idx_visita_recepciones_recibido_por ON visita_recepciones(recibido_por);

