import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '@/models/User';
import { ApiError } from '@/utils/ApiError';
import { logger } from '@/utils/logger';

interface AuthRequest extends Request {
  user?: IUser;
}

interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
}

/**
 * 保护路由中间件 - 验证JWT令牌
 */
export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;

    // 1) 从请求头或Cookie中获取令牌
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(new ApiError('您需要登录才能访问此资源', 401));
    }

    // 2) 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // 3) 演示模式：如果是演示用户，直接通过认证
    if (process.env.NODE_ENV === 'development' && decoded.id === 'demo-user-id') {
      req.user = {
        _id: 'demo-user-id',
        id: 'demo-user-id',
        name: '演示用户',
        email: 'demo@example.com',
        role: 'user',
        avatar: null
      } as any;
      next();
      return;
    }

    // 3) 检查用户是否仍然存在
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new ApiError('令牌对应的用户不存在', 401));
    }

    // 4) 检查用户是否在令牌发出后更改了密码
    if (currentUser.passwordChangedAfter && currentUser.passwordChangedAfter(decoded.iat)) {
      return next(new ApiError('用户最近更改了密码，请重新登录', 401));
    }

    // 5) 将用户信息添加到请求对象
    req.user = currentUser;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new ApiError('无效的令牌', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      return next(new ApiError('令牌已过期', 401));
    }
    
    logger.error('认证中间件错误:', error);
    next(new ApiError('认证失败', 401));
  }
};

/**
 * 限制访问权限中间件 - 基于用户角色
 */
export const restrictTo = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ApiError('用户信息不存在', 401));
    }

    // 注意：当前用户模型没有角色字段，这里为将来扩展预留
    // if (!roles.includes(req.user.role)) {
    //   return next(new ApiError('您没有权限执行此操作', 403));
    // }

    next();
  };
};

/**
 * 可选认证中间件 - 如果有令牌则验证，没有则继续
 */
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
        const currentUser = await User.findById(decoded.id);
        
        if (currentUser) {
          req.user = currentUser;
        }
      } catch (error) {
        // 令牌无效时不抛出错误，只是不设置用户信息
        logger.debug('可选认证中令牌无效:', error);
      }
    }

    next();
  } catch (error) {
    logger.error('可选认证中间件错误:', error);
    next();
  }
};

/**
 * 检查邮箱是否已验证
 */
export const requireEmailVerification = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(new ApiError('用户信息不存在', 401));
  }

  if (!req.user.isEmailVerified) {
    return next(new ApiError('请先验证您的邮箱地址', 403));
  }

  next();
};

/**
 * 检查用户是否是资源的所有者
 */
export const checkOwnership = (resourceField: string = 'userId') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new ApiError('用户信息不存在', 401));
    }

    // 这里需要根据具体的资源模型来实现
    // 例如检查题库是否属于当前用户
    next();
  };
};
