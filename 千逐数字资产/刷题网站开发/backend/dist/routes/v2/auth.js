"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const validation_1 = require("../../middleware/validation");
const prisma_1 = require("../../config/prisma");
const logger_1 = require("../../utils/logger");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
const registerValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('请输入有效的邮箱地址')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .isLength({ min: 6 })
        .withMessage('密码至少需要6个字符'),
    (0, express_validator_1.body)('name')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('姓名长度必须在1-50字符之间'),
];
const loginValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('请输入有效的邮箱地址')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('请输入密码'),
];
router.post('/register', registerValidation, validation_1.validateRequest, async (req, res) => {
    try {
        const { email, password, name } = req.body;
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '该邮箱已被注册',
            });
        }
        const saltRounds = 12;
        const hashedPassword = await bcryptjs_1.default.hash(password, saltRounds);
        const user = await prisma_1.prisma.user.create({
            data: {
                id: (0, uuid_1.v4)(),
                email,
                password: hashedPassword,
                name: name || null,
            },
            select: {
                id: true,
                email: true,
                name: true,
                isActive: true,
                createdAt: true,
            },
        });
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is not defined');
        }
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email
        }, secret, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        });
        logger_1.logger.info('用户注册成功', {
            userId: user.id,
            email: user.email
        });
        return res.status(201).json({
            success: true,
            message: '注册成功',
            data: {
                user,
                token,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('用户注册失败:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : '注册失败',
        });
    }
});
router.post('/login', loginValidation, validation_1.validateRequest, async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: '邮箱或密码错误',
            });
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: '邮箱或密码错误',
            });
        }
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: '账户已被禁用',
            });
        }
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is not defined');
        }
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email
        }, secret, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        });
        const userResponse = {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            isActive: user.isActive,
            createdAt: user.createdAt,
        };
        logger_1.logger.info('用户登录成功', {
            userId: user.id,
            email: user.email
        });
        return res.json({
            success: true,
            message: '登录成功',
            data: {
                user: userResponse,
                token,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('用户登录失败:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : '登录失败',
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map