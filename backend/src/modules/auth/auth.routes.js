const { Router } = require('express');
const { body } = require('express-validator');
const authController = require('./auth.controller');
const asyncHandler = require('../../utils/asyncHandler');
const authMiddleware = require('../../middlewares/authMiddleware');
const validateRequest = require('../../middlewares/validateRequest');

const router = Router();

router.post(
  '/login',
  [
    body('username')
      .trim()
      .notEmpty().withMessage('El usuario es requerido'),
    body('password')
      .notEmpty().withMessage('La contrasena es requerida')
  ],
  validateRequest,
  asyncHandler(authController.login)
);

router.get(
  '/me',
  authMiddleware,
  asyncHandler(authController.me)
);

module.exports = router;
