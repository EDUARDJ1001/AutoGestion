const inventarioModel = require('./inventario.model');
const { successResponse, errorResponse } = require('../../utils/responses');

const normalizeNullableString = (value, uppercase = false) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = String(value).trim();

  if (!trimmed) {
    return null;
  }

  return uppercase ? trimmed.toUpperCase() : trimmed;
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

const buildProductoPayload = (body, partial = false) => {
  const fields = {};
  const assign = (field, value) => {
    if (!partial || body[field] !== undefined) {
      fields[field] = value;
    }
  };

  assign('categoria_producto_id', normalizeNullableNumber(body.categoria_producto_id));
  assign('codigo', normalizeNullableString(body.codigo, true));
  assign('nombre', body.nombre !== undefined ? String(body.nombre).trim() : undefined);
  assign('marca', normalizeNullableString(body.marca));
  assign('descripcion', normalizeNullableString(body.descripcion));
  assign('unidad_medida', body.unidad_medida !== undefined ? String(body.unidad_medida).trim() : undefined);
  assign('stock_minimo', normalizeNullableNumber(body.stock_minimo));
  assign('costo_promedio', normalizeNullableNumber(body.costo_promedio));
  assign('precio_referencia', normalizeNullableNumber(body.precio_referencia));
  assign('estado', body.estado !== undefined ? String(body.estado).trim() : undefined);

  return fields;
};

const mapDatabaseError = (error, res) => {
  if (error.code === '23505') {
    return errorResponse(res, 'Ya existe un producto o categoria con esos datos', error.detail, 409);
  }

  if (error.code === '23503') {
    return errorResponse(res, 'Una referencia indicada no existe', error.detail, 400);
  }

  if (error.message?.includes('Stock insuficiente')) {
    return errorResponse(res, error.message, undefined, 400);
  }

  if (error.message?.includes('cantidad debe ser mayor')) {
    return errorResponse(res, error.message, undefined, 400);
  }

  throw error;
};

const ensureCategoria = async (categoriaId, res) => {
  const exists = await inventarioModel.categoriaExists(categoriaId);

  if (!exists) {
    errorResponse(res, 'La categoria indicada no existe o esta inactiva', undefined, 400);
    return false;
  }

  return true;
};

const ensureProductoActivo = async (productoId, res) => {
  const exists = await inventarioModel.productoActivo(productoId);

  if (!exists) {
    errorResponse(res, 'El producto indicado no existe o esta inactivo', undefined, 400);
    return false;
  }

  return true;
};

const listCategorias = async (req, res) => {
  const categorias = await inventarioModel.listCategorias({
    estado: req.query.estado
  });

  return successResponse(res, 'Categorias de producto obtenidas correctamente', {
    categorias
  });
};

const listProductos = async (req, res) => {
  const productos = await inventarioModel.listProductos({
    search: req.query.search,
    estado: req.query.estado,
    categoriaProductoId: req.query.categoria_producto_id,
    stockBajo: req.query.stock_bajo === 'true'
  });

  return successResponse(res, 'Productos obtenidos correctamente', {
    productos
  });
};

const getProducto = async (req, res) => {
  const producto = await inventarioModel.findProductoById(Number(req.params.id));

  if (!producto) {
    return errorResponse(res, 'Producto no encontrado', undefined, 404);
  }

  return successResponse(res, 'Producto obtenido correctamente', { producto });
};

const createProducto = async (req, res) => {
  try {
    const payload = buildProductoPayload(req.body);
    const stockInicial = normalizeNullableNumber(req.body.stock_inicial) || 0;

    if (!(await ensureCategoria(payload.categoria_producto_id, res))) {
      return undefined;
    }

    const producto = await inventarioModel.createProducto(payload, req.user.id, stockInicial);

    return successResponse(res, 'Producto creado correctamente', { producto }, 201);
  } catch (error) {
    return mapDatabaseError(error, res);
  }
};

const updateProducto = async (req, res) => {
  try {
    const payload = buildProductoPayload(req.body, true);

    if (payload.categoria_producto_id !== undefined && !(await ensureCategoria(payload.categoria_producto_id, res))) {
      return undefined;
    }

    const producto = await inventarioModel.updateProducto(Number(req.params.id), payload);

    if (!producto) {
      return errorResponse(res, 'Producto no encontrado', undefined, 404);
    }

    return successResponse(res, 'Producto actualizado correctamente', { producto });
  } catch (error) {
    return mapDatabaseError(error, res);
  }
};

const updateProductoEstado = async (req, res) => {
  const producto = await inventarioModel.updateProductoEstado(Number(req.params.id), req.body.estado);

  if (!producto) {
    return errorResponse(res, 'Producto no encontrado', undefined, 404);
  }

  return successResponse(res, 'Estado de producto actualizado correctamente', { producto });
};

const registrarMovimiento = async (req, res) => {
  try {
    const productoId = Number(req.body.producto_id);

    if (!(await ensureProductoActivo(productoId, res))) {
      return undefined;
    }

    if (req.body.visita_id) {
      const visitaExists = await inventarioModel.visitaExists(Number(req.body.visita_id));

      if (!visitaExists) {
        return errorResponse(res, 'La visita indicada no existe', undefined, 400);
      }
    }

    const movimiento = await inventarioModel.aplicarMovimiento({
      productoId,
      usuarioId: req.user.id,
      visitaId: normalizeNullableNumber(req.body.visita_id),
      tipoMovimiento: req.body.tipo_movimiento,
      cantidad: Number(req.body.cantidad),
      motivo: normalizeNullableString(req.body.motivo),
      observaciones: normalizeNullableString(req.body.observaciones)
    });

    const producto = await inventarioModel.findProductoById(productoId);

    return successResponse(res, 'Movimiento de inventario registrado correctamente', {
      movimiento,
      producto
    }, 201);
  } catch (error) {
    return mapDatabaseError(error, res);
  }
};

const listMovimientos = async (req, res) => {
  const movimientos = await inventarioModel.listMovimientos({
    productoId: req.query.producto_id,
    tipoMovimiento: req.query.tipo_movimiento,
    visitaId: req.query.visita_id,
    dateFrom: req.query.desde,
    dateTo: req.query.hasta
  });

  return successResponse(res, 'Movimientos de inventario obtenidos correctamente', {
    movimientos
  });
};

const listStockBajo = async (req, res) => {
  const productos = await inventarioModel.listStockBajo();

  return successResponse(res, 'Productos con stock bajo obtenidos correctamente', {
    productos
  });
};

const registrarProductoUsado = async (req, res) => {
  try {
    const visitaId = Number(req.params.id);
    const productoId = Number(req.body.producto_id);

    const visitaExists = await inventarioModel.visitaExists(visitaId);

    if (!visitaExists) {
      return errorResponse(res, 'Visita no encontrada', undefined, 404);
    }

    if (!(await ensureProductoActivo(productoId, res))) {
      return undefined;
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
    return mapDatabaseError(error, res);
  }
};

module.exports = {
  listCategorias,
  listProductos,
  getProducto,
  createProducto,
  updateProducto,
  updateProductoEstado,
  registrarMovimiento,
  listMovimientos,
  listStockBajo,
  registrarProductoUsado
};
