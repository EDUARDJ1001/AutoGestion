const { query } = require('../../config/db');

const VEHICULO_SELECT = `
  v.id,
  v.cliente_id,
  c.nombre AS cliente_nombre,
  c.telefono AS cliente_telefono,
  c.whatsapp AS cliente_whatsapp,
  v.placa,
  v.marca,
  v.modelo,
  v.anio,
  v.color,
  v.vin,
  v.tipo_vehiculo,
  v.kilometraje_actual,
  v.fecha_primera_visita,
  v.fecha_ultimo_ingreso,
  v.observaciones,
  v.estado,
  v.fecha_creacion,
  v.fecha_actualizacion
`;

const buildListQuery = ({ search, estado, clienteId } = {}) => {
  const filters = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    filters.push(`(
      v.placa ILIKE $${params.length}
      OR v.marca ILIKE $${params.length}
      OR v.modelo ILIKE $${params.length}
      OR v.vin ILIKE $${params.length}
      OR v.color ILIKE $${params.length}
      OR c.nombre ILIKE $${params.length}
    )`);
  }

  if (estado) {
    params.push(estado);
    filters.push(`v.estado = $${params.length}::estado_general`);
  }

  if (clienteId) {
    params.push(clienteId);
    filters.push(`v.cliente_id = $${params.length}`);
  }

  return {
    where: filters.length ? `WHERE ${filters.join(' AND ')}` : '',
    params
  };
};

const list = async (filters = {}) => {
  const { where, params } = buildListQuery(filters);

  const result = await query(
    `
      SELECT ${VEHICULO_SELECT}
      FROM vehiculos v
      INNER JOIN clientes c ON c.id = v.cliente_id
      ${where}
      ORDER BY v.fecha_creacion DESC, v.id DESC
    `,
    params
  );

  return result.rows;
};

const listByCliente = async (clienteId) => {
  return list({ clienteId });
};

const findById = async (id) => {
  const result = await query(
    `
      SELECT ${VEHICULO_SELECT}
      FROM vehiculos v
      INNER JOIN clientes c ON c.id = v.cliente_id
      WHERE v.id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
};

const clienteExists = async (clienteId) => {
  const result = await query(
    'SELECT id FROM clientes WHERE id = $1 AND estado = $2::estado_general LIMIT 1',
    [clienteId, 'Activo']
  );

  return Boolean(result.rows[0]);
};

const create = async (vehiculo) => {
  const result = await query(
    `
      INSERT INTO vehiculos (
        cliente_id,
        placa,
        marca,
        modelo,
        anio,
        color,
        vin,
        tipo_vehiculo,
        kilometraje_actual,
        observaciones,
        estado
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11::estado_general, 'Activo'::estado_general))
      RETURNING id
    `,
    [
      vehiculo.cliente_id,
      vehiculo.placa || null,
      vehiculo.marca,
      vehiculo.modelo,
      vehiculo.anio || null,
      vehiculo.color || null,
      vehiculo.vin || null,
      vehiculo.tipo_vehiculo || null,
      vehiculo.kilometraje_actual ?? null,
      vehiculo.observaciones || null,
      vehiculo.estado || 'Activo'
    ]
  );

  return findById(result.rows[0].id);
};

const update = async (id, fields) => {
  const allowedFields = [
    'cliente_id',
    'placa',
    'marca',
    'modelo',
    'anio',
    'color',
    'vin',
    'tipo_vehiculo',
    'kilometraje_actual',
    'observaciones',
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
      UPDATE vehiculos
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
      UPDATE vehiculos
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

const getHistorial = async (vehiculoId) => {
  const result = await query(
    `
      SELECT *
      FROM vista_historial_vehiculo
      WHERE vehiculo_id = $1
      ORDER BY fecha_ingreso DESC NULLS LAST, visita_id DESC NULLS LAST
    `,
    [vehiculoId]
  );

  return result.rows;
};

module.exports = {
  list,
  listByCliente,
  findById,
  clienteExists,
  create,
  update,
  updateEstado,
  getHistorial
};
