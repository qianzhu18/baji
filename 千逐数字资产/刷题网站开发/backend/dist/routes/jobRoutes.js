"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../config/prisma");
const queue_1 = require("../config/queue");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const jobIdValidation = [
    (0, express_validator_1.param)('id')
        .isUUID()
        .withMessage('任务ID格式无效'),
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
                };
            }
        }
        catch (queueError) {
            logger_1.logger.warn('获取队列任务状态失败:', queueError);
        }
        const responseData = {
            jobId: job.id,
            type: job.type,
            status: job.status,
            progress: job.progress,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            quiz: job.quiz,
            queueStatus: queueJobStatus,
        };
        if (job.error) {
            responseData.error = job.error;
        }
        logger_1.logger.debug('任务状态查询成功', { jobId: id, userId, status: job.status });
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
router.get('/user/list', auth_1.protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const [jobs, total] = await Promise.all([
            prisma_1.prisma.job.findMany({
                where: { userId },
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
            prisma_1.prisma.job.count({
                where: { userId },
            }),
        ]);
        res.json({
            success: true,
            data: {
                jobs,
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
        res.status(500).json({
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
//# sourceMappingURL=jobRoutes.js.map