/**
 * env.js — Validate và export biến môi trường
 * Được import đầu tiên trong app.js để fail-fast nếu thiếu config quan trọng
 * Junior: mọi biến env mới phải thêm vào đây, không đọc process.env trực tiếp rải rác
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { APP_ENVS, environments } from './environments.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

/**
 * Xác định APP_ENV — thứ tự ưu tiên:
 * 1. process.env.APP_ENV (set thủ công, vd: script package.json)
 * 2. VERCEL_ENV trên Vercel (production → prod, preview → staging, development → dev)
 * 3. Mặc định 'dev' (local)
 */
function resolveAppEnv() {
  if (process.env.APP_ENV) {
    return process.env.APP_ENV;
  }

  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === 'production') return 'prod';
  if (vercelEnv === 'preview') return 'staging';
  if (vercelEnv === 'development') return 'dev';

  return 'dev';
}

const appEnv = resolveAppEnv();

if (!APP_ENVS.includes(appEnv)) {
  throw new Error(
    `❌ APP_ENV không hợp lệ: "${appEnv}". Chỉ chấp nhận: ${APP_ENVS.join(', ')}`,
  );
}

// Load .env chung trước, sau đó override bằng file theo môi trường
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, `.env.${appEnv}`), override: true });

/**
 * Schema Zod định nghĩa biến môi trường bắt buộc
 * Validate ngay khi app khởi động → tránh lỗi "undefined" khó debug lúc runtime
 */
const envSchema = z.object({
  APP_ENV: z.enum(['dev', 'staging', 'prod']).default('dev'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL là bắt buộc'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL là bắt buộc (dùng cho prisma migrate)'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET phải >= 32 ký tự để đủ mạnh'),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME là bắt buộc'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY là bắt buộc'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET là bắt buộc'),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  PORT: z.coerce.number().default(3000),
});

/**
 * Parse và validate env — throw lỗi rõ ràng nếu thiếu/sai
 * @returns {z.infer<typeof envSchema> & { isDev: boolean; isStaging: boolean; isProd: boolean; hideErrorDetails: boolean; envLabel: string }}
 * @throws {Error} Khi thiếu biến bắt buộc hoặc JWT_SECRET quá ngắn
 */
function validateEnv() {
  const result = envSchema.safeParse({
    ...process.env,
    APP_ENV: appEnv,
  });

  if (!result.success) {
    const messages = result.error.errors.map((e) => `  - ${e.path.join('.')}: ${e.message}`);
    throw new Error(`❌ Biến môi trường không hợp lệ:\n${messages.join('\n')}`);
  }

  const config = environments[result.data.APP_ENV];
  const nodeEnv = result.data.NODE_ENV ?? config.defaultNodeEnv;

  return {
    ...result.data,
    NODE_ENV: nodeEnv,
    envLabel: config.label,
    hideErrorDetails: config.hideErrorDetails,
    isDev: result.data.APP_ENV === 'dev',
    isStaging: result.data.APP_ENV === 'staging',
    isProd: result.data.APP_ENV === 'prod',
  };
}

export const env = validateEnv();
