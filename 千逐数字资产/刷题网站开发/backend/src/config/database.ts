import mongoose from 'mongoose';
import { logger } from '../utils/logger';

interface DatabaseConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

const getDatabaseConfig = (): DatabaseConfig => {
  const uri = process.env.NODE_ENV === 'test' 
    ? process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/quiz-system-test'
    : process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz-system';

  const options: mongoose.ConnectOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
  };

  return { uri, options };
};

export const connectDatabase = async (): Promise<void> => {
  try {
    const { uri, options } = getDatabaseConfig();

    await mongoose.connect(uri, options);

    logger.info('数据库连接成功', {
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port
    });

    // 监听连接事件
    mongoose.connection.on('error', (error) => {
      logger.error('数据库连接错误:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('数据库连接断开');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('数据库重新连接成功');
    });

  } catch (error) {
    logger.error('数据库连接失败:', error);
    logger.warn('继续启动服务器，但数据库功能将不可用');
    // 不退出进程，允许服务器启动用于演示
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('数据库连接已关闭');
  } catch (error) {
    logger.error('关闭数据库连接时出错:', error);
  }
};

// 优雅关闭处理
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});
