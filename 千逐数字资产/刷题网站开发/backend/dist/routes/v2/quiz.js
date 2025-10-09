"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const validation_1 = require("../../middleware/validation");
const auth_1 = require("../../middleware/auth");
const prisma_1 = require("../../config/prisma");
const logger_1 = require("../../utils/logger");
const router = (0, express_1.Router)();
const quizIdValidation = [
    (0, express_validator_1.param)('id')
        .isUUID()
        .withMessage('题库ID格式无效'),
];
const listValidation = [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('页码必须是正整数'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('每页数量必须在1-100之间'),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['pending', 'processing', 'completed', 'failed'])
        .withMessage('状态值无效'),
];
router.get('/:id', auth_1.protect, quizIdValidation, validation_1.validateRequest, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const quiz = await prisma_1.prisma.quiz.findFirst({
            where: {
                id,
                userId,
            },
            include: {
                jobs: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        id: true,
                        type: true,
                        status: true,
                        progress: true,
                        error: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
        });
        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: '题库不存在或无权访问',
            });
        }
        const responseData = {
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            orderMode: quiz.orderMode,
            status: quiz.status,
            html: quiz.html,
            errorMsg: quiz.errorMsg,
            createdAt: quiz.createdAt,
            updatedAt: quiz.updatedAt,
            latestJob: quiz.jobs[0] || null,
        };
        logger_1.logger.debug('题库查询成功', {
            quizId: id,
            userId,
            status: quiz.status
        });
        return res.json({
            success: true,
            data: responseData,
        });
    }
    catch (error) {
        logger_1.logger.error('获取题库详情失败:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : '获取题库详情失败',
        });
    }
});
router.get('/', auth_1.protect, listValidation, validation_1.validateRequest, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const skip = (page - 1) * limit;
        const where = { userId };
        if (status) {
            where.status = status;
        }
        const [quizzes, total] = await Promise.all([
            prisma_1.prisma.quiz.findMany({
                where,
                include: {
                    jobs: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: {
                            id: true,
                            status: true,
                            progress: true,
                            createdAt: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.quiz.count({ where }),
        ]);
        const formattedQuizzes = quizzes.map(quiz => ({
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            orderMode: quiz.orderMode,
            status: quiz.status,
            createdAt: quiz.createdAt,
            updatedAt: quiz.updatedAt,
            latestJob: quiz.jobs[0] || null,
            hasHtml: !!quiz.html,
        }));
        return res.json({
            success: true,
            data: {
                quizzes: formattedQuizzes,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('获取题库列表失败:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : '获取题库列表失败',
        });
    }
});
router.delete('/:id', auth_1.protect, quizIdValidation, validation_1.validateRequest, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const quiz = await prisma_1.prisma.quiz.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: '题库不存在或无权访问',
            });
        }
        await prisma_1.prisma.quiz.delete({
            where: { id },
        });
        if (quiz.filePath) {
            try {
                const fs = require('fs/promises');
                await fs.unlink(quiz.filePath);
                logger_1.logger.info('题库文件已删除', { filePath: quiz.filePath });
            }
            catch (fileError) {
                logger_1.logger.warn('删除题库文件失败:', fileError);
            }
        }
        logger_1.logger.info('题库删除成功', { quizId: id, userId });
        return res.json({
            success: true,
            message: '题库删除成功',
        });
    }
    catch (error) {
        logger_1.logger.error('删除题库失败:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : '删除题库失败',
        });
    }
});
exports.default = router;
//# sourceMappingURL=quiz.js.map