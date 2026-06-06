const { Router } = require('express');
const { query } = require('express-validator');
const serviciosController = require('./servicios.controller');
const asyncHandler = require('../../utils/asyncHandler');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const validateRequest = require('../../middlewares/validateRequest');

const router = Router();
const estadosValidos = ['Activo', 'Inactivo'];

router.use(authMiddleware);
router.use(roleMiddleware('Admin', 'Cajero'));

router.get(
  '/',
  [
    query('estado').optional().isIn(estadosValidos).withMessage('Estado invalido')
  ],
  validateRequest,
  asyncHandler(serviciosController.listCategorias)
);

module.exports = router;
