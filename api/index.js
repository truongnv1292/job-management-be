/**
 * api/index.js — Entry point cho Vercel Serverless Functions
 * Vercel rewrite mọi request /api/* về file này
 * Chạy local: node api/index.js hoặc npm run dev
 */

import app from '../src/app.js';
import { env } from '../src/config/env.js';

// Export default handler cho Vercel — mỗi request gọi app(req, res)
export default app;

// Chạy HTTP server khi không phải Vercel (local development)
// Vercel set VERCEL=1 — không listen port trên serverless
if (!process.env.VERCEL) {
  app.listen(env.PORT, () => {
    console.log(`🚀 Server chạy tại http://localhost:${env.PORT}`);
    console.log(`🌍 Môi trường: ${env.envLabel} (APP_ENV=${env.APP_ENV}, NODE_ENV=${env.NODE_ENV})`);
    console.log(`📋 Health check: http://localhost:${env.PORT}/api/health`);
    console.log(`🔐 Auth: POST /api/auth/register, POST /api/auth/login`);
    console.log(`👤 Users: GET /api/users (cần JWT)`);
  });
}
