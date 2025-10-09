import { PrismaClient } from '../generated/prisma';
import { logger } from '../utils/logger';

// 创建Prisma客户端实例
export const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// 日志事件处理
prisma.$on('query', (e) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Prisma Query:', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  }
});

prisma.$on('error', (e) => {
  logger.error('Prisma Error:', e);
});

prisma.$on('info', (e) => {
  logger.info('Prisma Info:', e.message);
});

prisma.$on('warn', (e) => {
  logger.warn('Prisma Warning:', e.message);
});

// 数据库连接初始化
export const initPrisma = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('Prisma数据库连接成功');
  } catch (error) {
    logger.error('Prisma数据库连接失败:', error);
    throw error;
  }
};

// 数据库连接断开
export const disconnectPrisma = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('Prisma数据库连接已断开');
  } catch (error) {
    logger.error('Prisma数据库断开连接失败:', error);
  }
};

// 数据库健康检查
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('数据库健康检查失败:', error);
    return false;
  }
};

// 导出类型
export type { User, Quiz, Job } from '../generated/prisma';
