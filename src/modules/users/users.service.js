/**
 * users.service.js — Business logic CRUD User (module mẫu để junior nhân bản)
 * Toàn bộ truy vấn DB qua Prisma — KHÔNG viết SQL thủ công
 * Pattern: service throw error có statusCode → error.middleware xử lý
 */

import { prisma } from '../../config/prisma.js';
import { uploadToCloudinary } from '../../config/cloudinary.js';

/**
 * Select public fields — luôn loại password khỏi response
 * Junior: copy constant này sang module khác nếu model có field nhạy cảm
 */
const userPublicSelect = {
  id: true,
  email: true,
  name: true,
  avatar: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Lấy danh sách user có phân trang
 * skip/take thay offset/limit thủ công — Prisma translate sang SQL LIMIT/OFFSET
 * @param {{ page: number, limit: number }} pagination
 * @returns {Promise<{ users: object[], meta: object }>}
 */
export async function getUsers({ page, limit }) {
  const skip = (page - 1) * limit; // page 1 → skip 0, page 2 → skip limit...

  // Promise.all chạy song song — nhanh hơn await tuần tự
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      select: userPublicSelect,
      orderBy: { createdAt: 'desc' }, // User mới nhất lên đầu
    }),
    prisma.user.count(), // count() riêng để tính totalPages chính xác
  ]);

  return {
    users,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Lấy user theo ID
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: userPublicSelect,
  });
}

/**
 * Cập nhật user
 * @param {string} id
 * @param {{ name?: string, email?: string }} data
 * @returns {Promise<object>}
 * @throws Prisma P2025 nếu user không tồn tại
 */
export async function updateUser(id, data) {
  return prisma.user.update({
    where: { id },
    data,
    select: userPublicSelect,
  });
}

/**
 * Xóa user
 * @param {string} id
 * @returns {Promise<object>}
 * @throws Prisma P2025 nếu user không tồn tại
 */
export async function deleteUser(id) {
  return prisma.user.delete({
    where: { id },
    select: userPublicSelect,
  });
}

/**
 * Upload avatar lên Cloudinary và cập nhật URL vào DB
 * @param {string} id - User ID
 * @param {Buffer} fileBuffer - Buffer từ Multer memoryStorage
 * @returns {Promise<object>}
 */
export async function uploadUserAvatar(id, fileBuffer) {
  const avatarUrl = await uploadToCloudinary(fileBuffer, 'avatars');

  return prisma.user.update({
    where: { id },
    data: { avatar: avatarUrl },
    select: userPublicSelect,
  });
}
