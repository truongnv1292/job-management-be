/**
 * app.js — Khởi tạo và cấu hình Express application
 * Được import bởi api/index.js (Vercel) và có thể dùng cho test local
 * KHÔNG gọi app.listen() ở đây — listen nằm trong api/index.js
 */

import express from 'express';
import cors from 'cors';

// Import env TRƯỚC mọi config khác — fail-fast nếu thiếu biến môi trường
import './config/env.js';

import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

const app = express();

// CORS — cho phép frontend gọi API từ domain khác
app.use(cors());

// Parse JSON body — mặc định limit 100kb, đủ cho hầu hết API
app.use(express.json());

// Parse URL-encoded form (ít dùng hơn JSON nhưng cần cho một số client cũ)
app.use(express.urlencoded({ extended: true }));

// Mount tất cả API routes tại /api
app.use('/api', routes);

// 404 handler — phải đặt SAU tất cả routes
app.use(notFoundHandler);

// Error handler — phải đặt CUỐI CÙNG (4 tham số)
app.use(errorHandler);

export default app;
