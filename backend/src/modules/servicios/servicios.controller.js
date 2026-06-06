const serviciosModel = require('./servicios.model');
const { successResponse, errorResponse } = require('../../utils/responses');

const normalizeNullableString = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
};

const normalizeNullableNumber = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  return Number(value);
};

const buildPayload = (body, partial = false) => {
  const fields = {};
  const assign = (field, value) => {
    if (!partial || body[field] !== undefined) {
      fields[field] = value;
    }
  };

  assign('categoria_servicio_id', normalizeNullableNumber(body.categoria_servicio_id));
  assign('nombre', body.nombre !== undefined ? String(body.nombre).trim() : undefined);
  assign('descripcion', normalizeNullableString(body.descripcion));
  assign('precio_sugerido', normalizeNullableNumber(body.precio_sugerido));
  assign('tiempo_estimado_minutos', normalizeNullableNumber(body.tiempo_estimado_minutos));
  assign('estado', body.estado !== undefined ? String(body.estado).trim() : undefined);

  return fields;
};

const mapDatabaseError = (error, res) => {
  if (error.code === '23505') {
    return errorResponse(res, 'Ya existe un servicio con ese nombre', error.detail, 409);
  }

  if (error.code === '23503') {
    return errorResponse(res, 'La categoria indicada no existe', error.detail, 400);
  }

  throw error;
};

const ensureCategoria = async (categoriaId, res) => {
  const exists = await serviciosModel.categoriaExists(categoriaId);

  if (!exists) {
    errorResponse(res, 'La categoria indicada no existe o esta inactiva', undefined, 400);
    return false;
  }

  return true;
};

const listCategorias = async (req, res) => {
  const categorias = await serviciosModel.listCategorias({
    estado: req.query.estado
  });

  return successResponse(res, 'Categorias de servicio obtenidas correctamente', {
    categorias
  });
};

const listServicios = async (req, res) => {
  const servicios = await serviciosModel.list({
    search: req.query.search,
    estado: req.query.estado,
    categoriaServicioId: req.query.categoria_servicio_id
  });

  return successResponse(res, 'Servicios obtenidos correctamente', {
    servicios
  });
};

const createServicio = async (req, res) => {
  try {
    const payload = buildPayload(req.body);

    if (!(await ensureCategoria(payload.categoria_servicio_id, res))) {
      return undefined;
    }

    const servicio = await serviciosModel.create(payload);

    return successResponse(res, 'Servicio creado correctamente', { servicio }, 201);
  } catch (error) {
    return mapDatabaseError(error, res);
  }
};

const updateServicio = async (req, res) => {
  try {
    const payload = buildPayload(req.body, true);

    if (payload.categoria_servicio_id !== undefined && !(await ensureCategoria(payload.categoria_servicio_id, res))) {
      return undefined;
    }

    const servicio = await serviciosModel.update(Number(req.params.id), payload);

    if (!servicio) {
      return errorResponse(res, 'Servicio no encontrado', undefined, 404);
    }

    return successResponse(res, 'Servicio actualizado correctamente', { servicio });
  } catch (error) {
    return mapDatabaseError(error, res);
  }
};

const updateEstado = async (req, res) => {
  const servicio = await serviciosModel.updateEstado(Number(req.params.id), req.body.estado);

  if (!servicio) {
    return errorResponse(res, 'Servicio no encontrado', undefined, 404);
  }

  return successResponse(res, 'Estado de servicio actualizado correctamente', { servicio });
};

module.exports = {
  listCategorias,
  listServicios,
  createServicio,
  updateServicio,
  updateEstado
};
