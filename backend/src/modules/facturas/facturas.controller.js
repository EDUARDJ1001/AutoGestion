const facturasModel = require('./facturas.model');
const visitasModel = require('../visitas/visitas.model');
const inventarioModel = require('../inventario/inventario.model');
const { successResponse, errorResponse } = require('../../utils/responses');

const normalizeNullableString = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
};

// Construye las lineas propuestas a partir de los servicios y productos ya registrados.
const buildBorrador = async (visitaId) => {
  const [servicios, productos] = await Promise.all([
    visitasModel.getServicios(visitaId),
    inventarioModel.listProductosUsadosByVisita(visitaId)
  ]);

  const lineasServicios = servicios.map((s) => ({
    tipo: 'Servicio',
    descripcion: [s.servicio_nombre, s.descripcion_adicional].filter(Boolean).join(' - '),
    cantidad: Number(s.cantidad) || 1,
    precio_unitario: Number(s.precio_acordado) || 0
  }));

  const lineasMateriales = productos.map((p) => ({
    tipo: 'Material',
    descripcion: [p.codigo, p.producto_nombre, p.producto_marca].filter(Boolean).join(' - '),
    cantidad: Number(p.cantidad) || 1,
    precio_unitario: Number(p.precio_referencia) || 0
  }));

  return [...lineasServicios, ...lineasMateriales];
};

const getResumen = async (req, res) => {
  const visitaId = Number(req.params.visitaId);
  const visita = await visitasModel.findById(visitaId);

  if (!visita) {
    return errorResponse(res, 'Visita no encontrada', undefined, 404);
  }

  const facturaExistente = await facturasModel.findByVisitaId(visitaId);
  const borrador = facturaExistente ? [] : await buildBorrador(visitaId);

  return successResponse(res, 'Resumen de cobro obtenido correctamente', {
    visita,
    factura: facturaExistente,
    borrador
  });
};

const emitir = async (req, res) => {
  const visitaId = Number(req.params.visitaId);
  const visita = await visitasModel.findById(visitaId);

  if (!visita) {
    return errorResponse(res, 'Visita no encontrada', undefined, 404);
  }

  const existente = await facturasModel.findByVisitaId(visitaId);
  if (existente) {
    return errorResponse(res, `Esta visita ya tiene una factura emitida (${existente.numero})`, undefined, 409);
  }

  const lineas = Array.isArray(req.body.lineas) ? req.body.lineas : [];
  const lineasValidas = lineas
    .map((linea) => ({
      tipo: linea.tipo === 'Material' ? 'Material' : 'Servicio',
      descripcion: normalizeNullableString(linea.descripcion),
      cantidad: Number(linea.cantidad),
      precio_unitario: Number(linea.precio_unitario)
    }))
    .filter((linea) => linea.descripcion && Number.isFinite(linea.cantidad) && linea.cantidad > 0 && Number.isFinite(linea.precio_unitario) && linea.precio_unitario >= 0);

  if (!lineasValidas.length) {
    return errorResponse(res, 'Agrega al menos una linea valida para emitir la factura', undefined, 400);
  }

  const factura = await facturasModel.create(visitaId, {
    lineas: lineasValidas,
    observaciones: normalizeNullableString(req.body.observaciones),
    emitidaPor: req.user.id
  });

  return successResponse(res, 'Factura emitida correctamente', { factura }, 201);
};

const getFactura = async (req, res) => {
  const factura = await facturasModel.findById(Number(req.params.id));

  if (!factura) {
    return errorResponse(res, 'Factura no encontrada', undefined, 404);
  }

  const visita = await visitasModel.findById(factura.visita_id);

  return successResponse(res, 'Factura obtenida correctamente', { factura, visita });
};

module.exports = {
  getResumen,
  emitir,
  getFactura
};
