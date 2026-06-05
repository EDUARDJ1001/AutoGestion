const { errorResponse } = require('../utils/responses');

const notFoundHandler = (req, res) => {
  return errorResponse(res, `Ruta no encontrada: ${req.originalUrl}`, undefined, 404);
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.publicMessage || err.message || 'Error interno del servidor';

  return errorResponse(res, message, err.detail || err.message, statusCode);
};

module.exports = {
  notFoundHandler,
  errorHandler
};
