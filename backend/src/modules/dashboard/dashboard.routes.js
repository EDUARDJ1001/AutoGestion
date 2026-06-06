const { Router } = require('express');
const dashboardController = require('./dashboard.controller');
const asyncHandler = require('../../utils/asyncHandler');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware('Admin', 'Cajero'));

router.get(
  '/visitas-activas',
  asyncHandler(dashboardController.getVisitasActivas)
);

router.get(
  '/resumen',
  asyncHandler(dashboardController.getResumen)
);

router.get(
  '/stock-bajo',
  asyncHandler(dashboardController.getStockBajo)
);

module.exports = router;
