const { Router } = require('express');
const { body, param, query } = require('express-validator');
const clientesController = require('./clientes.controller');
const asyncHandler = require('../../utils/asyncHandler');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const validateRequest = require('../../middlewares/validateRequest');

const router = Router();

const estadosValidos = ['Activo', 'Inactivo'];

const clienteCreateValidators = [
  body('nombre').trim().notEmpty().withMessage('El nombre es requerido'),
  body('identidad_rtn').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 30 }).withMessage('Identidad/RTN demasiado largo'),
  body('telefono').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 30 }).withMessage('Telefono demasiado largo'),
  body('whatsapp').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 30 }).withMessage('WhatsApp demasiado largo'),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Email invalido'),
  body('direccion').optional({ nullable: true, checkFalsy: true }).trim(),
  body('observaciones').optional({ nullable: true, checkFalsy: true }).trim(),
  body('estado').optional().isIn(estadosValidos).withMessage('Estado invalido')
];

const clienteUpdateValidators = [
  param('id').isInt({ min: 1 }).withMessage('ID invalido'),
  body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede ir vacio'),
  body('identidad_rtn').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 30 }).withMessage('Identidad/RTN demasiado largo'),
  body('telefono').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 30 }).withMessage('Telefono demasiado largo'),
  body('whatsapp').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 30 }).withMessage('WhatsApp demasiado largo'),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Email invalido'),
  body('direccion').optional({ nullable: true, checkFalsy: true }).trim(),
  body('observaciones').optional({ nullable: true, checkFalsy: true }).trim(),
  body('estado').optional().isIn(estadosValidos).withMessage('Estado invalido')
];

router.use(authMiddleware);
router.use(roleMiddleware('Admin', 'Cajero'));

router.get(
  '/',
  [
    query('estado').optional().isIn(estadosValidos).withMessage('Estado invalido')
  ],
  validateRequest,
  asyncHandler(clientesController.listClientes)
);

router.get(
  '/:clienteId/vehiculos',
  [
    param('clienteId').isInt({ min: 1 }).withMessage('ID de cliente invalido')
  ],
  validateRequest,
  asyncHandler(clientesController.listVehiculosByCliente)
);

router.get(
  '/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido')
  ],
  validateRequest,
  asyncHandler(clientesController.getCliente)
);

router.post(
  '/',
  clienteCreateValidators,
  validateRequest,
  asyncHandler(clientesController.createCliente)
);

router.put(
  '/:id',
  clienteUpdateValidators,
  validateRequest,
  asyncHandler(clientesController.updateCliente)
);

router.patch(
  '/:id/estado',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido'),
    body('estado').isIn(estadosValidos).withMessage('Estado invalido')
  ],
  validateRequest,
  asyncHandler(clientesController.updateEstado)
);

module.exports = router;
