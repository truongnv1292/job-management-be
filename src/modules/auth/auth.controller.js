/**
 * auth.controller.js — Nhận HTTP request, gọi auth.service, trả response
 * KHÔNG chứa business logic — chỉ orchestration và format response
 */

import * as authService from './auth.service.js';
import { success } from '../../utils/apiResponse.js';

/**
 * POST /auth/register
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    return success(res, {
      data: result,
      message: 'Đăng ký thành công',
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /auth/login
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    return success(res, {
      data: result,
      message: 'Đăng nhập thành công',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /auth/me — Lấy profile user đang đăng nhập
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getMe(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.id);

    if (!user) {
      const error = new Error('User không tồn tại');
      error.statusCode = 404;
      throw error;
    }

    return success(res, {
      data: user,
      message: 'Lấy profile thành công',
    });
  } catch (error) {
    next(error);
  }
}
