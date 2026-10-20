/**
 * error.middleware.js — Bắt lỗi toàn app (middleware cuối cùng)
 * Express tự gọi khi có next(err) hoặc async handler throw
 * KHÔNG expose lỗi Prisma/internal ra client — trả message thân thiện
 */

import { Prisma } from '@prisma/client';
import { fail } from '../utils/apiResponse.js';
import { env } from '../config/env.js';

/**
 * Map mã lỗi Prisma sang HTTP status và message thân thiện
 * @param {import('@prisma/client').Prisma.PrismaClientKnownRequestError} error
 * @returns {{ statusCode: number, message: string }}
 */
function handlePrismaError(error) {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation — vd: email đã tồn tại
      return {
        statusCode: 409,
        message: `Dữ liệu trùng lặp: ${error.meta?.target?.join(', ') || 'field unique'}`,
      };
    case 'P2025':
      // Record not found — update/delete record không tồn tại
      return {
        statusCode: 404,
        message: 'Không tìm thấy bản ghi',
      };
    case 'P2003':
      // Foreign key constraint
      return {
        statusCode: 400,
        message: 'Dữ liệu tham chiếu không hợp lệ',
      };
    default:
      return {
        statusCode: 500,
        message: 'Lỗi cơ sở dữ liệu',
      };
  }
}

/**
 * Global error handler — phải có đủ 4 tham số để Express nhận diện
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function errorHandler(err, req, res, next) {
  // Log đầy đủ phía server để debug — client chỉ nhận message an toàn
  console.error('[Error]', err);

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const { statusCode, message } = handlePrismaError(err);
    return fail(res, { message, statusCode });
  }

  // Lỗi validation tự throw từ service (vd: email đã tồn tại)
  if (err.statusCode) {
    return fail(res, {
      message: err.message,
      statusCode: err.statusCode,
      errors: err.errors || [],
    });
  }

  // Multer lỗi upload
  if (err.code === 'LIMIT_FILE_SIZE') {
    return fail(res, { message: 'File quá lớn. Tối đa 5MB', statusCode: 400 });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return fail(res, { message: 'Field upload không đúng. Dùng field "avatar"', statusCode: 400 });
  }

  const message = env.hideErrorDetails
    ? 'Đã xảy ra lỗi server'
    : err.message || 'Đã xảy ra lỗi server';

  return fail(res, { message, statusCode: 500 });
}

/**
 * Bắt route không tồn tại — đặt sau tất cả routes
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export function notFoundHandler(req, res) {
  return fail(res, {
    message: `Route ${req.method} ${req.originalUrl} không tồn tại`,
    statusCode: 404,
  });
}
