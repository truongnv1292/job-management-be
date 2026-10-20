/**
 * users.controller.js — HTTP handlers cho users CRUD
 * Mỗi handler: try/catch → gọi service → success() hoặc next(error)
 */

import * as usersService from './users.service.js';
import { success } from '../../utils/apiResponse.js';

/**
 * GET /users — Danh sách user có phân trang
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getUsers(req, res, next) {
  try {
    const result = await usersService.getUsers(req.query);
    return success(res, {
      data: result,
      message: 'Lấy danh sách user thành công',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /users/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getUserById(req, res, next) {
  try {
    const user = await usersService.getUserById(req.params.id);

    if (!user) {
      const error = new Error('Không tìm thấy user');
      error.statusCode = 404;
      throw error;
    }

    return success(res, {
      data: user,
      message: 'Lấy user thành công',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /users/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function updateUser(req, res, next) {
  try {
    const user = await usersService.updateUser(req.params.id, req.body);
    return success(res, {
      data: user,
      message: 'Cập nhật user thành công',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /users/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function deleteUser(req, res, next) {
  try {
    const user = await usersService.deleteUser(req.params.id);
    return success(res, {
      data: user,
      message: 'Xóa user thành công',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /users/:id/avatar — Upload avatar (Multer chạy trước controller)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      const error = new Error('Vui lòng gửi file ảnh qua field "avatar"');
      error.statusCode = 400;
      throw error;
    }

    const user = await usersService.uploadUserAvatar(req.params.id, req.file.buffer);

    return success(res, {
      data: user,
      message: 'Upload avatar thành công',
    });
  } catch (error) {
    next(error);
  }
}
