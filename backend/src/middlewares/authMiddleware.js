const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/responses');

const authMiddleware = (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return errorResponse(res, 'Token de autenticacion requerido', undefined, 401);
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (error) {
    return errorResponse(res, 'Token invalido o expirado', error.message, 401);
  }
};

module.exports = authMiddleware;
