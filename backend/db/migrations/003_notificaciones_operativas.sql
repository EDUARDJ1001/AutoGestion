CREATE TABLE IF NOT EXISTS notificaciones (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(60) NOT NULL,
  titulo VARCHAR(180) NOT NULL,
  mensaje TEXT NOT NULL,
  severidad VARCHAR(20) NOT NULL DEFAULT 'info',
  roles_destino TEXT[] NOT NULL DEFAULT ARRAY['Admin', 'Cajero'],
  usuario_destino_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  visita_id INTEGER REFERENCES visitas(id) ON DELETE CASCADE,
  vehiculo_id INTEGER REFERENCES vehiculos(id) ON DELETE CASCADE,
  clave_unica VARCHAR(180) NOT NULL UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  resuelta BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_resuelta TIMESTAMP,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_notificaciones_severidad CHECK (severidad IN ('info', 'warning', 'danger', 'success'))
);

CREATE TABLE IF NOT EXISTS notificacion_lecturas (
  notificacion_id INTEGER NOT NULL REFERENCES notificaciones(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha_leida TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (notificacion_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_roles ON notificaciones USING GIN (roles_destino);
CREATE INDEX IF NOT EXISTS idx_notificaciones_visita ON notificaciones(visita_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_vehiculo ON notificaciones(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha ON notificaciones(fecha_creacion DESC);
