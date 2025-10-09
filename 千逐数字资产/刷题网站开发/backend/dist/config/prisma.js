"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDatabaseHealth = exports.disconnectPrisma = exports.initPrisma = exports.prisma = void 0;
const prisma_1 = require("../generated/prisma");
const logger_1 = require("../utils/logger");
exports.prisma = new prisma_1.PrismaClient({
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
exports.prisma.$on('query', (e) => {
    if (process.env.NODE_ENV === 'development') {
        logger_1.logger.debug('Prisma Query:', {
            query: e.query,
            params: e.params,
            duration: `${e.duration}ms`,
        });
    }
});
exports.prisma.$on('error', (e) => {
    logger_1.logger.error('Prisma Error:', e);
});
exports.prisma.$on('info', (e) => {
    logger_1.logger.info('Prisma Info:', e.message);
});
exports.prisma.$on('warn', (e) => {
    logger_1.logger.warn('Prisma Warning:', e.message);
});
const initPrisma = async () => {
    try {
        await exports.prisma.$connect();
        logger_1.logger.info('Prisma数据库连接成功');
    }
    catch (error) {
        logger_1.logger.error('Prisma数据库连接失败:', error);
        throw error;
    }
};
exports.initPrisma = initPrisma;
const disconnectPrisma = async () => {
    try {
        await exports.prisma.$disconnect();
        logger_1.logger.info('Prisma数据库连接已断开');
    }
    catch (error) {
        logger_1.logger.error('Prisma数据库断开连接失败:', error);
    }
};
exports.disconnectPrisma = disconnectPrisma;
const checkDatabaseHealth = async () => {
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch (error) {
        logger_1.logger.error('数据库健康检查失败:', error);
        return false;
    }
};
exports.checkDatabaseHealth = checkDatabaseHealth;
//# sourceMappingURL=prisma.js.map