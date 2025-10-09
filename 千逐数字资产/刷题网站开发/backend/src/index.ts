import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

import app from './app';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

async function startServer() {
  try {
    // 连接数据库
    await connectDatabase();
    
    // 启动服务器
    const server = app.listen(PORT, () => {
      logger.info(`🚀 服务器启动成功`, {
        port: PORT,
        host: HOST,
        environment: process.env.NODE_ENV || 'development',
        url: `http://${HOST}:${PORT}`
      });
      
      logger.info('📋 可用的API端点:');
      logger.info('  🔐 认证相关:');
      logger.info(`    POST   http://${HOST}:${PORT}/api/auth/register`);
      logger.info(`    POST   http://${HOST}:${PORT}/api/auth/login`);
      logger.info(`    POST   http://${HOST}:${PORT}/api/auth/logout`);
      logger.info(`    POST   http://${HOST}:${PORT}/api/auth/forgot-password`);
      logger.info(`    GET    http://${HOST}:${PORT}/api/auth/me`);
      
      logger.info('  📚 题库管理:');
      logger.info(`    POST   http://${HOST}:${PORT}/api/quizzes`);
      logger.info(`    GET    http://${HOST}:${PORT}/api/quizzes`);
      logger.info(`    GET    http://${HOST}:${PORT}/api/quizzes/:id`);
      logger.info(`    PUT    http://${HOST}:${PORT}/api/quizzes/:id`);
      logger.info(`    DELETE http://${HOST}:${PORT}/api/quizzes/:id`);
      
      logger.info('  🤖 AI解析:');
      logger.info(`    POST   http://${HOST}:${PORT}/api/ai/validate-key`);
      logger.info(`    POST   http://${HOST}:${PORT}/api/ai/parse-quiz`);
      logger.info(`    GET    http://${HOST}:${PORT}/api/ai/parse-status/:taskId`);
      logger.info(`    POST   http://${HOST}:${PORT}/api/ai/convert-quiz`);
      logger.info(`    GET    http://${HOST}:${PORT}/api/ai/convert-status/:taskId`);
      
      logger.info('  📝 练习记录:');
      logger.info(`    POST   http://${HOST}:${PORT}/api/practice/sessions`);
      logger.info(`    PUT    http://${HOST}:${PORT}/api/practice/sessions/:id`);
      logger.info(`    POST   http://${HOST}:${PORT}/api/practice/sessions/:id/complete`);
      logger.info(`    GET    http://${HOST}:${PORT}/api/practice/history`);
      
      logger.info('  ❤️  健康检查:');
      logger.info(`    GET    http://${HOST}:${PORT}/health`);
    });

    // 优雅关闭
    const gracefulShutdown = (signal: string) => {
      logger.info(`收到 ${signal} 信号，开始优雅关闭...`);
      
      server.close(() => {
        logger.info('HTTP服务器已关闭');
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
