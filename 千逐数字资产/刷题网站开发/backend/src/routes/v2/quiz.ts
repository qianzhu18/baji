import { Router, Request, Response } from 'express';
import { param, query } from 'express-validator';
import { validateRequest } from '../../middleware/validation';
import { protectV2 } from '../../middleware/authV2';
import { prisma } from '../../config/prisma';
import { logger } from '../../utils/logger';

const router = Router();

// 验证规则
const quizIdValidation = [
  param('id')
    .isUUID()
    .withMessage('题库ID格式无效'),
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
    .isIn(['pending', 'processing', 'completed', 'failed'])
    .withMessage('状态值无效'),
];

// GET /api/quiz/:id - 获取题库详情（符合设计文档规范）
router.get(
  '/:id',
  protectV2,
  quizIdValidation,
  validateRequest,
  async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // 查询题库信息
      const quiz = await prisma.quiz.findFirst({
        where: {
          id,
          userId, // 确保用户只能访问自己的题库
        },
        include: {
          jobs: {
            orderBy: { createdAt: 'desc' },
            take: 1, // 只获取最新的任务
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

      // 构建响应数据
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

      logger.debug('题库查询成功', { 
        quizId: id, 
        userId, 
        status: quiz.status 
      });

      return res.json({
        success: true,
        data: responseData,
      });

    } catch (error) {
      logger.error('获取题库详情失败:', error);

      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取题库详情失败',
      });
    }
  }
);

// GET /api/quiz - 获取用户题库列表
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

      // 获取题库列表和总数
      const [quizzes, total] = await Promise.all([
        prisma.quiz.findMany({
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
        prisma.quiz.count({ where }),
      ]);

      // 格式化响应数据
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

    } catch (error) {
      logger.error('获取题库列表失败:', error);

      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取题库列表失败',
      });
    }
  }
);

// DELETE /api/quiz/:id - 删除题库
router.delete(
  '/:id',
  protectV2,
  quizIdValidation,
  validateRequest,
  async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // 检查题库是否存在且属于当前用户
      const quiz = await prisma.quiz.findFirst({
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

      // 删除题库（级联删除相关的jobs）
      await prisma.quiz.delete({
        where: { id },
      });

      // 如果有文件路径，尝试删除文件
      if (quiz.filePath) {
        try {
          const fs = require('fs/promises');
          await fs.unlink(quiz.filePath);
          logger.info('题库文件已删除', { filePath: quiz.filePath });
        } catch (fileError) {
          logger.warn('删除题库文件失败:', fileError);
        }
      }

      logger.info('题库删除成功', { quizId: id, userId });

      return res.json({
        success: true,
        message: '题库删除成功',
      });

    } catch (error) {
      logger.error('删除题库失败:', error);

      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '删除题库失败',
      });
    }
  }
);

export default router;
