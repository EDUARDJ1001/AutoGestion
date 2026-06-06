const { Router } = require('express');
const { body, param, query } = require('express-validator');
const inventarioController = require('./inventario.controller');
const asyncHandler = require('../../utils/asyncHandler');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const validateRequest = require('../../middlewares/validateRequest');

const router = Router();
const estadosValidos = ['Activo', 'Inactivo'];

const productoCreateValidators = [
  body('categoria_producto_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('categoria_producto_id debe ser entero'),
  body('codigo').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('Codigo demasiado largo'),
  body('nombre').trim().notEmpty().withMessage('El nombre es requerido'),
  body('marca').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('Marca demasiado larga'),
  body('descripcion').optional({ nullable: true, checkFalsy: true }).trim(),
  body('unidad_medida').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 50 }).withMessage('Unidad de medida demasiado larga'),
  body('stock_inicial').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('stock_inicial debe ser mayor o igual a 0'),
  body('stock_minimo').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('stock_minimo debe ser mayor o igual a 0'),
  body('costo_promedio').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('costo_promedio debe ser mayor o igual a 0'),
  body('precio_referencia').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('precio_referencia debe ser mayor o igual a 0'),
  body('estado').optional().isIn(estadosValidos).withMessage('Estado invalido')
];

const productoUpdateValidators = [
  param('id').isInt({ min: 1 }).withMessage('ID invalido'),
  body('categoria_producto_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('categoria_producto_id debe ser entero'),
  body('codigo').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('Codigo demasiado largo'),
  body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede ir vacio'),
  body('marca').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('Marca demasiado larga'),
  body('descripcion').optional({ nullable: true, checkFalsy: true }).trim(),
  body('unidad_medida').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 50 }).withMessage('Unidad de medida demasiado larga'),
  body('stock_minimo').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('stock_minimo debe ser mayor o igual a 0'),
  body('costo_promedio').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('costo_promedio debe ser mayor o igual a 0'),
  body('precio_referencia').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('precio_referencia debe ser mayor o igual a 0'),
  body('estado').optional().isIn(estadosValidos).withMessage('Estado invalido')
];

router.use(authMiddleware);

router.get(
  '/',
  roleMiddleware('Admin', 'Cajero', 'Mecanico'),
  [
    query('estado').optional().isIn(estadosValidos).withMessage('Estado invalido'),
    query('categoria_producto_id').optional().isInt({ min: 1 }).withMessage('categoria_producto_id debe ser entero'),
    query('stock_bajo').optional().isBoolean().withMessage('stock_bajo debe ser booleano')
  ],
  validateRequest,
  asyncHandler(inventarioController.listProductos)
);

router.get(
  '/:id',
  roleMiddleware('Admin', 'Cajero', 'Mecanico'),
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido')
  ],
  validateRequest,
  asyncHandler(inventarioController.getProducto)
);

router.post(
  '/',
  roleMiddleware('Admin'),
  productoCreateValidators,
  validateRequest,
  asyncHandler(inventarioController.createProducto)
);

router.put(
  '/:id',
  roleMiddleware('Admin'),
  productoUpdateValidators,
  validateRequest,
  asyncHandler(inventarioController.updateProducto)
);

router.patch(
  '/:id/estado',
  roleMiddleware('Admin'),
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido'),
    body('estado').isIn(estadosValidos).withMessage('Estado invalido')
  ],
  validateRequest,
  asyncHandler(inventarioController.updateProductoEstado)
);

module.exports = router;
