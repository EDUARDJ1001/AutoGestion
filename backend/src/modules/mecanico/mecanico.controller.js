const mecanicoModel = require('./mecanico.model');
const visitasModel = require('../visitas/visitas.model');
const inventarioModel = require('../inventario/inventario.model');
const { successResponse, errorResponse } = require('../../utils/responses');
const { cleanupUploadedFile } = require('../../middlewares/uploadMiddleware');

const normalizeNullableString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
};

const enrichTrabajo = async (trabajo) => {
  const [servicios, productos, fotos, bitacora] = await Promise.all([
    visitasModel.getServicios(trabajo.id),
    inventarioModel.listProductosUsadosByVisita(trabajo.id),
    visitasModel.getFotos(trabajo.id),
    visitasModel.getBitacora(trabajo.id)
  ]);

  return {
    visita: trabajo,
    servicios,
    productos,
    fotos,
    bitacora
  };
};

const listMisTrabajos = async (req, res) => {
  const trabajos = await mecanicoModel.listMisTrabajos(req.user.id, {
    estado: req.query.estado,
    activas: req.query.activas !== 'false'
  });

  return successResponse(res, 'Trabajos asignados obtenidos correctamente', {
    trabajos
  });
};

const getMiTrabajo = async (req, res) => {
  const trabajo = await mecanicoModel.findTrabajoById(req.user.id, Number(req.params.id));

  if (!trabajo) {
    return errorResponse(res, 'Trabajo no encontrado o no asignado a este mecanico', undefined, 404);
  }

  return successResponse(res, 'Trabajo asignado obtenido correctamente', await enrichTrabajo(trabajo));
};

const updateEstado = async (req, res) => {
  const trabajo = await mecanicoModel.updateEstado(req.user.id, Number(req.params.id), {
    estado: req.body.estado,
    observaciones: normalizeNullableString(req.body.observaciones),
    diagnostico: normalizeNullableString(req.body.diagnostico)
  });

  if (!trabajo) {
    return errorResponse(res, 'Trabajo no encontrado o no asignado a este mecanico', undefined, 404);
  }

  return successResponse(res, 'Estado de trabajo actualizado correctamente', await enrichTrabajo(trabajo));
};

const addProductoUsado = async (req, res) => {
  try {
    const visitaId = Number(req.params.id);
    const trabajo = await mecanicoModel.findTrabajoById(req.user.id, visitaId);

    if (!trabajo) {
      return errorResponse(res, 'Trabajo no encontrado o no asignado a este mecanico', undefined, 404);
    }

    const productoId = Number(req.body.producto_id);
    const productoActivo = await inventarioModel.productoActivo(productoId);

    if (!productoActivo) {
      return errorResponse(res, 'El producto indicado no existe o esta inactivo', undefined, 400);
    }

    const productoUsado = await inventarioModel.registrarProductoUsado({
      visitaId,
      productoId,
      usuarioId: req.user.id,
      cantidad: Number(req.body.cantidad),
      observaciones: normalizeNullableString(req.body.observaciones)
    });
    const productos = await inventarioModel.listProductosUsadosByVisita(visitaId);
    const producto = await inventarioModel.findProductoById(productoId);

    return successResponse(res, 'Producto usado registrado correctamente', {
      producto_usado: productoUsado,
      productos,
      producto
    }, 201);
  } catch (error) {
    if (error.message?.includes('Stock insuficiente')) {
      return errorResponse(res, error.message, undefined, 400);
    }

    throw error;
  }
};

const addFoto = async (req, res) => {
  const visitaId = Number(req.params.id);
  const trabajo = await mecanicoModel.findTrabajoById(req.user.id, visitaId);

  if (!trabajo) {
    cleanupUploadedFile(req.file);
    return errorResponse(res, 'Trabajo no encontrado o no asignado a este mecanico', undefined, 404);
  }

  if (!req.file) {
    return errorResponse(res, 'La foto es requerida', undefined, 400);
  }

  const foto = await visitasModel.addFoto(visitaId, {
    tipo: req.body.tipo || 'Avance',
    url_archivo: `/uploads/visitas/${req.file.filename}`,
    nombre_archivo: req.file.originalname,
    descripcion: normalizeNullableString(req.body.descripcion),
    subido_por: req.user.id
  });
  const fotos = await visitasModel.getFotos(visitaId);

  return successResponse(res, 'Foto de avance cargada correctamente', {
    foto,
    fotos
  }, 201);
};

module.exports = {
  listMisTrabajos,
  getMiTrabajo,
  updateEstado,
  addProductoUsado,
  addFoto
};
