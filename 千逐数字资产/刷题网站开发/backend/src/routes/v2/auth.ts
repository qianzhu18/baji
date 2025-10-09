import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../../middleware/validation';
import { prisma } from '../../config/prisma';
import { logger } from '../../utils/logger';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 验证规则
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少需要6个字符'),
  body('name')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('姓名长度必须在1-50字符之间'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('请输入密码'),
];

// POST /api/auth/register - 用户注册
router.post(
  '/register',
  registerValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;

      // 检查用户是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '该邮箱已被注册',
        });
      }

      // 加密密码
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 创建用户
      const user = await prisma.user.create({
        data: {
          id: uuidv4(),
          email,
          password: hashedPassword,
          name: name || null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          createdAt: true,
        },
      });

      // 生成JWT token
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET is not defined');
      }
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email
        },
        secret,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        } as jwt.SignOptions
      );

      logger.info('用户注册成功', { 
        userId: user.id, 
        email: user.email 
      });

      return res.status(201).json({
        success: true,
        message: '注册成功',
        data: {
          user,
          token,
        },
      });

    } catch (error) {
      logger.error('用户注册失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '注册失败',
      });
    }
  }
);

// POST /api/auth/login - 用户登录
router.post(
  '/login',
  loginValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // 查找用户
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: '邮箱或密码错误',
        });
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: '邮箱或密码错误',
        });
      }

      // 检查用户状态
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: '账户已被禁用',
        });
      }

      // 生成JWT token
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET is not defined');
      }
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email
        },
        secret,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        } as jwt.SignOptions
      );

      // 返回用户信息（不包含密码）
      const userResponse = {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        isActive: user.isActive,
        createdAt: user.createdAt,
      };

      logger.info('用户登录成功', { 
        userId: user.id, 
        email: user.email 
      });

      return res.json({
        success: true,
        message: '登录成功',
        data: {
          user: userResponse,
          token,
        },
      });

    } catch (error) {
      logger.error('用户登录失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '登录失败',
      });
    }
  }
);

export default router;
