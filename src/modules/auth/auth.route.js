/**
 * auth.route.js — Định nghĩa routes cho module auth
 * Pattern: route → validate → (authenticate) → controller
 * Junior copy file này khi tạo module mới, đổi prefix và controller
 */

import { Router } from 'express';
import * as authController from './auth.controller.js';
import { registerSchema, loginSchema } from './auth.validator.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

// POST /api/auth/register — Public, không cần JWT
router.post('/register', validate(registerSchema), authController.register);

// POST /api/auth/login — Public
router.post('/login', validate(loginSchema), authController.login);

// GET /api/auth/me — Protected, cần JWT hợp lệ
router.get('/me', authenticate, authController.getMe);

export default router;
