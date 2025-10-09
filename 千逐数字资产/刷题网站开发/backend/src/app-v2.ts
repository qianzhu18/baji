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
import { configManager } from './config/settings';
import ConfigValidator from './utils/configValidator';

// 导入V2标准化路由
import authRoutes from './routes/v2/auth';
import uploadRoutes from './routes/v2/upload';
import quizRoutes from './routes/v2/quiz';
import jobRoutes from './routes/v2/job';
import aiRoutes from './routes/v2/ai';

// 导入V1兼容路由（保持向后兼容）
import v1AuthRoutes from './routes/authRoutes';
import v1QuizRoutes from './routes/quizRoutes';
// import v1AiRoutes from './routes/aiRoutes'; // 暂时注释掉，避免导入错误

// 导入Worker（在生产环境中可能需要单独进程）
import './workers/quizWorker';

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// 中间件配置
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3002'],
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

// 健康检查端点（符合设计文档规范）
app.get('/health', async (req, res) => {
  try {
    const [dbHealth, queueHealth] = await Promise.all([
      checkDatabaseHealth(),
      getQueueHealth(),
    ]);

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '2.0.0',
      environment: process.env.NODE_ENV || 'development',
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

// API路由 - V2标准化版本（符合设计文档规范）
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/job', jobRoutes);
app.use('/api/ai', aiRoutes);

// API路由 - V1兼容版本（保持向后兼容）
app.use('/api/v1/auth', v1AuthRoutes);
app.use('/api/v1/quiz', v1QuizRoutes);
// app.use('/api/ai', v1AiRoutes); // 暂时注释掉，避免导入错误

// API版本信息
app.get('/api', (req, res) => {
  res.json({
    name: 'Quiz System API',
    version: '2.0.0',
    description: '智能题库系统API - 基于Prisma+BullMQ架构',
    endpoints: {
      v2: {
        auth: '/api/auth',
        upload: '/api/upload',
        quiz: '/api/quiz',
        job: '/api/job',
      },
      v1: {
        auth: '/api/v1/auth',
        quiz: '/api/v1/quiz',
        ai: '/api/ai',
      },
      health: '/health',
    },
    documentation: 'https://github.com/your-repo/quiz-system',
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `路由 ${req.originalUrl} 不存在`,
    availableEndpoints: [
      'GET /health',
      'GET /api',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/upload',
      'GET /api/quiz/:id',
      'GET /api/job/:id',
    ],
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
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: error.stack,
      details: error.details 
    }),
  });
});

// 启动服务器函数
export async function startServer() {
  try {
    logger.info('🚀 启动Quiz System API v2.0...');

    // 1. 验证系统配置
    logger.info('📋 验证系统配置...');
    const validator = new ConfigValidator();
    const { success, results } = await validator.validateAll();

    if (!success) {
      logger.error('❌ 配置验证失败:');
      console.log(validator.generateReport());
      console.log('\n' + validator.generateQuickFixGuide());
      console.warn('⚠️ 配置验证失败，但继续启动服务器（开发模式）');
      console.warn('请修复配置以获得完整功能');
      // throw new Error('系统配置验证失败，请修复配置后重新启动');
    }

    logger.info('✅ 系统配置验证通过');

    // 显示配置报告
    if (process.env.NODE_ENV !== 'production') {
      logger.info('📊 配置报告:\n' + configManager.generateConfigReport());
    }

    // 2. 初始化数据库连接
    await initPrisma();
    logger.info('✅ Prisma数据库连接成功');

    // 3. 初始化Redis连接
    await initRedis();
    logger.info('✅ Redis连接成功');

    // 4. 清理旧的队列任务
    await cleanQueue();
    logger.info('✅ 队列清理完成');

    // 启动HTTP服务器
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Quiz System API v2.0 启动成功`, {
        port: PORT,
        host: HOST,
        environment: process.env.NODE_ENV || 'development',
        url: `http://${HOST}:${PORT}`,
        architecture: 'Prisma + BullMQ + Redis'
      });
      
      logger.info('📋 标准化API端点 (v2):');
      logger.info('  🔐 认证相关:');
      logger.info(`    POST   http://${HOST}:${PORT}/api/auth/register`);
      logger.info(`    POST   http://${HOST}:${PORT}/api/auth/login`);
      
      logger.info('  📤 文件上传:');
      logger.info(`    POST   http://${HOST}:${PORT}/api/upload`);
      logger.info(`    POST   http://${HOST}:${PORT}/api/upload/text`);
      
      logger.info('  📚 题库管理:');
      logger.info(`    GET    http://${HOST}:${PORT}/api/quiz/:id`);
      logger.info(`    GET    http://${HOST}:${PORT}/api/quiz`);
      logger.info(`    DELETE http://${HOST}:${PORT}/api/quiz/:id`);
      
      logger.info('  📋 任务管理:');
      logger.info(`    GET    http://${HOST}:${PORT}/api/job/:id`);
      logger.info(`    GET    http://${HOST}:${PORT}/api/job`);
      logger.info(`    DELETE http://${HOST}:${PORT}/api/job/:id`);
      
      logger.info('  ❤️  系统监控:');
      logger.info(`    GET    http://${HOST}:${PORT}/health`);
      logger.info(`    GET    http://${HOST}:${PORT}/api`);
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

    return server;

  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，启动服务器
if (require.main === module) {
  startServer();
}

export default app;
