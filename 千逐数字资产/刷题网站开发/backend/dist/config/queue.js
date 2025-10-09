"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanQueue = exports.getQueueHealth = exports.workerOptions = exports.quizQueue = exports.initRedis = exports.redisClient = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("redis");
const logger_1 = require("../utils/logger");
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
};
exports.redisClient = (0, redis_1.createClient)({
    url: process.env.REDIS_URL || `redis://${redisConfig.host}:${redisConfig.port}`,
});
exports.redisClient.on('connect', () => {
    logger_1.logger.info('Redis客户端已连接');
});
exports.redisClient.on('error', (err) => {
    logger_1.logger.error('Redis连接错误:', err);
});
const initRedis = async () => {
    try {
        await exports.redisClient.connect();
        logger_1.logger.info('Redis连接初始化成功');
    }
    catch (error) {
        logger_1.logger.error('Redis连接初始化失败:', error);
        throw error;
    }
};
exports.initRedis = initRedis;
const queueOptions = {
    connection: redisConfig,
    defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: parseInt(process.env.QUEUE_ATTEMPTS || '3'),
        backoff: {
            type: 'exponential',
            delay: parseInt(process.env.QUEUE_DELAY || '1000'),
        },
    },
};
const workerOptions = {
    connection: redisConfig,
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5'),
};
exports.workerOptions = workerOptions;
exports.quizQueue = new bullmq_1.Queue('quiz-processing', queueOptions);
exports.quizQueue.on('waiting', (job) => {
    logger_1.logger.info(`任务 ${job.id} 正在等待处理`);
});
const getQueueHealth = async () => {
    try {
        const waiting = await exports.quizQueue.getWaiting();
        const active = await exports.quizQueue.getActive();
        const completed = await exports.quizQueue.getCompleted();
        const failed = await exports.quizQueue.getFailed();
        return {
            status: 'healthy',
            counts: {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
            },
        };
    }
    catch (error) {
        logger_1.logger.error('队列健康检查失败:', error);
        return {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
};
exports.getQueueHealth = getQueueHealth;
const cleanQueue = async () => {
    try {
        await exports.quizQueue.clean(24 * 60 * 60 * 1000, 100, 'completed');
        await exports.quizQueue.clean(24 * 60 * 60 * 1000, 50, 'failed');
        logger_1.logger.info('队列清理完成');
    }
    catch (error) {
        logger_1.logger.error('队列清理失败:', error);
    }
};
exports.cleanQueue = cleanQueue;
//# sourceMappingURL=queue.js.map