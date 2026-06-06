const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { errorResponse } = require('../utils/responses');

const authMiddleware = async (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return errorResponse(res, 'Token de autenticacion requerido', undefined, 401);
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      `
        SELECT
          u.id,
          u.username,
          u.rol_id,
          r.nombre AS rol,
          u.nombre,
          u.apellido,
          u.estado
        FROM usuarios u
        INNER JOIN roles r ON r.id = u.rol_id
        WHERE u.id = $1
          AND u.estado = 'Activo'::estado_general
          AND r.estado = 'Activo'::estado_general
        LIMIT 1
      `,
      [payload.id]
    );

    const user = result.rows[0];

    if (!user) {
      return errorResponse(res, 'Usuario inactivo o no disponible', undefined, 401);
    }

    req.user = {
      id: user.id,
      username: user.username,
      rol_id: user.rol_id,
      rol: user.rol,
      nombre: user.nombre,
      apellido: user.apellido
    };

    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token invalido o expirado', error.message, 401);
    }

    return next(error);
  }
};

module.exports = authMiddleware;
