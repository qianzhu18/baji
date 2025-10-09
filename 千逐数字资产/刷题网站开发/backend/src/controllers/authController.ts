import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, IUser } from '@/models/User';
import { logger } from '@/utils/logger';
import { ApiError } from '@/utils/ApiError';
import { sendEmail } from '@/services/emailService';

interface AuthRequest extends Request {
  user?: IUser;
}

// JWT工具函数
const signToken = (id: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.sign({ id: id }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
};

const createSendToken = (user: IUser, statusCode: number, res: Response): void => {
  const token = signToken(user._id.toString());
  
  const cookieOptions = {
    expires: new Date(
      Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRES_IN || '7') * 24 * 60 * 60 * 1000)
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const
  };

  res.cookie('jwt', token, cookieOptions);

  // 移除密码字段
  user.password = undefined as any;

  res.status(statusCode).json({
    success: true,
    message: statusCode === 201 ? '注册成功' : '登录成功',
    data: {
      token,
      user
    }
  });
};

/**
 * @desc    用户注册
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    // 检查用户是否已存在
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ApiError('该邮箱已被注册', 400));
    }

    // 创建新用户
    const user = await User.create({
      name,
      email,
      password,
      stats: {
        totalQuizzes: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        studyTime: 0,
        joinDate: new Date()
      }
    });

    // 生成邮箱验证令牌
    const verifyToken = user.generateEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // 发送验证邮件
    try {
      const verifyURL = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${verifyToken}`;
      
      await sendEmail({
        email: user.email,
        subject: '智能题库系统 - 邮箱验证',
        message: `请点击以下链接验证您的邮箱：\n\n${verifyURL}\n\n如果您没有注册账户，请忽略此邮件。`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="color: #333; text-align: center;">欢迎使用智能题库系统</h2>
            <p>感谢您注册我们的服务！请点击下面的按钮验证您的邮箱地址：</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyURL}" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">验证邮箱</a>
            </div>
            <p style="color: #666; font-size: 14px;">如果按钮无法点击，请复制以下链接到浏览器：</p>
            <p style="color: #666; font-size: 14px; word-break: break-all;">${verifyURL}</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">如果您没有注册账户，请忽略此邮件。</p>
          </div>
        `
      });

      logger.info('注册成功，验证邮件已发送', { email: user.email });
    } catch (emailError) {
      logger.error('发送验证邮件失败', emailError);
      // 邮件发送失败不影响注册流程
    }

    createSendToken(user, 201, res);
  } catch (error) {
    logger.error('用户注册失败', error);
    next(error);
  }
};

/**
 * @desc    用户登录
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // 检查邮箱和密码是否提供
    if (!email || !password) {
      return next(new ApiError('请提供邮箱和密码', 400));
    }

    // 演示模式：如果没有数据库连接，使用硬编码的演示用户
    if (process.env.NODE_ENV === 'development' && email === 'demo@example.com' && password === 'Demo123456') {
      const token = signToken('demo-user-id');

      res.status(200).json({
        success: true,
        message: '登录成功（演示模式）',
        data: {
          token,
          user: {
            id: 'demo-user-id',
            name: '演示用户',
            email: 'demo@example.com',
            role: 'user',
            avatar: null
          }
        }
      });
      return;
    }

    // 查找用户并包含密码字段
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return next(new ApiError('邮箱或密码错误', 401));
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    logger.info('用户登录成功', { email: user.email });
    createSendToken(user, 200, res);
  } catch (error) {
    logger.error('用户登录失败', error);
    next(error);
  }
};

/**
 * @desc    用户登出
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = (req: Request, res: Response): void => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.status(200).json({
    success: true,
    message: '登出成功'
  });
};

/**
 * @desc    忘记密码
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    // 查找用户
    const user = await User.findOne({ email });
    if (!user) {
      return next(new ApiError('该邮箱未注册', 404));
    }

    // 生成重置令牌
    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // 发送重置邮件
    try {
      const resetURL = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
      
      await sendEmail({
        email: user.email,
        subject: '智能题库系统 - 密码重置',
        message: `您的密码重置链接：\n\n${resetURL}\n\n此链接将在10分钟后失效。如果您没有请求重置密码，请忽略此邮件。`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="color: #333; text-align: center;">密码重置</h2>
            <p>您请求重置密码。请点击下面的按钮重置您的密码：</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetURL}" style="background-color: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">重置密码</a>
            </div>
            <p style="color: #666; font-size: 14px;">此链接将在10分钟后失效。</p>
            <p style="color: #666; font-size: 14px;">如果按钮无法点击，请复制以下链接到浏览器：</p>
            <p style="color: #666; font-size: 14px; word-break: break-all;">${resetURL}</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">如果您没有请求重置密码，请忽略此邮件。</p>
          </div>
        `
      });

      res.status(200).json({
        success: true,
        message: '密码重置链接已发送到您的邮箱'
      });

      logger.info('密码重置邮件已发送', { email: user.email });
    } catch (emailError) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      logger.error('发送密码重置邮件失败', emailError);
      return next(new ApiError('发送邮件时出错，请稍后重试', 500));
    }
  } catch (error) {
    logger.error('忘记密码处理失败', error);
    next(error);
  }
};

/**
 * @desc    重置密码
 * @route   PATCH /api/auth/reset-password/:token
 * @access  Public
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // 加密令牌并查找用户
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return next(new ApiError('令牌无效或已过期', 400));
    }

    // 设置新密码
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // 发送确认邮件
    try {
      await sendEmail({
        email: user.email,
        subject: '智能题库系统 - 密码重置成功',
        message: '您的密码已成功重置。如果这不是您本人的操作，请立即联系客服。',
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="color: #10b981; text-align: center;">密码重置成功</h2>
            <p>您的密码已成功重置。</p>
            <p style="color: #666; font-size: 14px;">重置时间：${new Date().toLocaleString('zh-CN')}</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              如果这不是您本人的操作，请立即联系客服。
            </p>
          </div>
        `
      });
    } catch (emailError) {
      logger.error('发送密码重置确认邮件失败', emailError);
    }

    logger.info('密码重置成功', { email: user.email });
    createSendToken(user, 200, res);
  } catch (error) {
    logger.error('密码重置失败', error);
    next(error);
  }
};

/**
 * @desc    验证邮箱
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.params;

    // 加密令牌并查找用户
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken
    });

    if (!user) {
      return next(new ApiError('验证令牌无效', 400));
    }

    // 验证邮箱
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save({ validateBeforeSave: false });

    logger.info('邮箱验证成功', { email: user.email });

    res.status(200).json({
      success: true,
      message: '邮箱验证成功'
    });
  } catch (error) {
    logger.error('邮箱验证失败', error);
    next(error);
  }
};

/**
 * @desc    获取当前用户信息
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user
    }
  });
};
