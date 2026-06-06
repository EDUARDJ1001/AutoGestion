const { Router } = require('express');
const { body, param, query } = require('express-validator');
const serviciosController = require('./servicios.controller');
const asyncHandler = require('../../utils/asyncHandler');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const validateRequest = require('../../middlewares/validateRequest');

const router = Router();

const estadosValidos = ['Activo', 'Inactivo'];

const servicioCreateValidators = [
  body('categoria_servicio_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('categoria_servicio_id debe ser entero'),
  body('nombre').trim().notEmpty().withMessage('El nombre es requerido'),
  body('descripcion').optional({ nullable: true, checkFalsy: true }).trim(),
  body('precio_sugerido').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('El precio sugerido debe ser mayor o igual a 0'),
  body('tiempo_estimado_minutos').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('Tiempo estimado invalido'),
  body('estado').optional().isIn(estadosValidos).withMessage('Estado invalido')
];

const servicioUpdateValidators = [
  param('id').isInt({ min: 1 }).withMessage('ID invalido'),
  body('categoria_servicio_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('categoria_servicio_id debe ser entero'),
  body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede ir vacio'),
  body('descripcion').optional({ nullable: true, checkFalsy: true }).trim(),
  body('precio_sugerido').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('El precio sugerido debe ser mayor o igual a 0'),
  body('tiempo_estimado_minutos').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('Tiempo estimado invalido'),
  body('estado').optional().isIn(estadosValidos).withMessage('Estado invalido')
];

router.use(authMiddleware);
router.use(roleMiddleware('Admin', 'Cajero'));

router.get(
  '/',
  [
    query('estado').optional().isIn(estadosValidos).withMessage('Estado invalido'),
    query('categoria_servicio_id').optional().isInt({ min: 1 }).withMessage('categoria_servicio_id debe ser entero')
  ],
  validateRequest,
  asyncHandler(serviciosController.listServicios)
);

router.post(
  '/',
  servicioCreateValidators,
  validateRequest,
  asyncHandler(serviciosController.createServicio)
);

router.put(
  '/:id',
  servicioUpdateValidators,
  validateRequest,
  asyncHandler(serviciosController.updateServicio)
);

router.patch(
  '/:id/estado',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido'),
    body('estado').isIn(estadosValidos).withMessage('Estado invalido')
  ],
  validateRequest,
  asyncHandler(serviciosController.updateEstado)
);

module.exports = router;
