/**
 * users.validator.js — Schema validate input cho users CRUD
 */

import { z } from 'zod';

export const userIdParamSchema = z.object({
  id: z.string().cuid('ID user không hợp lệ'),
});

export const paginationQuerySchema = z.object({
  // coerce.number() — query string "1" → number 1
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1, 'Tên không được để trống').optional(),
    email: z.string().email('Email không hợp lệ').toLowerCase().trim().optional(),
  })
  .refine((data) => data.name !== undefined || data.email !== undefined, {
    message: 'Cần ít nhất một field để cập nhật (name hoặc email)',
  });
