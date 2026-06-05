const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/responses');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  return errorResponse(res, 'Datos de entrada invalidos', errors.array(), 400);
};

module.exports = validateRequest;
