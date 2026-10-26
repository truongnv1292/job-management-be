/**
 * r2.js — Khởi tạo AWS S3 Client kết nối Cloudflare R2
 * Được dùng bởi users module khi upload avatar
 * Config lấy từ env.js (đã validate) — không hardcode secret
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import { env } from './env.js';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload buffer lên Cloudflare R2
 * @param {Buffer} buffer - Nội dung file từ Multer memoryStorage
 * @param {string} [mimeType='image/jpeg'] - MIME type của file (vd: image/png, image/jpeg,...)
 * @param {string} [folder='avatars'] - Thư mục / prefix trên bucket R2
 * @returns {Promise<string>} Public URL của file trên Cloudflare R2
 */
export async function uploadToR2(buffer, mimeType = 'image/jpeg', folder = 'avatars') {
  const extMap = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  const ext = extMap[mimeType] || 'jpg';
  const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
  const key = `${folder}/${fileName}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  return `${env.R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}`;
}
