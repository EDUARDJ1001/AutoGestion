const { Router } = require('express');
const { param, query } = require('express-validator');
const flujosController = require('./flujos.controller');
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
  asyncHandler(flujosController.listFlujos)
);

router.get(
  '/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido'),
    query('estado').optional().isIn(estadosValidos).withMessage('Estado invalido')
  ],
  validateRequest,
  asyncHandler(flujosController.getFlujo)
);

module.exports = router;
