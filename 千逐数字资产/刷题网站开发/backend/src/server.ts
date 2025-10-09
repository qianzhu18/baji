import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

// 导入配置
import { initPrisma, disconnectPrisma, checkDatabaseHealth } from './config/prisma';
import { initRedis, getQueueHealth, cleanQueue } from './config/queue';
import { logger } from './utils/logger';

// 导入路由
import authRoutes from './routes/authRoutes';
import uploadRoutes from './routes/uploadRoutes';
import jobRoutes from './routes/jobRoutes';
import quizRoutes from './routes/quizRoutes';

// 导入Worker（在生产环境中可能需要单独进程）
import './workers/quizWorker';

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// 中间件配置
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 静态文件服务（用于下载生成的HTML）
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 健康检查端点
app.get('/health', async (req, res) => {
  try {
    const [dbHealth, queueHealth] = await Promise.all([
      checkDatabaseHealth(),
      getQueueHealth(),
    ]);

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth ? 'healthy' : 'unhealthy',
        queue: queueHealth.status,
      },
      queue: queueHealth,
    };

    const statusCode = dbHealth && queueHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('健康检查失败:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/job', jobRoutes);
app.use('/api/quiz', quizRoutes);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `路由 ${req.originalUrl} 不存在`,
  });
});

// 全局错误处理
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('未捕获的错误:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
});

async function startServer() {
  try {
    // 初始化数据库连接
    await initPrisma();
    logger.info('✅ Prisma数据库连接成功');

    // 初始化Redis连接
    await initRedis();
    logger.info('✅ Redis连接成功');

    // 清理旧的队列任务
    await cleanQueue();
    logger.info('✅ 队列清理完成');

    // 启动HTTP服务器
    const server = app.listen(PORT, () => {
      logger.info(`🚀 新版服务器启动成功`, {
        port: PORT,
        host: HOST,
        environment: process.env.NODE_ENV || 'development',
        url: `http://${HOST}:${PORT}`
      });
      
      logger.info('📋 新版API端点:');
      logger.info('  🔐 认证相关:');
      logger.info(`    POST   http://${HOST}:${PORT}/api/auth/register`);
      logger.info(`    POST   http://${HOST}:${PORT}/api/auth/login`);
      
      logger.info('  📤 文件上传:');
      logger.info(`    POST   http://${HOST}:${PORT}/api/upload`);
      logger.info(`    POST   http://${HOST}:${PORT}/api/upload/text`);
      
      logger.info('  📋 任务管理:');
      logger.info(`    GET    http://${HOST}:${PORT}/api/job/:id`);
      logger.info(`    GET    http://${HOST}:${PORT}/api/job/user/list`);
      logger.info(`    DELETE http://${HOST}:${PORT}/api/job/:id`);
      
      logger.info('  📚 题库管理:');
      logger.info(`    GET    http://${HOST}:${PORT}/api/quiz/:id`);
      
      logger.info('  ❤️  健康检查:');
      logger.info(`    GET    http://${HOST}:${PORT}/health`);
    });

    // 优雅关闭
    const gracefulShutdown = async (signal: string) => {
      logger.info(`收到 ${signal} 信号，开始优雅关闭...`);
      
      server.close(async () => {
        logger.info('HTTP服务器已关闭');
        
        // 关闭数据库连接
        await disconnectPrisma();
        logger.info('数据库连接已关闭');
        
        process.exit(0);
      });

      // 强制关闭超时
      setTimeout(() => {
        logger.error('强制关闭服务器');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();
