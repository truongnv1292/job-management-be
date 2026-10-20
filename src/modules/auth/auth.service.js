/**
 * auth.service.js — Business logic đăng ký / đăng nhập
 * Controller chỉ nhận req và gọi service — KHÔNG viết logic DB ở controller
 * Junior: copy pattern này khi tạo module mới (service → controller → route)
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';

// Số vòng hash bcrypt — 10 là cân bằng giữa bảo mật và performance
const BCRYPT_ROUNDS = 10;

// JWT hết hạn sau 7 ngày — có thể điều chỉnh theo yêu cầu product
const JWT_EXPIRES_IN = '7d';

/**
 * Select mặc định khi trả user — LOẠI BỎ password khỏi mọi response
 * Dùng select thay vì trả full object rồi delete password — an toàn hơn, không quên field
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
 * Tạo JWT token từ thông tin user
 * @param {{ id: string, email: string }} user
 * @returns {string} JWT token
 */
function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Đăng ký tài khoản mới
 * @param {{ email: string, password: string, name?: string }} data
 * @returns {Promise<{ user: object, token: string }>}
 * @throws {{ statusCode: number, message: string }} Email đã tồn tại
 */
export async function register(data) {
  const { email, password, name } = data;

  // findUnique thay findFirst vì email có @unique — Prisma dùng index, nhanh và rõ ràng
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true }, // Chỉ cần id để check tồn tại — không load password
  });

  if (existingUser) {
    const error = new Error('Email đã được sử dụng');
    error.statusCode = 409;
    throw error;
  }

  // Hash password TRƯỚC khi lưu — KHÔNG BAO GIỜ lưu plain text
  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: name || null,
    },
    select: userPublicSelect, // create cũng dùng select — response không có password
  });

  const token = signToken(user);

  return { user, token };
}

/**
 * Đăng nhập — xác thực email/password và trả JWT
 * @param {{ email: string, password: string }} data
 * @returns {Promise<{ user: object, token: string }>}
 * @throws {{ statusCode: number, message: string }} Sai email hoặc password
 */
export async function login(data) {
  const { email, password } = data;

  // Login cần password để so sánh — select riêng, KHÔNG trả password ra ngoài
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Message chung "Email hoặc password không đúng" — tránh leak email có tồn tại hay không
  if (!user) {
    const error = new Error('Email hoặc password không đúng');
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    const error = new Error('Email hoặc password không đúng');
    error.statusCode = 401;
    throw error;
  }

  const token = signToken(user);

  // Destructure loại password trước khi trả — double safety
  const { password: _, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, token };
}

/**
 * Lấy profile user hiện tại từ userId (dùng sau authenticate middleware)
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function getProfile(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: userPublicSelect,
  });
}
