/**
 * auth.validator.js — Schema Zod validate input cho auth routes
 * Tách riêng khỏi controller để dễ test và tái sử dụng
 */

import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email là bắt buộc' })
    .email('Email không hợp lệ')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password là bắt buộc' })
    .min(8, 'Password tối thiểu 8 ký tự')
    .max(72, 'Password tối đa 72 ký tự'), // bcrypt giới hạn 72 bytes
  name: z.string().trim().min(1, 'Tên không được để trống').optional(),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email là bắt buộc' })
    .email('Email không hợp lệ')
    .toLowerCase()
    .trim(),
  password: z.string({ required_error: 'Password là bắt buộc' }).min(1, 'Password là bắt buộc'),
});
