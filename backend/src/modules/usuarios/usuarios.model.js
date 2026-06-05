const { query } = require('../../config/db');

const USER_SELECT = `
  u.id,
  u.rol_id,
  r.nombre AS rol,
  u.nombre,
  u.apellido,
  u.username,
  u.email,
  u.telefono,
  u.estado,
  u.ultimo_login,
  u.fecha_creacion,
  u.fecha_actualizacion
`;

const list = async ({ search, estado, rolId } = {}) => {
  const filters = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    filters.push(`(
      u.nombre ILIKE $${params.length}
      OR u.apellido ILIKE $${params.length}
      OR u.username ILIKE $${params.length}
      OR u.email ILIKE $${params.length}
      OR u.telefono ILIKE $${params.length}
    )`);
  }

  if (estado) {
    params.push(estado);
    filters.push(`u.estado = $${params.length}`);
  }

  if (rolId) {
    params.push(rolId);
    filters.push(`u.rol_id = $${params.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const result = await query(
    `
      SELECT ${USER_SELECT}
      FROM usuarios u
      INNER JOIN roles r ON r.id = u.rol_id
      ${where}
      ORDER BY u.fecha_creacion DESC, u.id DESC
    `,
    params
  );

  return result.rows;
};

const findById = async (id) => {
  const result = await query(
    `
      SELECT ${USER_SELECT}
      FROM usuarios u
      INNER JOIN roles r ON r.id = u.rol_id
      WHERE u.id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
};

const roleExists = async (rolId) => {
  const result = await query(
    'SELECT id FROM roles WHERE id = $1 AND estado = $2 LIMIT 1',
    [rolId, 'Activo']
  );

  return Boolean(result.rows[0]);
};

const create = async (user) => {
  const result = await query(
    `
      INSERT INTO usuarios (
        rol_id,
        nombre,
        apellido,
        username,
        email,
        password_hash,
        telefono,
        estado
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'Activo'))
      RETURNING id
    `,
    [
      user.rol_id,
      user.nombre,
      user.apellido,
      user.username,
      user.email || null,
      user.password_hash,
      user.telefono || null,
      user.estado || 'Activo'
    ]
  );

  return findById(result.rows[0].id);
};

const update = async (id, fields) => {
  const allowedFields = [
    'rol_id',
    'nombre',
    'apellido',
    'username',
    'email',
    'telefono',
    'estado',
    'password_hash'
  ];
  const sets = [];
  const params = [];

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(fields, field)) {
      params.push(fields[field]);
      sets.push(`${field} = $${params.length}`);
    }
  });

  if (!sets.length) {
    return findById(id);
  }

  params.push(id);

  const result = await query(
    `
      UPDATE usuarios
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
      UPDATE usuarios
      SET estado = $1
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
  list,
  findById,
  roleExists,
  create,
  update,
  updateEstado
};
