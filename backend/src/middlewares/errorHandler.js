const { errorResponse } = require('../utils/responses');
const { cleanupUploadedFile } = require('./uploadMiddleware');

const notFoundHandler = (req, res) => {
  return errorResponse(res, `Ruta no encontrada: ${req.originalUrl}`, undefined, 404);
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  cleanupUploadedFile(req.file);

  if (Array.isArray(req.files)) {
    req.files.forEach(cleanupUploadedFile);
  } else if (req.files && typeof req.files === 'object') {
    Object.values(req.files).flat().forEach(cleanupUploadedFile);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = err.publicMessage || err.message || 'Error interno del servidor';

  if (err.name === 'MulterError') {
    statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = err.code === 'LIMIT_FILE_SIZE'
      ? 'La imagen excede el tamano maximo permitido'
      : 'Error al procesar archivo subido';
  }

  if (err.message?.includes('Formato de imagen no permitido')) {
    statusCode = 400;
    message = err.message;
  }

  if (err.code === '23505') {
    statusCode = 409;
    message = 'Ya existe un registro con esos datos';
  }

  if (err.code === '23503') {
    statusCode = 400;
    message = 'Una referencia indicada no existe';
  }

  if (err.code === '23514' || err.code === '22P02') {
    statusCode = 400;
    message = 'Datos incompatibles con las reglas de la base de datos';
  }

  return errorResponse(res, message, err.detail || err.message, statusCode);
};

module.exports = {
  notFoundHandler,
  errorHandler
};
