import { Router, Request, Response } from 'express';
import { param, query } from 'express-validator';
import { validateRequest } from '../../middleware/validation';
import { protectV2 } from '../../middleware/authV2';
import { prisma } from '../../config/prisma';
import { quizQueue } from '../../config/queue';
import { logger } from '../../utils/logger';

const router = Router();

// 验证规则
const jobIdValidation = [
  param('id')
    .isUUID()
    .withMessage('任务ID格式无效'),
];

const listValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间'),
  query('status')
    .optional()
    .isIn(['queued', 'active', 'completed', 'failed'])
    .withMessage('状态值无效'),
];

// GET /api/job/:id - 获取任务状态（符合设计文档规范）
router.get(
  '/:id',
  protectV2,
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
            opts: {
              attempts: queueJob.opts.attempts,
              delay: queueJob.opts.delay,
            },
          };
        }
      } catch (queueError) {
        logger.warn('获取队列任务状态失败:', queueError);
      }

      // 构建响应数据（符合设计文档格式）
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

      logger.debug('任务状态查询成功', { 
        jobId: id, 
        userId, 
        status: job.status 
      });

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

// GET /api/job - 获取用户任务列表
router.get(
  '/',
  protectV2,
  listValidation,
  validateRequest,
  async (req: any, res: Response) => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const skip = (page - 1) * limit;

      // 构建查询条件
      const where: any = { userId };
      if (status) {
        where.status = status;
      }

      // 获取任务列表和总数
      const [jobs, total] = await Promise.all([
        prisma.job.findMany({
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
        prisma.job.count({ where }),
      ]);

      // 格式化响应数据
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

    } catch (error) {
      logger.error('获取任务列表失败:', error);

      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取任务列表失败',
      });
    }
  }
);

// DELETE /api/job/:id - 取消任务
router.delete(
  '/:id',
  protectV2,
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
