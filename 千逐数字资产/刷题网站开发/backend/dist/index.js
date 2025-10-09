"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
const app_1 = __importDefault(require("./app"));
const database_1 = require("./config/database");
const logger_1 = require("./utils/logger");
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';
async function startServer() {
    try {
        await (0, database_1.connectDatabase)();
        const server = app_1.default.listen(PORT, () => {
            logger_1.logger.info(`🚀 服务器启动成功`, {
                port: PORT,
                host: HOST,
                environment: process.env.NODE_ENV || 'development',
                url: `http://${HOST}:${PORT}`
            });
            logger_1.logger.info('📋 可用的API端点:');
            logger_1.logger.info('  🔐 认证相关:');
            logger_1.logger.info(`    POST   http://${HOST}:${PORT}/api/auth/register`);
            logger_1.logger.info(`    POST   http://${HOST}:${PORT}/api/auth/login`);
            logger_1.logger.info(`    POST   http://${HOST}:${PORT}/api/auth/logout`);
            logger_1.logger.info(`    POST   http://${HOST}:${PORT}/api/auth/forgot-password`);
            logger_1.logger.info(`    GET    http://${HOST}:${PORT}/api/auth/me`);
            logger_1.logger.info('  📚 题库管理:');
            logger_1.logger.info(`    POST   http://${HOST}:${PORT}/api/quizzes`);
            logger_1.logger.info(`    GET    http://${HOST}:${PORT}/api/quizzes`);
            logger_1.logger.info(`    GET    http://${HOST}:${PORT}/api/quizzes/:id`);
            logger_1.logger.info(`    PUT    http://${HOST}:${PORT}/api/quizzes/:id`);
            logger_1.logger.info(`    DELETE http://${HOST}:${PORT}/api/quizzes/:id`);
            logger_1.logger.info('  🤖 AI解析:');
            logger_1.logger.info(`    POST   http://${HOST}:${PORT}/api/ai/validate-key`);
            logger_1.logger.info(`    POST   http://${HOST}:${PORT}/api/ai/parse-quiz`);
            logger_1.logger.info(`    GET    http://${HOST}:${PORT}/api/ai/parse-status/:taskId`);
            logger_1.logger.info(`    POST   http://${HOST}:${PORT}/api/ai/convert-quiz`);
            logger_1.logger.info(`    GET    http://${HOST}:${PORT}/api/ai/convert-status/:taskId`);
            logger_1.logger.info('  📝 练习记录:');
            logger_1.logger.info(`    POST   http://${HOST}:${PORT}/api/practice/sessions`);
            logger_1.logger.info(`    PUT    http://${HOST}:${PORT}/api/practice/sessions/:id`);
            logger_1.logger.info(`    POST   http://${HOST}:${PORT}/api/practice/sessions/:id/complete`);
            logger_1.logger.info(`    GET    http://${HOST}:${PORT}/api/practice/history`);
            logger_1.logger.info('  ❤️  健康检查:');
            logger_1.logger.info(`    GET    http://${HOST}:${PORT}/health`);
        });
        const gracefulShutdown = (signal) => {
            logger_1.logger.info(`收到 ${signal} 信号，开始优雅关闭...`);
            server.close(() => {
                logger_1.logger.info('HTTP服务器已关闭');
                process.exit(0);
            });
            setTimeout(() => {
                logger_1.logger.error('强制关闭服务器');
                process.exit(1);
            }, 10000);
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
    catch (error) {
        logger_1.logger.error('服务器启动失败:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=index.js.map