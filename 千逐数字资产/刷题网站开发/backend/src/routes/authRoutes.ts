/**
 * v1 Auth API Routes (DEPRECATED)
 *
 * ⚠️ 这些路由已被弃用，将在 2025-12-31 移除
 * 请迁移到 v2 API: /api/v2/auth/*
 */

import express from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  getMe
} from '../controllers/authController';
import { protect } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { deprecateV1Api } from '../middleware/deprecation';

const router = express.Router();

// ⚠️ v1 API 已弃用 - 请迁移到 v2
router.use(deprecateV1Api);

// 验证规则
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('用户名长度必须在2-50个字符之间')
    .matches(/^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/)
    .withMessage('用户名只能包含字母、数字、中文、下划线和连字符'),
  
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('密码长度必须在6-128个字符之间')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含至少一个小写字母、一个大写字母和一个数字'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('密码不能为空'),
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
];

const resetPasswordValidation = [
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('密码长度必须在6-128个字符之间')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含至少一个小写字母、一个大写字母和一个数字'),
];

// 公开路由
router.post('/register', registerValidation, validateRequest, register);
router.post('/login', loginValidation, validateRequest, login);
router.post('/forgot-password', forgotPasswordValidation, validateRequest, forgotPassword);
router.patch('/reset-password/:token', resetPasswordValidation, validateRequest, resetPassword);
router.get('/verify-email/:token', verifyEmail);

// 受保护的路由
router.post('/logout', logout);
router.get('/me', protect, getMe);

export default router;
