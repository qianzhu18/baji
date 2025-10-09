import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';

import { logger } from './utils/logger';
import { ApiError } from './utils/ApiError';

// 路由导入
import authRoutes from './routes/authRoutes';
import quizRoutes from './routes/quizRoutes';
import aiRoutes from './routes/aiRoutes';
import practiceRoutes from './routes/practiceRoutes';

const app = express();

// 信任代理（用于获取真实IP）
app.set('trust proxy', 1);

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS配置
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = [
      process.env.CORS_ORIGIN || 'http://localhost:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
    
    // 允许没有origin的请求（如移动应用）
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('不允许的CORS来源'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// 请求日志
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      }
    }
  }));
}

// 压缩响应
app.use(compression());

// 解析请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie解析
app.use(cookieParser());

// 速率限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 限制每个IP每15分钟100个请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// 健康检查端点
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: '服务运行正常',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/practice', practiceRoutes);

// 404处理
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  next(new ApiError(`路由 ${req.originalUrl} 不存在`, 404));
});

// 全局错误处理中间件
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  let err = { ...error };
  err.message = error.message;

  // 记录错误
  logger.error('API错误:', {
    message: err.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Mongoose错误处理
  if (error.name === 'CastError') {
    const message = '资源不存在';
    err = new ApiError(message, 404);
  }

  // Mongoose重复字段错误
  if (error.code === 11000) {
    const message = '数据已存在';
    err = new ApiError(message, 400);
  }

  // Mongoose验证错误
  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors).map((val: any) => val.message).join(', ');
    err = new ApiError(message, 400);
  }

  // JWT错误
  if (error.name === 'JsonWebTokenError') {
    const message = '无效的令牌';
    err = new ApiError(message, 401);
  }

  if (error.name === 'TokenExpiredError') {
    const message = '令牌已过期';
    err = new ApiError(message, 401);
  }

  // 发送错误响应
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 优雅关闭处理
process.on('unhandledRejection', (err: Error) => {
  logger.error('未处理的Promise拒绝:', err);
  process.exit(1);
});

process.on('uncaughtException', (err: Error) => {
  logger.error('未捕获的异常:', err);
  process.exit(1);
});

export default app;
