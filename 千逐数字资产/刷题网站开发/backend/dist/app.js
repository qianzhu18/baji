"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = require("express-rate-limit");
const logger_1 = require("./utils/logger");
const ApiError_1 = require("./utils/ApiError");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const quizRoutes_1 = __importDefault(require("./routes/quizRoutes"));
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
const practiceRoutes_1 = __importDefault(require("./routes/practiceRoutes"));
const app = (0, express_1.default)();
app.set('trust proxy', 1);
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.CORS_ORIGIN || 'http://localhost:3000',
            'http://localhost:3000',
            'http://127.0.0.1:3000'
        ];
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('不允许的CORS来源'), false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use((0, cors_1.default)(corsOptions));
if (process.env.NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use((0, morgan_1.default)('combined', {
        stream: {
            write: (message) => {
                logger_1.logger.info(message.trim());
            }
        }
    }));
}
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
const limiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: {
        success: false,
        message: '请求过于频繁，请稍后再试'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: '服务运行正常',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
app.use('/api/auth', authRoutes_1.default);
app.use('/api/quizzes', quizRoutes_1.default);
app.use('/api/ai', aiRoutes_1.default);
app.use('/api/practice', practiceRoutes_1.default);
app.all('*', (req, res, next) => {
    next(new ApiError_1.ApiError(`路由 ${req.originalUrl} 不存在`, 404));
});
app.use((error, req, res, next) => {
    let err = { ...error };
    err.message = error.message;
    logger_1.logger.error('API错误:', {
        message: err.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    if (error.name === 'CastError') {
        const message = '资源不存在';
        err = new ApiError_1.ApiError(message, 404);
    }
    if (error.code === 11000) {
        const message = '数据已存在';
        err = new ApiError_1.ApiError(message, 400);
    }
    if (error.name === 'ValidationError') {
        const message = Object.values(error.errors).map((val) => val.message).join(', ');
        err = new ApiError_1.ApiError(message, 400);
    }
    if (error.name === 'JsonWebTokenError') {
        const message = '无效的令牌';
        err = new ApiError_1.ApiError(message, 401);
    }
    if (error.name === 'TokenExpiredError') {
        const message = '令牌已过期';
        err = new ApiError_1.ApiError(message, 401);
    }
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || '服务器内部错误',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});
process.on('unhandledRejection', (err) => {
    logger_1.logger.error('未处理的Promise拒绝:', err);
    process.exit(1);
});
process.on('uncaughtException', (err) => {
    logger_1.logger.error('未捕获的异常:', err);
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=app.js.map