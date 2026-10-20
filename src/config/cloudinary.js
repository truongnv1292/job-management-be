/**
 * cloudinary.js — Khởi tạo Cloudinary SDK
 * Được dùng bởi upload.middleware và users module khi upload avatar
 * Config lấy từ env.js (đã validate) — không hardcode secret
 */

import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true, // Luôn dùng HTTPS cho URL ảnh
});

export { cloudinary };

/**
 * Upload buffer lên Cloudinary (dùng sau khi Multer đọc file vào memory)
 * @param {Buffer} buffer - Nội dung file từ Multer memoryStorage
 * @param {string} folder - Thư mục trên Cloudinary (vd: 'avatars')
 * @returns {Promise<string>} URL ảnh public trên Cloudinary
 * @throws {Error} Khi upload thất bại
 */
export function uploadToCloudinary(buffer, folder = 'avatars') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        // Tự động resize ảnh lớn — tiết kiệm bandwidth và storage
        transformation: [{ width: 500, height: 500, crop: 'limit' }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}
