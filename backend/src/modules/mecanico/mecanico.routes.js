const { Router } = require('express');
const { body, param, query } = require('express-validator');
const mecanicoController = require('./mecanico.controller');
const asyncHandler = require('../../utils/asyncHandler');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const validateRequest = require('../../middlewares/validateRequest');
const { upload, setUploadFolder } = require('../../middlewares/uploadMiddleware');

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
const estadosEtapa = ['Pendiente', 'En proceso', 'Completado', 'Omitido'];
const tiposFoto = ['Vehículo', 'Visita', 'Daño', 'Avance', 'Final', 'VIN', 'Kilometraje', 'Otro'];

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

router.patch(
  '/mis-trabajos/:id/etapas/:etapaId',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido'),
    param('etapaId').isInt({ min: 1 }).withMessage('ID de etapa invalido'),
    body('estado').isIn(estadosEtapa).withMessage('Estado de etapa invalido'),
    body('observaciones').optional({ nullable: true, checkFalsy: true }).trim()
  ],
  validateRequest,
  asyncHandler(mecanicoController.updateEtapa)
);

router.post(
  '/mis-trabajos/:id/fotos',
  setUploadFolder('visitas'),
  upload.single('foto'),
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido'),
    body('tipo').optional().isIn(tiposFoto).withMessage('Tipo de foto invalido'),
    body('descripcion').optional({ nullable: true, checkFalsy: true }).trim()
  ],
  validateRequest,
  asyncHandler(mecanicoController.addFoto)
);

module.exports = router;
