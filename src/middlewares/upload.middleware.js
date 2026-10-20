/**
 * upload.middleware.js — Cấu hình Multer cho upload file
 * Dùng memoryStorage thay diskStorage vì Vercel serverless không ghi file local được
 * Buffer từ memory sẽ được đẩy lên Cloudinary ngay trong controller
 */

import multer from 'multer';

// Chỉ cho phép upload ảnh — tránh user upload script/executable
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Filter file — reject nếu không phải ảnh
 * @param {import('express').Request} req
 * @param {Express.Multer.File} file
 * @param {multer.FileFilterCallback} cb
 */
function fileFilter(req, file, cb) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh (JPEG, PNG, WebP, GIF)'), false);
  }
}

/**
 * Multer instance — memoryStorage phù hợp serverless (không cần filesystem)
 * limits: 5MB — đủ cho avatar, tránh abuse storage
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
});

/**
 * Middleware upload 1 file field tên "avatar"
 * Dùng: router.post('/avatar', authenticate, uploadAvatar, controller)
 */
export const uploadAvatar = upload.single('avatar');
