const { Router } = require('express');
const { body, param, query } = require('express-validator');
const mecanicoController = require('./mecanico.controller');
const asyncHandler = require('../../utils/asyncHandler');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const validateRequest = require('../../middlewares/validateRequest');

const router = Router();

const estadosMecanico = [
  'Recibido',
  'En diagnóstico',
  'Pendiente de aprobación',
  'En proceso',
  'En espera de repuesto',
  'En prueba',
  'Finalizado'
];

router.use(authMiddleware);
router.use(roleMiddleware('Mecanico'));

router.get(
  '/mis-trabajos',
  [
    query('estado').optional().isIn(estadosMecanico).withMessage('Estado invalido'),
    query('activas').optional().isBoolean().withMessage('activas debe ser booleano')
  ],
  validateRequest,
  asyncHandler(mecanicoController.listMisTrabajos)
);

router.get(
  '/mis-trabajos/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido')
  ],
  validateRequest,
  asyncHandler(mecanicoController.getMiTrabajo)
);

router.patch(
  '/mis-trabajos/:id/estado',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido'),
    body('estado').isIn(estadosMecanico).withMessage('Estado invalido'),
    body('observaciones').optional({ nullable: true, checkFalsy: true }).trim(),
    body('diagnostico').optional({ nullable: true, checkFalsy: true }).trim()
  ],
  validateRequest,
  asyncHandler(mecanicoController.updateEstado)
);

router.post(
  '/mis-trabajos/:id/productos',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido'),
    body('producto_id').isInt({ min: 1 }).withMessage('producto_id es requerido'),
    body('cantidad').isFloat({ gt: 0 }).withMessage('cantidad debe ser mayor que 0'),
    body('observaciones').optional({ nullable: true, checkFalsy: true }).trim()
  ],
  validateRequest,
  asyncHandler(mecanicoController.addProductoUsado)
);

module.exports = router;
