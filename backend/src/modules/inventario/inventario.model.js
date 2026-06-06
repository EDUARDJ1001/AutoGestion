const { query, transaction } = require('../../config/db');

const PRODUCTO_SELECT = `
  p.id,
  p.categoria_producto_id,
  cp.nombre AS categoria_nombre,
  p.codigo,
  p.nombre,
  p.marca,
  p.descripcion,
  p.unidad_medida,
  p.stock_actual,
  p.stock_minimo,
  p.costo_promedio,
  p.precio_referencia,
  p.estado,
  p.fecha_creacion,
  p.fecha_actualizacion
`;

const CATEGORIA_SELECT = `
  id,
  nombre,
  descripcion,
  estado,
  fecha_creacion
`;

const MOVIMIENTO_SELECT = `
  mi.id,
  mi.producto_id,
  p.codigo,
  p.nombre AS producto_nombre,
  p.marca AS producto_marca,
  mi.usuario_id,
  CONCAT(u.nombre, ' ', u.apellido) AS usuario_nombre,
  mi.visita_id,
  mi.tipo_movimiento,
  mi.cantidad,
  mi.stock_anterior,
  mi.stock_nuevo,
  mi.motivo,
  mi.observaciones,
  mi.fecha_creacion
`;

const VISITA_PRODUCTO_SELECT = `
  vp.id,
  vp.visita_id,
  vp.producto_id,
  p.codigo,
  p.nombre AS producto_nombre,
  p.marca AS producto_marca,
  p.unidad_medida,
  vp.usuario_id,
  CONCAT(u.nombre, ' ', u.apellido) AS usuario_nombre,
  vp.cantidad,
  vp.observaciones,
  vp.fecha_creacion
`;

const listCategorias = async ({ estado } = {}) => {
  const params = [];
  const filters = [];

  if (estado) {
    params.push(estado);
    filters.push(`estado = $${params.length}::estado_general`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await query(
    `
      SELECT ${CATEGORIA_SELECT}
      FROM categorias_producto
      ${where}
      ORDER BY nombre ASC
    `,
    params
  );

  return result.rows;
};

const categoriaExists = async (categoriaId) => {
  if (!categoriaId) {
    return true;
  }

  const result = await query(
    'SELECT id FROM categorias_producto WHERE id = $1 AND estado = $2::estado_general LIMIT 1',
    [categoriaId, 'Activo']
  );

  return Boolean(result.rows[0]);
};

const listProductos = async ({ search, estado, categoriaProductoId, stockBajo } = {}) => {
  const params = [];
  const filters = [];

  if (search) {
    params.push(`%${search}%`);
    filters.push(`(
      p.codigo ILIKE $${params.length}
      OR p.nombre ILIKE $${params.length}
      OR p.marca ILIKE $${params.length}
      OR p.descripcion ILIKE $${params.length}
      OR cp.nombre ILIKE $${params.length}
    )`);
  }

  if (estado) {
    params.push(estado);
    filters.push(`p.estado = $${params.length}::estado_general`);
  }

  if (categoriaProductoId) {
    params.push(categoriaProductoId);
    filters.push(`p.categoria_producto_id = $${params.length}`);
  }

  if (stockBajo) {
    filters.push('p.stock_actual <= p.stock_minimo');
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await query(
    `
      SELECT ${PRODUCTO_SELECT}
      FROM productos p
      LEFT JOIN categorias_producto cp ON cp.id = p.categoria_producto_id
      ${where}
      ORDER BY p.nombre ASC
    `,
    params
  );

  return result.rows;
};

const findProductoById = async (id) => {
  const result = await query(
    `
      SELECT ${PRODUCTO_SELECT}
      FROM productos p
      LEFT JOIN categorias_producto cp ON cp.id = p.categoria_producto_id
      WHERE p.id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
};

const productoActivo = async (id) => {
  const result = await query(
    'SELECT id FROM productos WHERE id = $1 AND estado = $2::estado_general LIMIT 1',
    [id, 'Activo']
  );

  return Boolean(result.rows[0]);
};

const visitaExists = async (id) => {
  const result = await query(
    'SELECT id FROM visitas WHERE id = $1 LIMIT 1',
    [id]
  );

  return Boolean(result.rows[0]);
};

const createProducto = async (producto, usuarioId, stockInicial = 0) => {
  const productoId = await transaction(async (client) => {
    const result = await client.query(
      `
        INSERT INTO productos (
          categoria_producto_id,
          codigo,
          nombre,
          marca,
          descripcion,
          unidad_medida,
          stock_actual,
          stock_minimo,
          costo_promedio,
          precio_referencia,
          estado
        )
        VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'Unidad'), 0, COALESCE($7, 0), COALESCE($8, 0), COALESCE($9, 0), COALESCE($10::estado_general, 'Activo'::estado_general))
        RETURNING id
      `,
      [
        producto.categoria_producto_id || null,
        producto.codigo || null,
        producto.nombre,
        producto.marca || null,
        producto.descripcion || null,
        producto.unidad_medida || 'Unidad',
        producto.stock_minimo ?? 0,
        producto.costo_promedio ?? 0,
        producto.precio_referencia ?? 0,
        producto.estado || 'Activo'
      ]
    );

    const newProductoId = result.rows[0].id;

    if (stockInicial > 0) {
      await client.query(
        `
          SELECT aplicar_movimiento_inventario(
            $1,
            $2,
            NULL,
            'Entrada'::tipo_movimiento_inventario,
            $3,
            $4,
            $5
          )
        `,
        [
          newProductoId,
          usuarioId || null,
          stockInicial,
          'Stock inicial',
          'Entrada registrada al crear producto'
        ]
      );
    }

    return newProductoId;
  });

  return findProductoById(productoId);
};

const updateProducto = async (id, fields) => {
  const allowedFields = [
    'categoria_producto_id',
    'codigo',
    'nombre',
    'marca',
    'descripcion',
    'unidad_medida',
    'stock_minimo',
    'costo_promedio',
    'precio_referencia',
    'estado'
  ];
  const sets = [];
  const params = [];

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(fields, field)) {
      params.push(fields[field]);
      sets.push(field === 'estado' ? `${field} = $${params.length}::estado_general` : `${field} = $${params.length}`);
    }
  });

  if (!sets.length) {
    return findProductoById(id);
  }

  params.push(id);
  const result = await query(
    `
      UPDATE productos
      SET ${sets.join(', ')}
      WHERE id = $${params.length}
      RETURNING id
    `,
    params
  );

  if (!result.rows[0]) {
    return null;
  }

  return findProductoById(result.rows[0].id);
};

const updateProductoEstado = async (id, estado) => {
  const result = await query(
    `
      UPDATE productos
      SET estado = $1::estado_general
      WHERE id = $2
      RETURNING id
    `,
    [estado, id]
  );

  if (!result.rows[0]) {
    return null;
  }

  return findProductoById(result.rows[0].id);
};

const aplicarMovimiento = async ({ productoId, usuarioId, visitaId, tipoMovimiento, cantidad, motivo, observaciones }) => {
  await query(
    `
      SELECT aplicar_movimiento_inventario(
        $1,
        $2,
        $3,
        $4::tipo_movimiento_inventario,
        $5,
        $6,
        $7
      )
    `,
    [
      productoId,
      usuarioId || null,
      visitaId || null,
      tipoMovimiento,
      cantidad,
      motivo || null,
      observaciones || null
    ]
  );

  const result = await query(
    `
      SELECT ${MOVIMIENTO_SELECT}
      FROM movimientos_inventario mi
      INNER JOIN productos p ON p.id = mi.producto_id
      LEFT JOIN usuarios u ON u.id = mi.usuario_id
      WHERE mi.producto_id = $1
      ORDER BY mi.fecha_creacion DESC, mi.id DESC
      LIMIT 1
    `,
    [productoId]
  );

  return result.rows[0] || null;
};

const listMovimientos = async ({ productoId, tipoMovimiento, visitaId, dateFrom, dateTo } = {}) => {
  const params = [];
  const filters = [];

  if (productoId) {
    params.push(productoId);
    filters.push(`mi.producto_id = $${params.length}`);
  }

  if (tipoMovimiento) {
    params.push(tipoMovimiento);
    filters.push(`mi.tipo_movimiento = $${params.length}::tipo_movimiento_inventario`);
  }

  if (visitaId) {
    params.push(visitaId);
    filters.push(`mi.visita_id = $${params.length}`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    filters.push(`mi.fecha_creacion >= $${params.length}`);
  }

  if (dateTo) {
    params.push(dateTo);
    filters.push(`mi.fecha_creacion <= $${params.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await query(
    `
      SELECT ${MOVIMIENTO_SELECT}
      FROM movimientos_inventario mi
      INNER JOIN productos p ON p.id = mi.producto_id
      LEFT JOIN usuarios u ON u.id = mi.usuario_id
      ${where}
      ORDER BY mi.fecha_creacion DESC, mi.id DESC
    `,
    params
  );

  return result.rows;
};

const listStockBajo = async () => {
  const result = await query(
    `
      SELECT *
      FROM vista_stock_bajo
      ORDER BY nombre ASC
    `
  );

  return result.rows;
};

const registrarProductoUsado = async ({ visitaId, productoId, usuarioId, cantidad, observaciones }) => {
  const result = await query(
    `
      INSERT INTO visita_productos (
        visita_id,
        producto_id,
        usuario_id,
        cantidad,
        observaciones
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    [visitaId, productoId, usuarioId || null, cantidad, observaciones || null]
  );

  return findVisitaProductoById(result.rows[0].id);
};

const findVisitaProductoById = async (id) => {
  const result = await query(
    `
      SELECT ${VISITA_PRODUCTO_SELECT}
      FROM visita_productos vp
      INNER JOIN productos p ON p.id = vp.producto_id
      LEFT JOIN usuarios u ON u.id = vp.usuario_id
      WHERE vp.id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
};

const listProductosUsadosByVisita = async (visitaId) => {
  const result = await query(
    `
      SELECT ${VISITA_PRODUCTO_SELECT}
      FROM visita_productos vp
      INNER JOIN productos p ON p.id = vp.producto_id
      LEFT JOIN usuarios u ON u.id = vp.usuario_id
      WHERE vp.visita_id = $1
      ORDER BY vp.fecha_creacion ASC, vp.id ASC
    `,
    [visitaId]
  );

  return result.rows;
};

module.exports = {
  listCategorias,
  categoriaExists,
  listProductos,
  findProductoById,
  productoActivo,
  visitaExists,
  createProducto,
  updateProducto,
  updateProductoEstado,
  aplicarMovimiento,
  listMovimientos,
  listStockBajo,
  registrarProductoUsado,
  listProductosUsadosByVisita
};
