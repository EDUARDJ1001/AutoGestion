const { Router } = require('express');
const { body, query } = require('express-validator');
const inventarioController = require('./inventario.controller');
const asyncHandler = require('../../utils/asyncHandler');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const validateRequest = require('../../middlewares/validateRequest');

const router = Router();

const tiposMovimiento = [
  'Entrada',
  'Salida',
  'Ajuste positivo',
  'Ajuste negativo',
  'Uso en servicio',
  'Devolución'
];

router.use(authMiddleware);

router.post(
  '/movimiento',
  roleMiddleware('Admin', 'Cajero'),
  [
    body('producto_id').isInt({ min: 1 }).withMessage('producto_id es requerido'),
    body('visita_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('visita_id debe ser entero'),
    body('tipo_movimiento').isIn(tiposMovimiento).withMessage('Tipo de movimiento invalido'),
    body('cantidad').isFloat({ gt: 0 }).withMessage('La cantidad debe ser mayor que cero'),
    body('motivo').optional({ nullable: true, checkFalsy: true }).trim(),
    body('observaciones').optional({ nullable: true, checkFalsy: true }).trim()
  ],
  validateRequest,
  asyncHandler(inventarioController.registrarMovimiento)
);

router.get(
  '/movimientos',
  roleMiddleware('Admin', 'Cajero'),
  [
    query('producto_id').optional().isInt({ min: 1 }).withMessage('producto_id debe ser entero'),
    query('visita_id').optional().isInt({ min: 1 }).withMessage('visita_id debe ser entero'),
    query('tipo_movimiento').optional().isIn(tiposMovimiento).withMessage('Tipo de movimiento invalido'),
    query('desde').optional().isISO8601().withMessage('Fecha desde invalida'),
    query('hasta').optional().isISO8601().withMessage('Fecha hasta invalida')
  ],
  validateRequest,
  asyncHandler(inventarioController.listMovimientos)
);

router.get(
  '/stock-bajo',
  roleMiddleware('Admin', 'Cajero'),
  asyncHandler(inventarioController.listStockBajo)
);

module.exports = router;
