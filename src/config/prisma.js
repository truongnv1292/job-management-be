/**
 * prisma.js — Khởi tạo PrismaClient singleton
 * Được import bởi mọi service cần truy vấn DB (auth.service, users.service, ...)
 *
 * QUAN TRỌNG trên Vercel serverless:
 * Mỗi request có thể tạo instance Node mới → nếu new PrismaClient() mỗi lần
 * sẽ nhanh chóng cạn connection pool của Neon. Giải pháp: lưu vào global.
 */

import { PrismaClient } from '@prisma/client';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Neon serverless driver cần WebSocket — Node.js không có sẵn như browser
neonConfig.webSocketConstructor = ws;

// globalForPrisma giữ reference qua các lần gọi serverless (warm instance)
const globalForPrisma = global;

/**
 * Singleton PrismaClient — tái sử dụng connection giữa các request
 * log: ['error'] — chỉ log lỗi, tránh spam log query trong production
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
  });

// Chỉ cache vào global ở dev — production Vercel vẫn reuse warm instance
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
