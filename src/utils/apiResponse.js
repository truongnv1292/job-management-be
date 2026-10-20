/**
 * apiResponse.js — Helper format response thống nhất toàn app
 * Mọi controller gọi các hàm này thay vì res.json() trực tiếp
 * Junior copy pattern này khi tạo module mới
 */

/**
 * Response thành công
 * @param {import('express').Response} res - Express response object
 * @param {object} options
 * @param {*} [options.data=null] - Dữ liệu trả về
 * @param {string} [options.message='Thành công'] - Message mô tả
 * @param {number} [options.statusCode=200] - HTTP status
 * @returns {import('express').Response}
 */
export function success(res, { data = null, message = 'Thành công', statusCode = 200 } = {}) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

/**
 * Response thất bại
 * @param {import('express').Response} res - Express response object
 * @param {object} options
 * @param {string} options.message - Message lỗi chính
 * @param {number} [options.statusCode=400] - HTTP status
 * @param {Array<{field?: string, message: string}>} [options.errors=[]] - Chi tiết lỗi validation
 * @returns {import('express').Response}
 */
export function fail(res, { message, statusCode = 400, errors = [] } = {}) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}
