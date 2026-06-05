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

const findByUsernameWithPassword = async (username) => {
  const result = await query(
    `
      SELECT
        ${USER_SELECT},
        u.password_hash
      FROM usuarios u
      INNER JOIN roles r ON r.id = u.rol_id
      WHERE lower(u.username) = lower($1)
      LIMIT 1
    `,
    [username]
  );

  return result.rows[0] || null;
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

const updateLastLogin = async (id) => {
  await query(
    'UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1',
    [id]
  );
};

module.exports = {
  findByUsernameWithPassword,
  findById,
  updateLastLogin
};
