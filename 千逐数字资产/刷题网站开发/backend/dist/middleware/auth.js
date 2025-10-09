"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOwnership = exports.requireEmailVerification = exports.optionalAuth = exports.restrictTo = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("@/models/User");
const ApiError_1 = require("@/utils/ApiError");
const logger_1 = require("@/utils/logger");
const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        else if (req.cookies.jwt) {
            token = req.cookies.jwt;
        }
        if (!token) {
            return next(new ApiError_1.ApiError('您需要登录才能访问此资源', 401));
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (process.env.NODE_ENV === 'development' && decoded.id === 'demo-user-id') {
            req.user = {
                _id: 'demo-user-id',
                id: 'demo-user-id',
                name: '演示用户',
                email: 'demo@example.com',
                role: 'user',
                avatar: null
            };
            next();
            return;
        }
        const currentUser = await User_1.User.findById(decoded.id);
        if (!currentUser) {
            return next(new ApiError_1.ApiError('令牌对应的用户不存在', 401));
        }
        if (currentUser.passwordChangedAfter && currentUser.passwordChangedAfter(decoded.iat)) {
            return next(new ApiError_1.ApiError('用户最近更改了密码，请重新登录', 401));
        }
        req.user = currentUser;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return next(new ApiError_1.ApiError('无效的令牌', 401));
        }
        else if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return next(new ApiError_1.ApiError('令牌已过期', 401));
        }
        logger_1.logger.error('认证中间件错误:', error);
        next(new ApiError_1.ApiError('认证失败', 401));
    }
};
exports.protect = protect;
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ApiError_1.ApiError('用户信息不存在', 401));
        }
        next();
    };
};
exports.restrictTo = restrictTo;
const optionalAuth = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        else if (req.cookies.jwt) {
            token = req.cookies.jwt;
        }
        if (token) {
            try {
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                const currentUser = await User_1.User.findById(decoded.id);
                if (currentUser) {
                    req.user = currentUser;
                }
            }
            catch (error) {
                logger_1.logger.debug('可选认证中令牌无效:', error);
            }
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('可选认证中间件错误:', error);
        next();
    }
};
exports.optionalAuth = optionalAuth;
const requireEmailVerification = (req, res, next) => {
    if (!req.user) {
        return next(new ApiError_1.ApiError('用户信息不存在', 401));
    }
    if (!req.user.isEmailVerified) {
        return next(new ApiError_1.ApiError('请先验证您的邮箱地址', 403));
    }
    next();
};
exports.requireEmailVerification = requireEmailVerification;
const checkOwnership = (resourceField = 'userId') => {
    return async (req, res, next) => {
        if (!req.user) {
            return next(new ApiError_1.ApiError('用户信息不存在', 401));
        }
        next();
    };
};
exports.checkOwnership = checkOwnership;
//# sourceMappingURL=auth.js.map