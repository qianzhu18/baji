/**
 * v1 API Routes (DEPRECATED)
 * 
 * ⚠️ 这些路由已被弃用，将在 2025-12-31 移除
 * 请迁移到 v2 API
 */
import { Router, Request, Response } from 'express';
import { deprecateV1Api } from '../middleware/deprecation';
import { param } from 'express-validator';
import { deprecateV1Api } from '../middleware/deprecation';
import { validateRequest } from '../middleware/validation';
import { protect } from '../middleware/auth';
import { prisma } from '../config/prisma';
import { quizQueue } from '../config/queue';
import { logger } from '../utils/logger';

const router = Router();

// 验证规则
const jobIdValidation = [
  param('id')
    .isUUID()
    .withMessage('任务ID格式无效'),
];

// GET /api/job/:id - 获取任务状态
router.get(
  '/:id',
  protect,
  jobIdValidation,
  validateRequest,
  async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // 从数据库获取任务信息
      const job = await prisma.job.findFirst({
        where: {
          id,
          userId, // 确保用户只能查看自己的任务
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

      // 尝试从队列获取更详细的状态信息
      let queueJobStatus = null;
      try {
        const queueJob = await quizQueue.getJob(id);
        if (queueJob) {
          queueJobStatus = {
            progress: queueJob.progress,
            processedOn: queueJob.processedOn,
            finishedOn: queueJob.finishedOn,
            failedReason: queueJob.failedReason,
            attemptsMade: queueJob.attemptsMade,
          };
        }
      } catch (queueError) {
        logger.warn('获取队列任务状态失败:', queueError);
      }

      // 构建响应数据
      const responseData: any = {
        jobId: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        quiz: job.quiz,
        queueStatus: queueJobStatus,
      };

      // 如果有错误信息，添加到响应中
      if (job.error) {
        responseData.error = job.error;
      }

      logger.debug('任务状态查询成功', { jobId: id, userId, status: job.status });

      return res.json({
        success: true,
        data: responseData,
      });

    } catch (error) {
      logger.error('获取任务状态失败:', error);

      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取任务状态失败',
      });
    }
  }
);

// GET /api/job/user/list - 获取用户的所有任务
router.get(
  '/user/list',
  protect,
  async (req: any, res: Response) => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      // 获取任务列表
      const [jobs, total] = await Promise.all([
        prisma.job.findMany({
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
        prisma.job.count({
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

    } catch (error) {
      logger.error('获取任务列表失败:', error);

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取任务列表失败',
      });
    }
  }
);

// DELETE /api/job/:id - 取消任务
router.delete(
  '/:id',
  protect,
  jobIdValidation,
  validateRequest,
  async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // 检查任务是否存在且属于当前用户
      const job = await prisma.job.findFirst({
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

      // 如果任务还在队列中，尝试从队列中移除
      try {
        const queueJob = await quizQueue.getJob(id);
        if (queueJob && !queueJob.finishedOn) {
          await queueJob.remove();
          logger.info('任务已从队列中移除', { jobId: id });
        }
      } catch (queueError) {
        logger.warn('从队列移除任务失败:', queueError);
      }

      // 更新数据库中的任务状态
      await prisma.job.update({
        where: { id },
        data: {
          status: 'failed',
          error: '用户取消',
          updatedAt: new Date(),
        },
      });

      logger.info('任务已取消', { jobId: id, userId });

      return res.json({
        success: true,
        message: '任务已取消',
      });

    } catch (error) {
      logger.error('取消任务失败:', error);

      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '取消任务失败',
      });
    }
  }
);

export default router;
