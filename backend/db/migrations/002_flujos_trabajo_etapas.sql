DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'estado_etapa_visita'
  ) THEN
    CREATE TYPE estado_etapa_visita AS ENUM (
      'Pendiente',
      'En proceso',
      'Completado',
      'Omitido'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS flujos_trabajo (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  descripcion TEXT,
  estado estado_general NOT NULL DEFAULT 'Activo',
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flujo_etapas (
  id SERIAL PRIMARY KEY,
  flujo_trabajo_id INTEGER NOT NULL REFERENCES flujos_trabajo(id) ON DELETE CASCADE,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  orden INTEGER NOT NULL,
  duracion_estimada_horas INTEGER,
  alerta_sin_avance_horas INTEGER NOT NULL DEFAULT 24,
  estado estado_general NOT NULL DEFAULT 'Activo',
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_flujo_etapas_orden UNIQUE (flujo_trabajo_id, orden),
  CONSTRAINT uq_flujo_etapas_nombre UNIQUE (flujo_trabajo_id, nombre),
  CONSTRAINT chk_flujo_etapas_orden CHECK (orden > 0),
  CONSTRAINT chk_flujo_etapas_duracion CHECK (duracion_estimada_horas IS NULL OR duracion_estimada_horas > 0),
  CONSTRAINT chk_flujo_etapas_alerta CHECK (alerta_sin_avance_horas > 0)
);

ALTER TABLE visitas
  ADD COLUMN IF NOT EXISTS flujo_trabajo_id INTEGER REFERENCES flujos_trabajo(id),
  ADD COLUMN IF NOT EXISTS fecha_ultima_actividad TIMESTAMP NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS visita_etapas (
  id SERIAL PRIMARY KEY,
  visita_id INTEGER NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
  flujo_etapa_id INTEGER REFERENCES flujo_etapas(id) ON DELETE SET NULL,
  nombre_etapa VARCHAR(150) NOT NULL,
  descripcion TEXT,
  orden INTEGER NOT NULL,
  estado estado_etapa_visita NOT NULL DEFAULT 'Pendiente',
  fecha_inicio TIMESTAMP,
  fecha_fin TIMESTAMP,
  actualizado_por INTEGER REFERENCES usuarios(id),
  observaciones TEXT,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_visita_etapas_orden UNIQUE (visita_id, orden),
  CONSTRAINT chk_visita_etapas_orden CHECK (orden > 0),
  CONSTRAINT chk_visita_etapas_fechas CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_flujo_etapas_flujo_orden ON flujo_etapas(flujo_trabajo_id, orden);
CREATE INDEX IF NOT EXISTS idx_visita_etapas_visita_orden ON visita_etapas(visita_id, orden);
CREATE INDEX IF NOT EXISTS idx_visita_etapas_estado ON visita_etapas(estado);
CREATE INDEX IF NOT EXISTS idx_visitas_flujo_trabajo_id ON visitas(flujo_trabajo_id);
CREATE INDEX IF NOT EXISTS idx_visitas_fecha_ultima_actividad ON visitas(fecha_ultima_actividad);

INSERT INTO flujos_trabajo (nombre, descripcion)
VALUES
  ('Pintura', 'Proceso detallado para trabajos de pintura y acabado.'),
  ('Mecánica general', 'Diagnóstico y reparación mecánica general.'),
  ('Frenos', 'Revisión, cambio y prueba del sistema de frenos.'),
  ('Revisión', 'Inspección y diagnóstico general del vehículo.'),
  ('Enderezado', 'Proceso de enderezado y corrección estructural.')
ON CONFLICT (nombre) DO UPDATE
SET descripcion = EXCLUDED.descripcion,
    estado = 'Activo'::estado_general,
    fecha_actualizacion = NOW();

WITH etapas(nombre_flujo, orden, nombre, descripcion, duracion, alerta) AS (
  VALUES
    ('Pintura', 1, 'Revisión inicial', 'Inspección del daño y alcance del trabajo.', 4, 24),
    ('Pintura', 2, 'Enderezado', 'Corrección de golpes o deformaciones previo a pintura.', 16, 24),
    ('Pintura', 3, 'Preparación', 'Lijado, limpieza y preparación de superficie.', 12, 24),
    ('Pintura', 4, 'Aplicando base', 'Aplicación de base o primer.', 8, 24),
    ('Pintura', 5, 'Pintura', 'Aplicación de pintura.', 8, 24),
    ('Pintura', 6, 'Secado', 'Tiempo de secado y curado.', 24, 36),
    ('Pintura', 7, 'Pulido', 'Pulido y acabado final.', 8, 24),
    ('Pintura', 8, 'Control final', 'Revisión final de acabado y entrega.', 4, 24),
    ('Mecánica general', 1, 'Recepción y diagnóstico', 'Revisión inicial del problema reportado.', 4, 24),
    ('Mecánica general', 2, 'Desarme/revisión', 'Inspección de componentes involucrados.', 8, 24),
    ('Mecánica general', 3, 'Reparación', 'Ejecución de la reparación.', 12, 24),
    ('Mecánica general', 4, 'Prueba', 'Prueba funcional del vehículo.', 4, 24),
    ('Mecánica general', 5, 'Control final', 'Validación final antes de entrega.', 2, 24),
    ('Frenos', 1, 'Revisión inicial', 'Inspección del sistema de frenos.', 2, 24),
    ('Frenos', 2, 'Desmontaje', 'Desmontaje de piezas necesarias.', 2, 24),
    ('Frenos', 3, 'Cambio/reparación', 'Cambio o reparación de componentes.', 4, 24),
    ('Frenos', 4, 'Purga y ajuste', 'Purga, ajuste y calibración.', 2, 24),
    ('Frenos', 5, 'Prueba de frenado', 'Prueba final de seguridad.', 2, 24),
    ('Revisión', 1, 'Recepción', 'Ingreso y datos iniciales.', 1, 24),
    ('Revisión', 2, 'Inspección visual', 'Revisión visual general.', 2, 24),
    ('Revisión', 3, 'Diagnóstico', 'Pruebas y diagnóstico.', 4, 24),
    ('Revisión', 4, 'Reporte', 'Registro de hallazgos y recomendación.', 2, 24),
    ('Enderezado', 1, 'Revisión del golpe', 'Evaluación del daño.', 4, 24),
    ('Enderezado', 2, 'Desarme', 'Retiro de piezas necesarias.', 4, 24),
    ('Enderezado', 3, 'Enderezado', 'Corrección del daño.', 16, 24),
    ('Enderezado', 4, 'Ajuste de piezas', 'Alineación y montaje preliminar.', 8, 24),
    ('Enderezado', 5, 'Control final', 'Validación del enderezado.', 4, 24)
)
INSERT INTO flujo_etapas (
  flujo_trabajo_id,
  orden,
  nombre,
  descripcion,
  duracion_estimada_horas,
  alerta_sin_avance_horas
)
SELECT
  ft.id,
  e.orden,
  e.nombre,
  e.descripcion,
  e.duracion,
  e.alerta
FROM etapas e
INNER JOIN flujos_trabajo ft ON ft.nombre = e.nombre_flujo
ON CONFLICT (flujo_trabajo_id, orden) DO UPDATE
SET nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    duracion_estimada_horas = EXCLUDED.duracion_estimada_horas,
    alerta_sin_avance_horas = EXCLUDED.alerta_sin_avance_horas,
    estado = 'Activo'::estado_general,
    fecha_actualizacion = NOW();

CREATE OR REPLACE VIEW vista_progreso_visitas AS
WITH etapa_resumen AS (
  SELECT
    ve.visita_id,
    COUNT(*)::int AS total_etapas,
    COUNT(*) FILTER (WHERE ve.estado = 'Completado'::estado_etapa_visita)::int AS etapas_completadas,
    COUNT(*) FILTER (WHERE ve.estado = 'En proceso'::estado_etapa_visita)::int AS etapas_en_proceso,
    MAX(ve.fecha_actualizacion) AS ultima_actividad_etapa
  FROM visita_etapas ve
  GROUP BY ve.visita_id
),
etapa_actual AS (
  SELECT DISTINCT ON (ve.visita_id)
    ve.visita_id,
    ve.id AS visita_etapa_id,
    ve.nombre_etapa,
    ve.estado AS estado_etapa,
    ve.orden,
    fe.alerta_sin_avance_horas
  FROM visita_etapas ve
  LEFT JOIN flujo_etapas fe ON fe.id = ve.flujo_etapa_id
  WHERE ve.estado IN ('En proceso'::estado_etapa_visita, 'Pendiente'::estado_etapa_visita)
  ORDER BY
    ve.visita_id,
    CASE WHEN ve.estado = 'En proceso'::estado_etapa_visita THEN 0 ELSE 1 END,
    ve.orden ASC
)
SELECT
  v.id AS visita_id,
  v.cliente_id,
  c.nombre AS cliente,
  v.vehiculo_id,
  ve.placa,
  ve.marca,
  ve.modelo,
  v.mecanico_asignado_id,
  CONCAT(um.nombre, ' ', um.apellido) AS mecanico_asignado,
  v.estado AS estado_visita,
  v.flujo_trabajo_id,
  ft.nombre AS flujo_trabajo,
  COALESCE(er.total_etapas, 0) AS total_etapas,
  COALESCE(er.etapas_completadas, 0) AS etapas_completadas,
  COALESCE(er.etapas_en_proceso, 0) AS etapas_en_proceso,
  CASE
    WHEN COALESCE(er.total_etapas, 0) = 0 THEN 0
    ELSE ROUND((er.etapas_completadas::numeric / er.total_etapas::numeric) * 100, 2)
  END AS porcentaje_avance,
  ea.visita_etapa_id,
  ea.nombre_etapa AS etapa_actual,
  ea.estado_etapa,
  GREATEST(
    COALESCE(v.fecha_ultima_actividad, v.fecha_actualizacion, v.fecha_creacion),
    COALESCE(er.ultima_actividad_etapa, v.fecha_actualizacion, v.fecha_creacion)
  ) AS fecha_ultima_actividad,
  ROUND(
    EXTRACT(EPOCH FROM (
      NOW() - GREATEST(
        COALESCE(v.fecha_ultima_actividad, v.fecha_actualizacion, v.fecha_creacion),
        COALESCE(er.ultima_actividad_etapa, v.fecha_actualizacion, v.fecha_creacion)
      )
    )) / 3600,
    2
  ) AS horas_sin_avance,
  CASE
    WHEN v.estado IN ('Entregado'::estado_visita, 'Cancelado'::estado_visita) THEN false
    WHEN ROUND(
      EXTRACT(EPOCH FROM (
        NOW() - GREATEST(
          COALESCE(v.fecha_ultima_actividad, v.fecha_actualizacion, v.fecha_creacion),
          COALESCE(er.ultima_actividad_etapa, v.fecha_actualizacion, v.fecha_creacion)
        )
      )) / 3600,
      2
    ) >= COALESCE(ea.alerta_sin_avance_horas, 24) THEN true
    ELSE false
  END AS alerta_sin_avance
FROM visitas v
INNER JOIN clientes c ON c.id = v.cliente_id
INNER JOIN vehiculos ve ON ve.id = v.vehiculo_id
LEFT JOIN usuarios um ON um.id = v.mecanico_asignado_id
LEFT JOIN flujos_trabajo ft ON ft.id = v.flujo_trabajo_id
LEFT JOIN etapa_resumen er ON er.visita_id = v.id
LEFT JOIN etapa_actual ea ON ea.visita_id = v.id;
