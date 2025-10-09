import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';
import { ApiError } from '@/utils/ApiError';

/**
 * 验证请求数据中间件
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error: ValidationError) => {
      if (error.type === 'field') {
        return `${error.path}: ${error.msg}`;
      }
      return error.msg;
    });
    
    return next(new ApiError(`验证失败: ${errorMessages.join(', ')}`, 400));
  }
  
  next();
};
