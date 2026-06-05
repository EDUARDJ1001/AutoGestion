const { Router } = require('express');
const { body, param, query } = require('express-validator');
const usuariosController = require('./usuarios.controller');
const asyncHandler = require('../../utils/asyncHandler');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const validateRequest = require('../../middlewares/validateRequest');

const router = Router();

const estadosValidos = ['Activo', 'Inactivo'];

router.use(authMiddleware);
router.use(roleMiddleware('Admin'));

router.get(
  '/',
  [
    query('estado').optional().isIn(estadosValidos).withMessage('Estado invalido'),
    query('rol_id').optional().isInt({ min: 1 }).withMessage('rol_id debe ser entero')
  ],
  validateRequest,
  asyncHandler(usuariosController.listUsuarios)
);

router.post(
  '/',
  [
    body('rol_id').isInt({ min: 1 }).withMessage('El rol es requerido'),
    body('nombre').trim().notEmpty().withMessage('El nombre es requerido'),
    body('apellido').trim().notEmpty().withMessage('El apellido es requerido'),
    body('username').trim().isLength({ min: 3 }).withMessage('El username debe tener al menos 3 caracteres'),
    body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Email invalido'),
    body('telefono').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 30 }).withMessage('Telefono demasiado largo'),
    body('password').isLength({ min: 6 }).withMessage('La contrasena debe tener al menos 6 caracteres'),
    body('estado').optional().isIn(estadosValidos).withMessage('Estado invalido')
  ],
  validateRequest,
  asyncHandler(usuariosController.createUsuario)
);

router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido'),
    body('rol_id').optional().isInt({ min: 1 }).withMessage('rol_id debe ser entero'),
    body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede ir vacio'),
    body('apellido').optional().trim().notEmpty().withMessage('El apellido no puede ir vacio'),
    body('username').optional().trim().isLength({ min: 3 }).withMessage('El username debe tener al menos 3 caracteres'),
    body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Email invalido'),
    body('telefono').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 30 }).withMessage('Telefono demasiado largo'),
    body('password').optional({ checkFalsy: true }).isLength({ min: 6 }).withMessage('La contrasena debe tener al menos 6 caracteres'),
    body('estado').optional().isIn(estadosValidos).withMessage('Estado invalido')
  ],
  validateRequest,
  asyncHandler(usuariosController.updateUsuario)
);

router.patch(
  '/:id/estado',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido'),
    body('estado').isIn(estadosValidos).withMessage('Estado invalido')
  ],
  validateRequest,
  asyncHandler(usuariosController.updateEstado)
);

module.exports = router;
