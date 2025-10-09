"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const queue_1 = require("../config/queue");
const prisma_1 = require("../config/prisma");
const logger_1 = require("../utils/logger");
const uuid_1 = require("uuid");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
const storage = multer_1.default.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path_1.default.join(process.cwd(), 'uploads');
        try {
            await promises_1.default.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        }
        catch (error) {
            cb(error, uploadDir);
        }
    },
    filename: (req, file, cb) => {
        const uniqueName = `${(0, uuid_1.v4)()}-${file.originalname}`;
        cb(null, uniqueName);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.txt', '.doc', '.docx', '.pdf', '.md'];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error(`不支持的文件类型: ${ext}`));
        }
    },
});
const uploadValidation = [
    (0, express_validator_1.body)('order')
        .isIn(['顺序', '随机'])
        .withMessage('出题顺序必须是"顺序"或"随机"'),
    (0, express_validator_1.body)('title')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('标题长度必须在1-100字符之间'),
];
router.post('/', auth_1.protect, upload.single('file'), uploadValidation, validation_1.validateRequest, async (req, res) => {
    try {
        const { order, title } = req.body;
        const file = req.file;
        const userId = req.user.id;
        if (!file) {
            return res.status(400).json({
                success: false,
                message: '请选择要上传的文件',
            });
        }
        logger_1.logger.info('开始处理文件上传', {
            userId,
            filename: file.originalname,
            size: file.size,
            order,
        });
        const quiz = await prisma_1.prisma.quiz.create({
            data: {
                id: (0, uuid_1.v4)(),
                title: title || file.originalname,
                orderMode: order,
                status: 'pending',
                filePath: file.path,
                userId,
            },
        });
        const job = await prisma_1.prisma.job.create({
            data: {
                id: (0, uuid_1.v4)(),
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
        const queueJob = await queue_1.quizQueue.add('parse', {
            quizId: quiz.id,
            filePath: file.path,
            orderMode: order,
            userId,
        }, {
            jobId: job.id,
        });
        logger_1.logger.info('文件上传任务已加入队列', {
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
    }
    catch (error) {
        logger_1.logger.error('文件上传处理失败:', error);
        if (req.file) {
            try {
                await promises_1.default.unlink(req.file.path);
            }
            catch (unlinkError) {
                logger_1.logger.error('清理上传文件失败:', unlinkError);
            }
        }
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : '文件上传失败',
        });
    }
});
router.post('/text', auth_1.protect, [
    (0, express_validator_1.body)('content')
        .isLength({ min: 10 })
        .withMessage('文字内容至少需要10个字符'),
    (0, express_validator_1.body)('order')
        .isIn(['顺序', '随机'])
        .withMessage('出题顺序必须是"顺序"或"随机"'),
    (0, express_validator_1.body)('title')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('标题长度必须在1-100字符之间'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { content, order, title } = req.body;
        const userId = req.user.id;
        logger_1.logger.info('开始处理文字粘贴', {
            userId,
            contentLength: content.length,
            order,
        });
        const quiz = await prisma_1.prisma.quiz.create({
            data: {
                id: (0, uuid_1.v4)(),
                title: title || '粘贴文字题库',
                orderMode: order,
                status: 'pending',
                userId,
            },
        });
        const job = await prisma_1.prisma.job.create({
            data: {
                id: (0, uuid_1.v4)(),
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
        const queueJob = await queue_1.quizQueue.add('parse', {
            quizId: quiz.id,
            fileContent: content,
            orderMode: order,
            userId,
        }, {
            jobId: job.id,
        });
        logger_1.logger.info('文字粘贴任务已加入队列', {
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
    }
    catch (error) {
        logger_1.logger.error('文字粘贴处理失败:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : '文字处理失败',
        });
    }
});
exports.default = router;
//# sourceMappingURL=uploadRoutes.js.map