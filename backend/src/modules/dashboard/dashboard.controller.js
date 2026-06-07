const dashboardModel = require('./dashboard.model');
const { successResponse } = require('../../utils/responses');

const getVisitasActivas = async (req, res) => {
  const visitas = await dashboardModel.getVisitasActivas();

  return successResponse(res, 'Visitas activas obtenidas correctamente', {
    visitas
  });
};

const getStockBajo = async (req, res) => {
  const productos = await dashboardModel.getStockBajo();

  return successResponse(res, 'Stock bajo obtenido correctamente', {
    productos
  });
};

const getResumen = async (req, res) => {
  const [
    visitas,
    inventario,
    visitasPorEstado,
    visitasRecientes,
    stockBajo,
    progresoVisitas
  ] = await Promise.all([
    dashboardModel.getResumenVisitas(),
    dashboardModel.getResumenInventario(),
    dashboardModel.getVisitasPorEstado(),
    dashboardModel.getIngresosRecientes(10),
    dashboardModel.getStockBajo(),
    dashboardModel.getProgresoVisitas(20)
  ]);

  return successResponse(res, 'Resumen de dashboard obtenido correctamente', {
    tarjetas: {
      vehiculos_activos_taller: visitas.vehiculos_activos_taller,
      visitas_en_proceso: visitas.visitas_en_proceso,
      visitas_en_espera_repuesto: visitas.visitas_en_espera_repuesto,
      finalizadas_pendientes_entrega: visitas.finalizadas_pendientes_entrega,
      productos_stock_bajo: inventario.productos_stock_bajo
    },
    visitas,
    inventario,
    visitas_por_estado: visitasPorEstado,
    visitas_recientes: visitasRecientes,
    stock_bajo: stockBajo.slice(0, 10),
    progreso_visitas: progresoVisitas
  });
};

const getProgresoVisitas = async (req, res) => {
  const visitas = await dashboardModel.getProgresoVisitas(Number(req.query.limit || 20));

  return successResponse(res, 'Progreso de visitas obtenido correctamente', {
    visitas
  });
};

module.exports = {
  getVisitasActivas,
  getStockBajo,
  getResumen,
  getProgresoVisitas
};
