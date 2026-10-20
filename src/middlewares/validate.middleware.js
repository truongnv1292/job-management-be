/**
 * validate.middleware.js — Middleware validate body/query/params bằng Zod
 * Dùng chung cho mọi module — tránh lặp code validate trong controller
 */

import { fail } from '../utils/apiResponse.js';

/**
 * Tạo middleware validate từ Zod schema
 * @param {import('zod').ZodSchema} schema - Schema Zod (body, query, hoặc params)
 * @param {'body'|'query'|'params'} source - Nguồn dữ liệu cần validate
 * @returns {import('express').RequestHandler}
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.') || source,
        message: err.message,
      }));

      return fail(res, {
        message: 'Dữ liệu đầu vào không hợp lệ',
        statusCode: 400,
        errors,
      });
    }

    // Ghi đè bằng data đã parse (trim string, coerce number...) — an toàn hơn
    req[source] = result.data;
    next();
  };
}
