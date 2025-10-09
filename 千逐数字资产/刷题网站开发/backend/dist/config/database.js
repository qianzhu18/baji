"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDatabase = exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../utils/logger");
const getDatabaseConfig = () => {
    const uri = process.env.NODE_ENV === 'test'
        ? process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/quiz-system-test'
        : process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz-system';
    const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
    };
    return { uri, options };
};
const connectDatabase = async () => {
    try {
        const { uri, options } = getDatabaseConfig();
        await mongoose_1.default.connect(uri, options);
        logger_1.logger.info('数据库连接成功', {
            database: mongoose_1.default.connection.name,
            host: mongoose_1.default.connection.host,
            port: mongoose_1.default.connection.port
        });
        mongoose_1.default.connection.on('error', (error) => {
            logger_1.logger.error('数据库连接错误:', error);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            logger_1.logger.warn('数据库连接断开');
        });
        mongoose_1.default.connection.on('reconnected', () => {
            logger_1.logger.info('数据库重新连接成功');
        });
    }
    catch (error) {
        logger_1.logger.error('数据库连接失败:', error);
        logger_1.logger.warn('继续启动服务器，但数据库功能将不可用');
    }
};
exports.connectDatabase = connectDatabase;
const disconnectDatabase = async () => {
    try {
        await mongoose_1.default.disconnect();
        logger_1.logger.info('数据库连接已关闭');
    }
    catch (error) {
        logger_1.logger.error('关闭数据库连接时出错:', error);
    }
};
exports.disconnectDatabase = disconnectDatabase;
process.on('SIGINT', async () => {
    await (0, exports.disconnectDatabase)();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await (0, exports.disconnectDatabase)();
    process.exit(0);
});
//# sourceMappingURL=database.js.map