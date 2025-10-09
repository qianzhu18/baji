"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const validation_1 = require("../../middleware/validation");
const auth_1 = require("../../middleware/auth");
const prisma_1 = require("../../config/prisma");
const queue_1 = require("../../config/queue");
const logger_1 = require("../../utils/logger");
const router = (0, express_1.Router)();
const jobIdValidation = [
    (0, express_validator_1.param)('id')
        .isUUID()
        .withMessage('任务ID格式无效'),
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
        .isIn(['queued', 'active', 'completed', 'failed'])
        .withMessage('状态值无效'),
];
router.get('/:id', auth_1.protect, jobIdValidation, validation_1.validateRequest, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const job = await prisma_1.prisma.job.findFirst({
            where: {
                id,
                userId,
            },
            include: {
                quiz: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        html: true,
                        errorMsg: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
        });
        if (!job) {
            return res.status(404).json({
                success: false,
                message: '任务不存在或无权访问',
            });
        }
        let queueJobStatus = null;
        try {
            const queueJob = await queue_1.quizQueue.getJob(id);
            if (queueJob) {
                queueJobStatus = {
                    progress: queueJob.progress,
                    processedOn: queueJob.processedOn,
                    finishedOn: queueJob.finishedOn,
                    failedReason: queueJob.failedReason,
                    attemptsMade: queueJob.attemptsMade,
                    opts: {
                        attempts: queueJob.opts.attempts,
                        delay: queueJob.opts.delay,
                    },
                };
            }
        }
        catch (queueError) {
            logger_1.logger.warn('获取队列任务状态失败:', queueError);
        }
        const responseData = {
            id: job.id,
            type: job.type,
            status: job.status,
            progress: job.progress,
            data: job.data ? JSON.parse(job.data) : null,
            result: job.result ? JSON.parse(job.result) : null,
            error: job.error,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            quiz: job.quiz,
            queueStatus: queueJobStatus,
        };
        logger_1.logger.debug('任务状态查询成功', {
            jobId: id,
            userId,
            status: job.status
        });
        return res.json({
            success: true,
            data: responseData,
        });
    }
    catch (error) {
        logger_1.logger.error('获取任务状态失败:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : '获取任务状态失败',
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
        const [jobs, total] = await Promise.all([
            prisma_1.prisma.job.findMany({
                where,
                include: {
                    quiz: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            createdAt: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.job.count({ where }),
        ]);
        const formattedJobs = jobs.map(job => ({
            id: job.id,
            type: job.type,
            status: job.status,
            progress: job.progress,
            error: job.error,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            quiz: job.quiz,
        }));
        return res.json({
            success: true,
            data: {
                jobs: formattedJobs,
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
        logger_1.logger.error('获取任务列表失败:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : '获取任务列表失败',
        });
    }
});
router.delete('/:id', auth_1.protect, jobIdValidation, validation_1.validateRequest, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const job = await prisma_1.prisma.job.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!job) {
            return res.status(404).json({
                success: false,
                message: '任务不存在或无权访问',
            });
        }
        try {
            const queueJob = await queue_1.quizQueue.getJob(id);
            if (queueJob && !queueJob.finishedOn) {
                await queueJob.remove();
                logger_1.logger.info('任务已从队列中移除', { jobId: id });
            }
        }
        catch (queueError) {
            logger_1.logger.warn('从队列移除任务失败:', queueError);
        }
        await prisma_1.prisma.job.update({
            where: { id },
            data: {
                status: 'failed',
                error: '用户取消',
                updatedAt: new Date(),
            },
        });
        logger_1.logger.info('任务已取消', { jobId: id, userId });
        return res.json({
            success: true,
            message: '任务已取消',
        });
    }
    catch (error) {
        logger_1.logger.error('取消任务失败:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : '取消任务失败',
        });
    }
});
exports.default = router;
//# sourceMappingURL=job.js.map