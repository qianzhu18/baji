import { Router, Request, Response } from 'express';
import multer from 'multer';
import { body } from 'express-validator';
import { validateRequest } from '../../middleware/validation';
import { protectV2 } from '../../middleware/authV2';
import { quizQueue } from '../../config/queue';
import { prisma } from '../../config/prisma';
import { logger } from '../../utils/logger';
import { FileParserService } from '../../services/fileParserService';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// 配置文件上传存储
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
    // 使用文件解析器的类型验证
    if (FileParserService.isSupportedFileType(file.originalname, file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型。支持的格式: .txt, .md, .doc, .docx, .xls, .xlsx, .pdf, .csv`));
    }
  },
});

// 验证规则
const uploadValidation = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('标题长度必须在1-100字符之间'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('描述不能超过500字符'),
  body('orderMode')
    .isIn(['顺序', '随机'])
    .withMessage('出题顺序必须是"顺序"或"随机"'),
];

// POST /api/upload - 上传题库文件（符合设计文档规范）
router.post(
  '/',
  protectV2,
  upload.single('file'),
  uploadValidation,
  validateRequest,
  async (req: any, res: Response) => {
    try {
      const { title, description, orderMode } = req.body;
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
        orderMode,
      });

      // 创建Quiz记录
      const quizId = uuidv4();
      const quiz = await prisma.quiz.create({
        data: {
          id: quizId,
          title: title || file.originalname,
          description: description || null,
          orderMode,
          status: 'pending',
          filePath: file.path,
          userId,
        },
      });

      // 创建Job记录
      const jobId = uuidv4();
      const job = await prisma.job.create({
        data: {
          id: jobId,
          type: 'parse',
          status: 'queued',
          progress: 0,
          data: JSON.stringify({
            quizId,
            filePath: file.path,
            orderMode,
            originalName: file.originalname,
          }),
          userId,
          quizId,
        },
      });

      // 添加到队列
      const queueJob = await quizQueue.add(
        'parse',
        {
          quizId,
          filePath: file.path,
          orderMode,
          userId,
        },
        {
          jobId,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }
      );

      logger.info('文件上传任务已加入队列', {
        quizId,
        jobId,
        queueJobId: queueJob.id,
      });

      // 返回标准响应格式（符合设计文档）
      return res.status(201).json({
        success: true,
        data: {
          quizId,
          jobId,
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

// POST /api/upload/text - 处理文字粘贴（扩展功能）
router.post(
  '/text',
  protectV2,
  [
    body('content')
      .isLength({ min: 10 })
      .withMessage('文字内容至少需要10个字符'),
    body('title')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('标题长度必须在1-100字符之间'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('描述不能超过500字符'),
    body('orderMode')
      .isIn(['顺序', '随机'])
      .withMessage('出题顺序必须是"顺序"或"随机"'),
  ],
  validateRequest,
  async (req: any, res: Response) => {
    try {
      const { content, title, description, orderMode } = req.body;
      const userId = req.user!.id;

      logger.info('开始处理文字粘贴', {
        userId,
        contentLength: content.length,
        orderMode,
      });

      // 创建Quiz记录
      const quizId = uuidv4();
      const quiz = await prisma.quiz.create({
        data: {
          id: quizId,
          title: title || '粘贴文字题库',
          description: description || null,
          orderMode,
          status: 'pending',
          userId,
        },
      });

      // 创建Job记录
      const jobId = uuidv4();
      const job = await prisma.job.create({
        data: {
          id: jobId,
          type: 'parse',
          status: 'queued',
          progress: 0,
          data: JSON.stringify({
            quizId,
            fileContent: content,
            orderMode,
          }),
          userId,
          quizId,
        },
      });

      // 添加到队列
      const queueJob = await quizQueue.add(
        'parse',
        {
          quizId,
          fileContent: content,
          orderMode,
          userId,
        },
        {
          jobId,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }
      );

      logger.info('文字粘贴任务已加入队列', {
        quizId,
        jobId,
        queueJobId: queueJob.id,
      });

      return res.status(201).json({
        success: true,
        data: {
          quizId,
          jobId,
          message: '文字内容已提交，正在处理中...',
        },
      });

    } catch (error) {
      logger.error('文字粘贴处理失败:', error);

      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '文字处理失败',
      });
    }
  }
);

export default router;
