import { Queue, Worker, QueueOptions, WorkerOptions } from 'bullmq';
import { createClient } from 'redis';
import { logger } from '../utils/logger';

// Redis连接配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
};

// 创建Redis连接
export const redisClient = createClient({
  url: process.env.REDIS_URL || `redis://${redisConfig.host}:${redisConfig.port}`,
});

// Redis连接事件处理
redisClient.on('connect', () => {
  logger.info('Redis客户端已连接');
});

redisClient.on('error', (err) => {
  logger.error('Redis连接错误:', err);
});

// 初始化Redis连接
export const initRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    logger.info('Redis连接初始化成功');
  } catch (error) {
    logger.error('Redis连接初始化失败:', error);
    throw error;
  }
};

// 队列配置选项
const queueOptions: QueueOptions = {
  connection: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100, // 保留最近100个完成的任务
    removeOnFail: 50,      // 保留最近50个失败的任务
    attempts: parseInt(process.env.QUEUE_ATTEMPTS || '3'),
    backoff: {
      type: 'exponential',
      delay: parseInt(process.env.QUEUE_DELAY || '1000'),
    },
  },
};

// Worker配置选项
const workerOptions: WorkerOptions = {
  connection: redisConfig,
  concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5'),
};

// 题库解析队列
export const quizQueue = new Queue('quiz-processing', queueOptions);

// 队列事件监听
quizQueue.on('waiting', (job: any) => {
  logger.info(`任务 ${job.id} 正在等待处理`);
});

// 注释掉有问题的事件监听器，稍后修复
// quizQueue.on('active', (job: any) => {
//   logger.info(`任务 ${job.id} 开始处理`);
// });

// quizQueue.on('completed', (job: any) => {
//   logger.info(`任务 ${job.id} 处理完成`);
// });

// quizQueue.on('failed', (job: any, err: any) => {
//   logger.error(`任务 ${job?.id} 处理失败:`, err);
// });

// 导出Worker配置
export { workerOptions };

// 队列健康检查
export const getQueueHealth = async () => {
  try {
    const waiting = await quizQueue.getWaiting();
    const active = await quizQueue.getActive();
    const completed = await quizQueue.getCompleted();
    const failed = await quizQueue.getFailed();

    return {
      status: 'healthy',
      counts: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      },
    };
  } catch (error) {
    logger.error('队列健康检查失败:', error);
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// 清理队列
export const cleanQueue = async () => {
  try {
    await quizQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'); // 清理24小时前的完成任务
    await quizQueue.clean(24 * 60 * 60 * 1000, 50, 'failed');     // 清理24小时前的失败任务
    logger.info('队列清理完成');
  } catch (error) {
    logger.error('队列清理失败:', error);
  }
};
