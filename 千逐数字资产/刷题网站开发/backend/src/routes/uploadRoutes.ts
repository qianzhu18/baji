/**
 * v1 API Routes (DEPRECATED)
 * 
 * ⚠️ 这些路由已被弃用，将在 2025-12-31 移除
 * 请迁移到 v2 API
 */
import { Router, Request, Response } from 'express';
import { deprecateV1Api } from '../middleware/deprecation';
import multer from 'multer';
import { body, param } from 'express-validator';
import { deprecateV1Api } from '../middleware/deprecation';
import { validateRequest } from '../middleware/validation';
import { protect } from '../middleware/auth';
import { quizQueue } from '../config/queue';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.doc', '.docx', '.pdf', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${ext}`));
    }
  },
});

// 验证规则
const uploadValidation = [
  body('order')
    .isIn(['顺序', '随机'])
    .withMessage('出题顺序必须是"顺序"或"随机"'),
  body('title')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('标题长度必须在1-100字符之间'),
];

// POST /api/upload - 上传文件并创建题库
router.post(
  '/',
  protect,
  upload.single('file'),
  uploadValidation,
  validateRequest,
  async (req: any, res: Response) => {
    try {
      const { order, title } = req.body;
      const file = req.file;
      const userId = req.user!.id;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: '请选择要上传的文件',
        });
      }

      logger.info('开始处理文件上传', {
        userId,
        filename: file.originalname,
        size: file.size,
        order,
      });

      // 创建题库记录
      const quiz = await prisma.quiz.create({
        data: {
          id: uuidv4(),
          title: title || file.originalname,
          orderMode: order,
          status: 'pending',
          filePath: file.path,
          userId,
        },
      });

      // 创建任务记录
      const job = await prisma.job.create({
        data: {
          id: uuidv4(),
          type: 'parse',
          status: 'queued',
          progress: 0,
          data: JSON.stringify({
            quizId: quiz.id,
            filePath: file.path,
            orderMode: order,
          }),
          userId,
          quizId: quiz.id,
        },
      });

      // 添加到队列
      const queueJob = await quizQueue.add(
        'parse',
        {
          quizId: quiz.id,
          filePath: file.path,
          orderMode: order,
          userId,
        },
        {
          jobId: job.id,
        }
      );

      logger.info('文件上传任务已加入队列', {
        quizId: quiz.id,
        jobId: job.id,
        queueJobId: queueJob.id,
      });

      return res.json({
        success: true,
        data: {
          quizId: quiz.id,
          jobId: job.id,
          message: '文件上传成功，正在处理中...',
        },
      });

    } catch (error) {
      logger.error('文件上传处理失败:', error);
      
      // 清理上传的文件
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          logger.error('清理上传文件失败:', unlinkError);
        }
      }

      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '文件上传失败',
      });
    }
  }
);

// POST /api/upload/text - 处理文字粘贴
router.post(
  '/text',
  protect,
  [
    body('content')
      .isLength({ min: 10 })
      .withMessage('文字内容至少需要10个字符'),
    body('order')
      .isIn(['顺序', '随机'])
      .withMessage('出题顺序必须是"顺序"或"随机"'),
    body('title')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('标题长度必须在1-100字符之间'),
  ],
  validateRequest,
  async (req: any, res: Response) => {
    try {
      const { content, order, title } = req.body;
      const userId = req.user!.id;

      logger.info('开始处理文字粘贴', {
        userId,
        contentLength: content.length,
        order,
      });

      // 创建题库记录
      const quiz = await prisma.quiz.create({
        data: {
          id: uuidv4(),
          title: title || '粘贴文字题库',
          orderMode: order,
          status: 'pending',
          userId,
        },
      });

      // 创建任务记录
      const job = await prisma.job.create({
        data: {
          id: uuidv4(),
          type: 'parse',
          status: 'queued',
          progress: 0,
          data: JSON.stringify({
            quizId: quiz.id,
            fileContent: content,
            orderMode: order,
          }),
          userId,
          quizId: quiz.id,
        },
      });

      // 添加到队列
      const queueJob = await quizQueue.add(
        'parse',
        {
          quizId: quiz.id,
          fileContent: content,
          orderMode: order,
          userId,
        },
        {
          jobId: job.id,
        }
      );

      logger.info('文字粘贴任务已加入队列', {
        quizId: quiz.id,
        jobId: job.id,
        queueJobId: queueJob.id,
      });

      res.json({
        success: true,
        data: {
          quizId: quiz.id,
          jobId: job.id,
          message: '文字内容已提交，正在处理中...',
        },
      });

    } catch (error) {
      logger.error('文字粘贴处理失败:', error);

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '文字处理失败',
      });
    }
  }
);

export default router;
