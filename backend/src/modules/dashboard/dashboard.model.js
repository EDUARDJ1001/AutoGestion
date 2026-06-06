const { query } = require('../../config/db');

const getVisitasActivas = async () => {
  const result = await query(
    `
      SELECT *
      FROM vista_dashboard_visitas_activas
      ORDER BY fecha_ingreso DESC, visita_id DESC
    `
  );

  return result.rows;
};

const getStockBajo = async () => {
  const result = await query(
    `
      SELECT *
      FROM vista_stock_bajo
      ORDER BY nombre ASC
    `
  );

  return result.rows;
};

const getResumenVisitas = async () => {
  const result = await query(
    `
      SELECT
        COUNT(*) FILTER (
          WHERE estado NOT IN ('Entregado'::estado_visita, 'Cancelado'::estado_visita)
        )::int AS vehiculos_activos_taller,
        COUNT(*) FILTER (
          WHERE estado IN ('En diagnóstico'::estado_visita, 'Pendiente de aprobación'::estado_visita, 'En proceso'::estado_visita, 'En prueba'::estado_visita)
        )::int AS visitas_en_proceso,
        COUNT(*) FILTER (
          WHERE estado = 'En espera de repuesto'::estado_visita
        )::int AS visitas_en_espera_repuesto,
        COUNT(*) FILTER (
          WHERE estado = 'Finalizado'::estado_visita
        )::int AS finalizadas_pendientes_entrega,
        COUNT(*) FILTER (
          WHERE estado = 'Recibido'::estado_visita
        )::int AS visitas_recibidas,
        COUNT(*) FILTER (
          WHERE estado = 'Entregado'::estado_visita
        )::int AS visitas_entregadas,
        COUNT(*) FILTER (
          WHERE estado = 'Cancelado'::estado_visita
        )::int AS visitas_canceladas,
        COUNT(*)::int AS total_visitas
      FROM visitas
    `
  );

  return result.rows[0];
};

const getResumenInventario = async () => {
  const result = await query(
    `
      SELECT
        COUNT(*)::int AS total_productos,
        COUNT(*) FILTER (WHERE estado = 'Activo'::estado_general)::int AS productos_activos,
        COUNT(*) FILTER (WHERE stock_actual <= stock_minimo)::int AS productos_stock_bajo,
        COALESCE(SUM(stock_actual * COALESCE(costo_promedio, 0)), 0)::numeric(14, 2) AS valor_inventario_costo,
        COALESCE(SUM(stock_actual * COALESCE(precio_referencia, 0)), 0)::numeric(14, 2) AS valor_inventario_referencia
      FROM productos
    `
  );

  return result.rows[0];
};

const getVisitasPorEstado = async () => {
  const result = await query(
    `
      SELECT
        estado,
        COUNT(*)::int AS total
      FROM visitas
      GROUP BY estado
      ORDER BY estado ASC
    `
  );

  return result.rows;
};

const getIngresosRecientes = async (limit = 10) => {
  const result = await query(
    `
      SELECT *
      FROM vista_dashboard_visitas_activas
      ORDER BY fecha_ingreso DESC, visita_id DESC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows;
};

module.exports = {
  getVisitasActivas,
  getStockBajo,
  getResumenVisitas,
  getResumenInventario,
  getVisitasPorEstado,
  getIngresosRecientes
};
