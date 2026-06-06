const { Router } = require('express');
const { query } = require('express-validator');
const inventarioController = require('./inventario.controller');
const asyncHandler = require('../../utils/asyncHandler');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const validateRequest = require('../../middlewares/validateRequest');

const router = Router();
const estadosValidos = ['Activo', 'Inactivo'];

router.use(authMiddleware);
router.use(roleMiddleware('Admin', 'Cajero', 'Mecanico'));

router.get(
  '/',
  [
    query('estado').optional().isIn(estadosValidos).withMessage('Estado invalido')
  ],
  validateRequest,
  asyncHandler(inventarioController.listCategorias)
);

module.exports = router;
