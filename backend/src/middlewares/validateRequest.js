const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/responses');
const { cleanupUploadedFile } = require('./uploadMiddleware');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  cleanupUploadedFile(req.file);

  if (Array.isArray(req.files)) {
    req.files.forEach(cleanupUploadedFile);
  } else if (req.files && typeof req.files === 'object') {
    Object.values(req.files).flat().forEach(cleanupUploadedFile);
  }

  return errorResponse(res, 'Datos de entrada invalidos', errors.array(), 400);
};

module.exports = validateRequest;
