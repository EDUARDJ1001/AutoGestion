const { errorResponse } = require('../utils/responses');

const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.rol || req.user?.role || req.user?.nombre_rol;

    if (!userRole) {
      return errorResponse(res, 'No se pudo validar el rol del usuario', undefined, 403);
    }

    if (!allowedRoles.includes(userRole)) {
      return errorResponse(res, 'No tienes permisos para realizar esta accion', undefined, 403);
    }

    return next();
  };
};

module.exports = roleMiddleware;
