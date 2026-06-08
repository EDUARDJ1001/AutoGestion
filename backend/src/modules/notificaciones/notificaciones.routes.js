const { Router } = require('express');
const { param, query } = require('express-validator');
const notificacionesController = require('./notificaciones.controller');
const asyncHandler = require('../../utils/asyncHandler');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const validateRequest = require('../../middlewares/validateRequest');

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware('Admin', 'Cajero', 'Mecanico'));

router.get(
  '/',
  [
    query('no_leidas').optional().isBoolean().withMessage('no_leidas debe ser booleano'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe estar entre 1 y 100')
  ],
  validateRequest,
  asyncHandler(notificacionesController.listNotificaciones)
);

router.get(
  '/resumen',
  asyncHandler(notificacionesController.getResumen)
);

router.patch(
  '/:id/leida',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido')
  ],
  validateRequest,
  asyncHandler(notificacionesController.marcarLeida)
);

router.patch(
  '/leer-todas',
  asyncHandler(notificacionesController.marcarTodasLeidas)
);

module.exports = router;
