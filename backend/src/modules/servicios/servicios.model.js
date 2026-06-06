const { query } = require('../../config/db');

const SERVICIO_SELECT = `
  s.id,
  s.categoria_servicio_id,
  cs.nombre AS categoria_nombre,
  s.nombre,
  s.descripcion,
  s.precio_sugerido,
  s.tiempo_estimado_minutos,
  s.estado,
  s.fecha_creacion,
  s.fecha_actualizacion
`;

const CATEGORIA_SELECT = `
  id,
  nombre,
  descripcion,
  estado,
  fecha_creacion
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
      FROM categorias_servicio
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
    'SELECT id FROM categorias_servicio WHERE id = $1 AND estado = $2::estado_general LIMIT 1',
    [categoriaId, 'Activo']
  );

  return Boolean(result.rows[0]);
};

const list = async ({ search, estado, categoriaServicioId } = {}) => {
  const params = [];
  const filters = [];

  if (search) {
    params.push(`%${search}%`);
    filters.push(`(
      s.nombre ILIKE $${params.length}
      OR s.descripcion ILIKE $${params.length}
      OR cs.nombre ILIKE $${params.length}
    )`);
  }

  if (estado) {
    params.push(estado);
    filters.push(`s.estado = $${params.length}::estado_general`);
  }

  if (categoriaServicioId) {
    params.push(categoriaServicioId);
    filters.push(`s.categoria_servicio_id = $${params.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await query(
    `
      SELECT ${SERVICIO_SELECT}
      FROM servicios s
      LEFT JOIN categorias_servicio cs ON cs.id = s.categoria_servicio_id
      ${where}
      ORDER BY s.nombre ASC
    `,
    params
  );

  return result.rows;
};

const findById = async (id) => {
  const result = await query(
    `
      SELECT ${SERVICIO_SELECT}
      FROM servicios s
      LEFT JOIN categorias_servicio cs ON cs.id = s.categoria_servicio_id
      WHERE s.id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
};

const existsActive = async (id) => {
  const result = await query(
    'SELECT id FROM servicios WHERE id = $1 AND estado = $2::estado_general LIMIT 1',
    [id, 'Activo']
  );

  return Boolean(result.rows[0]);
};

const create = async (servicio) => {
  const result = await query(
    `
      INSERT INTO servicios (
        categoria_servicio_id,
        nombre,
        descripcion,
        precio_sugerido,
        tiempo_estimado_minutos,
        estado
      )
      VALUES ($1, $2, $3, COALESCE($4, 0), $5, COALESCE($6::estado_general, 'Activo'::estado_general))
      RETURNING id
    `,
    [
      servicio.categoria_servicio_id || null,
      servicio.nombre,
      servicio.descripcion || null,
      servicio.precio_sugerido ?? null,
      servicio.tiempo_estimado_minutos ?? null,
      servicio.estado || 'Activo'
    ]
  );

  return findById(result.rows[0].id);
};

const update = async (id, fields) => {
  const allowedFields = [
    'categoria_servicio_id',
    'nombre',
    'descripcion',
    'precio_sugerido',
    'tiempo_estimado_minutos',
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
    return findById(id);
  }

  params.push(id);
  const result = await query(
    `
      UPDATE servicios
      SET ${sets.join(', ')}
      WHERE id = $${params.length}
      RETURNING id
    `,
    params
  );

  if (!result.rows[0]) {
    return null;
  }

  return findById(result.rows[0].id);
};

const updateEstado = async (id, estado) => {
  const result = await query(
    `
      UPDATE servicios
      SET estado = $1::estado_general
      WHERE id = $2
      RETURNING id
    `,
    [estado, id]
  );

  if (!result.rows[0]) {
    return null;
  }

  return findById(result.rows[0].id);
};

module.exports = {
  listCategorias,
  categoriaExists,
  list,
  findById,
  existsActive,
  create,
  update,
  updateEstado
};
