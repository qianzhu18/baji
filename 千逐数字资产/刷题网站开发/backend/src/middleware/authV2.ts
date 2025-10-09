import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';

interface JwtPayload {
  id: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * V2 API认证中间件 - 使用Prisma
 */
export const protectV2 = async (req: any, res: Response, next: NextFunction) => {
  try {
    // 1) 获取令牌并检查是否存在
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new ApiError('您需要登录才能访问此资源', 401));
    }

    // 2) 验证令牌
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next(new ApiError('服务器配置错误', 500));
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;

    // 3) 检查用户是否仍然存在
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!currentUser) {
      return next(new ApiError('令牌对应的用户不存在', 401));
    }

    // 4) 检查用户是否激活
    if (!currentUser.isActive) {
      return next(new ApiError('用户账户已被禁用', 401));
    }

    // 5) 将用户信息添加到请求对象
    req.user = currentUser;

    logger.debug('用户认证成功', {
      userId: currentUser.id,
      email: currentUser.email
    });

    next();
  } catch (error) {
    logger.error('V2认证中间件错误:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      return next(new ApiError('无效的令牌', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      return next(new ApiError('令牌已过期', 401));
    }

    next(new ApiError('认证失败', 401));
  }
};



export default protectV2;
