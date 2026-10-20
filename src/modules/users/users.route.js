/**
 * users.route.js — Routes CRUD user (module mẫu)
 * TẤT CẢ routes đều protected — cần JWT (authenticate middleware)
 * Junior: copy cấu trúc này, đổi path và import controller tương ứng
 */

import { Router } from 'express';
import * as usersController from './users.controller.js';
import {
  userIdParamSchema,
  paginationQuerySchema,
  updateUserSchema,
} from './users.validator.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { uploadAvatar } from '../../middlewares/upload.middleware.js';

const router = Router();

// Mọi route trong module users đều yêu cầu đăng nhập
router.use(authenticate);

// GET /api/users?page=1&limit=10
router.get('/', validate(paginationQuerySchema, 'query'), usersController.getUsers);

// GET /api/users/:id
router.get('/:id', validate(userIdParamSchema, 'params'), usersController.getUserById);

// PUT /api/users/:id
router.put(
  '/:id',
  validate(userIdParamSchema, 'params'),
  validate(updateUserSchema),
  usersController.updateUser
);

// DELETE /api/users/:id
router.delete('/:id', validate(userIdParamSchema, 'params'), usersController.deleteUser);

// POST /api/users/:id/avatar — multipart/form-data, field "avatar"
router.post(
  '/:id/avatar',
  validate(userIdParamSchema, 'params'),
  uploadAvatar,
  usersController.uploadAvatar
);

export default router;
