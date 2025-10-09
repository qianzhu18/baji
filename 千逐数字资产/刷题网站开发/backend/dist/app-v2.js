"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const prisma_1 = require("./config/prisma");
const queue_1 = require("./config/queue");
const logger_1 = require("./utils/logger");
const auth_1 = __importDefault(require("./routes/v2/auth"));
const upload_1 = __importDefault(require("./routes/v2/upload"));
const quiz_1 = __importDefault(require("./routes/v2/quiz"));
const job_1 = __importDefault(require("./routes/v2/job"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const quizRoutes_1 = __importDefault(require("./routes/quizRoutes"));
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
require("./workers/quizWorker");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use((0, compression_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3002'],
    credentials: true,
}));
app.use((0, morgan_1.default)('combined', {
    stream: { write: (message) => logger_1.logger.info(message.trim()) }
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
app.get('/health', async (req, res) => {
    try {
        const [dbHealth, queueHealth] = await Promise.all([
            (0, prisma_1.checkDatabaseHealth)(),
            (0, queue_1.getQueueHealth)(),
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
    }
    catch (error) {
        logger_1.logger.error('健康检查失败:', error);
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
app.use('/api/auth', auth_1.default);
app.use('/api/upload', upload_1.default);
app.use('/api/quiz', quiz_1.default);
app.use('/api/job', job_1.default);
app.use('/api/v1/auth', authRoutes_1.default);
app.use('/api/v1/quiz', quizRoutes_1.default);
app.use('/api/ai', aiRoutes_1.default);
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
app.use((error, req, res, next) => {
    logger_1.logger.error('未捕获的错误:', {
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
async function startServer() {
    try {
        await (0, prisma_1.initPrisma)();
        logger_1.logger.info('✅ Prisma数据库连接成功');
        await (0, queue_1.initRedis)();
        logger_1.logger.info('✅ Redis连接成功');
        await (0, queue_1.cleanQueue)();
        logger_1.logger.info('✅ 队列清理完成');
        const server = app.listen(PORT, () => {
            logger_1.logger.info(`🚀 Quiz System API v2.0 启动成功`, {
                port: PORT,
                host: HOST,
                environment: process.env.NODE_ENV || 'development',
                url: `http://${HOST}:${PORT}`,
                architecture: 'Prisma + BullMQ + Redis'
            });
            logger_1.logger.info('📋 标准化API端点 (v2):');
            logger_1.logger.info('  🔐 认证相关:');
            logger_1.logger.info(`    POST   http://${HOST}:${PORT}/api/auth/register`);
            logger_1.logger.info(`    POST   http://${HOST}:${PORT}/api/auth/login`);
            logger_1.logger.info('  📤 文件上传:');
            logger_1.logger.info(`    POST   http://${HOST}:${PORT}/api/upload`);
            logger_1.logger.info(`    POST   http://${HOST}:${PORT}/api/upload/text`);
            logger_1.logger.info('  📚 题库管理:');
            logger_1.logger.info(`    GET    http://${HOST}:${PORT}/api/quiz/:id`);
            logger_1.logger.info(`    GET    http://${HOST}:${PORT}/api/quiz`);
            logger_1.logger.info(`    DELETE http://${HOST}:${PORT}/api/quiz/:id`);
            logger_1.logger.info('  📋 任务管理:');
            logger_1.logger.info(`    GET    http://${HOST}:${PORT}/api/job/:id`);
            logger_1.logger.info(`    GET    http://${HOST}:${PORT}/api/job`);
            logger_1.logger.info(`    DELETE http://${HOST}:${PORT}/api/job/:id`);
            logger_1.logger.info('  ❤️  系统监控:');
            logger_1.logger.info(`    GET    http://${HOST}:${PORT}/health`);
            logger_1.logger.info(`    GET    http://${HOST}:${PORT}/api`);
        });
        const gracefulShutdown = async (signal) => {
            logger_1.logger.info(`收到 ${signal} 信号，开始优雅关闭...`);
            server.close(async () => {
                logger_1.logger.info('HTTP服务器已关闭');
                await (0, prisma_1.disconnectPrisma)();
                logger_1.logger.info('数据库连接已关闭');
                process.exit(0);
            });
            setTimeout(() => {
                logger_1.logger.error('强制关闭服务器');
                process.exit(1);
            }, 10000);
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        return server;
    }
    catch (error) {
        logger_1.logger.error('服务器启动失败:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    startServer();
}
exports.default = app;
//# sourceMappingURL=app-v2.js.map