/**
 * auth.middleware.js — Xác thực JWT
 * Gắn vào route cần đăng nhập (users CRUD, upload avatar...)
 * Đọc token từ header Authorization: Bearer <token>
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { fail } from '../utils/apiResponse.js';

/**
 * Middleware xác thực JWT — gắn req.user nếu token hợp lệ
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
export function authenticate(req, res, next) {
  // Header chuẩn: "Bearer eyJhbGciOiJIUzI1NiIs..."
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return fail(res, {
      message: 'Thiếu token xác thực. Gửi header: Authorization: Bearer <token>',
      statusCode: 401,
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // verify tự check hết hạn (exp claim) — không cần check thủ công
    const payload = jwt.verify(token, env.JWT_SECRET);

    // payload chứa { id, email } — đủ để authorize, không cần query DB mỗi request
    req.user = payload;
    next();
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Token đã hết hạn, vui lòng đăng nhập lại'
        : 'Token không hợp lệ';

    return fail(res, { message, statusCode: 401 });
  }
}
