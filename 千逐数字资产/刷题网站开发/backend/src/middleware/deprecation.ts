import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * v1 API 弃用中间件
 * 为所有v1 API添加弃用警告，引导用户迁移到v2
 */
export const deprecateV1Api = (req: Request, res: Response, next: NextFunction) => {
  // 添加弃用警告头
  res.setHeader('X-API-Deprecated', 'true');
  res.setHeader('X-API-Deprecation-Date', '2025-07-25');
  res.setHeader('X-API-Sunset-Date', '2025-12-31');
  res.setHeader('X-API-Migration-Guide', 'https://docs.example.com/api/v2-migration');
  
  // 记录弃用API的使用情况
  logger.warn('Deprecated v1 API accessed', {
    path: req.path,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // 在响应中添加弃用信息
  const originalJson = res.json;
  res.json = function(body: any) {
    const deprecationInfo = {
      _deprecation: {
        message: 'This API version (v1) is deprecated and will be removed on 2025-12-31',
        migrationGuide: 'Please migrate to v2 API. See documentation for details.',
        v2Endpoint: req.path.replace('/api/', '/api/v2/'),
        supportContact: 'support@example.com'
      }
    };

    // 如果响应是对象，添加弃用信息
    if (typeof body === 'object' && body !== null) {
      body = { ...body, ...deprecationInfo };
    }

    return originalJson.call(this, body);
  };

  next();
};

/**
 * 创建v1路由的弃用包装器
 */
export const wrapV1Route = (router: any) => {
  // 为所有路由添加弃用中间件
  router.use(deprecateV1Api);
  
  return router;
};
