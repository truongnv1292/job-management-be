/**
 * routes/index.js — Gom tất cả module routes vào một Router
 * app.js mount router này tại prefix /api
 * Junior thêm module mới: import route → router.use('/ten-module', tenModuleRoute)
 */

import { Router } from 'express';
import { env } from '../config/env.js';
import authRoute from '../modules/auth/auth.route.js';
import usersRoute from '../modules/users/users.route.js';

const router = Router();

// Health check — dùng để verify server đang chạy (monitoring, Vercel ping)
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server đang hoạt động',
    data: {
      appEnv: env.APP_ENV,
      nodeEnv: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// Mount module routes — prefix /auth → /api/auth/*, /users → /api/users/*
router.use('/auth', authRoute);
router.use('/users', usersRoute);

export default router;
