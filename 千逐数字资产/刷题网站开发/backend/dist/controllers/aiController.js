"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertQuiz = exports.reparseQuiz = exports.getConvertStatus = exports.getParseStatus = exports.parseQuiz = exports.validateApiKey = void 0;
const Quiz_1 = require("@/models/Quiz");
const User_1 = require("@/models/User");
const aiService_1 = require("@/services/aiService");
const fileParserService_1 = require("@/services/fileParserService");
const logger_1 = require("@/utils/logger");
const ApiError_1 = require("@/utils/ApiError");
const uuid_1 = require("uuid");
const parseTaskStatus = new Map();
const fileParserService = new fileParserService_1.FileParserService();
const validateApiKey = async (req, res, next) => {
    try {
        const { apiKey } = req.body;
        if (!apiKey) {
            return next(new ApiError_1.ApiError('API密钥是必需的', 400));
        }
        const isValid = await aiService_1.aiService.validateApiKey(apiKey);
        logger_1.logger.info('API密钥验证', {
            userId: req.user._id,
            isValid
        });
        res.status(200).json({
            success: true,
            data: {
                isValid,
                message: isValid ? 'API密钥有效' : 'API密钥无效或已过期'
            }
        });
    }
    catch (error) {
        logger_1.logger.error('API密钥验证失败', error);
        next(error);
    }
};
exports.validateApiKey = validateApiKey;
const parseQuiz = async (req, res, next) => {
    try {
        const { quizId, apiKey } = req.body;
        const userId = req.user._id;
        if (!quizId || !apiKey) {
            return next(new ApiError_1.ApiError('题库ID和API密钥是必需的', 400));
        }
        const quiz = await Quiz_1.Quiz.findOne({
            _id: quizId,
            userId
        });
        if (!quiz) {
            return next(new ApiError_1.ApiError('题库不存在或您没有访问权限', 404));
        }
        if (quiz.status === 'processing') {
            return next(new ApiError_1.ApiError('题库正在解析中，请稍候', 400));
        }
        if (quiz.status === 'completed' && quiz.questions.length > 0) {
            return next(new ApiError_1.ApiError('题库已解析完成，如需重新解析请先清空题目', 400));
        }
        const taskId = `${quizId}_${Date.now()}`;
        quiz.status = 'processing';
        quiz.processingProgress = 0;
        quiz.processingError = undefined;
        await quiz.save();
        parseTaskStatus.set(taskId, {
            status: 'processing',
            progress: 0,
            quizId: quizId,
            userId: userId.toString()
        });
        setImmediate(async () => {
            try {
                logger_1.logger.info('开始解析题库', { quizId, taskId });
                const result = await aiService_1.aiService.parseLargeContent({
                    content: quiz.content,
                    apiKey,
                    progressCallback: (progress) => {
                        const task = parseTaskStatus.get(taskId);
                        if (task) {
                            task.progress = progress;
                            parseTaskStatus.set(taskId, task);
                        }
                        Quiz_1.Quiz.findByIdAndUpdate(quizId, {
                            processingProgress: progress
                        }).catch(err => {
                            logger_1.logger.error('更新解析进度失败', err);
                        });
                    }
                });
                if (result.success) {
                    quiz.questions = result.questions;
                    quiz.status = 'completed';
                    quiz.processingProgress = 100;
                    quiz.processingError = undefined;
                    await quiz.save();
                    await User_1.User.findByIdAndUpdate(userId, {
                        $inc: {
                            'stats.totalQuizzes': 1,
                            'stats.totalQuestions': result.totalQuestions
                        }
                    });
                    parseTaskStatus.set(taskId, {
                        status: 'completed',
                        progress: 100,
                        quizId: quizId,
                        userId: userId.toString()
                    });
                    logger_1.logger.info('题库解析成功', {
                        quizId,
                        taskId,
                        totalQuestions: result.totalQuestions
                    });
                }
                else {
                    quiz.status = 'failed';
                    quiz.processingError = result.error || '解析失败';
                    await quiz.save();
                    parseTaskStatus.set(taskId, {
                        status: 'failed',
                        progress: 0,
                        error: result.error,
                        quizId: quizId,
                        userId: userId.toString()
                    });
                    logger_1.logger.error('题库解析失败', {
                        quizId,
                        taskId,
                        error: result.error
                    });
                }
            }
            catch (error) {
                logger_1.logger.error('解析过程中发生错误', error);
                await Quiz_1.Quiz.findByIdAndUpdate(quizId, {
                    status: 'failed',
                    processingError: error instanceof Error ? error.message : '解析过程中发生未知错误'
                });
                parseTaskStatus.set(taskId, {
                    status: 'failed',
                    progress: 0,
                    error: error instanceof Error ? error.message : '解析过程中发生未知错误',
                    quizId: quizId,
                    userId: userId.toString()
                });
            }
        });
        res.status(202).json({
            success: true,
            message: '解析任务已启动',
            data: {
                taskId,
                status: 'processing',
                progress: 0
            }
        });
    }
    catch (error) {
        logger_1.logger.error('启动解析任务失败', error);
        next(error);
    }
};
exports.parseQuiz = parseQuiz;
const getParseStatus = async (req, res, next) => {
    try {
        const { taskId } = req.params;
        const userId = req.user._id.toString();
        const task = parseTaskStatus.get(taskId);
        if (!task) {
            return next(new ApiError_1.ApiError('解析任务不存在', 404));
        }
        if (task.userId !== userId) {
            return next(new ApiError_1.ApiError('您没有权限查看此任务', 403));
        }
        let quizData = null;
        if (task.status === 'completed') {
            const quiz = await Quiz_1.Quiz.findById(task.quizId)
                .select('title status stats questions.length');
            if (quiz) {
                quizData = {
                    title: quiz.title,
                    status: quiz.status,
                    totalQuestions: quiz.questions.length,
                    stats: quiz.stats
                };
            }
        }
        res.status(200).json({
            success: true,
            data: {
                taskId,
                status: task.status,
                progress: task.progress,
                error: task.error,
                quiz: quizData
            }
        });
        if (task.status !== 'processing') {
            setTimeout(() => {
                parseTaskStatus.delete(taskId);
            }, 300000);
        }
    }
    catch (error) {
        logger_1.logger.error('获取解析状态失败', error);
        next(error);
    }
};
exports.getParseStatus = getParseStatus;
const getConvertStatus = async (req, res, next) => {
    try {
        const { taskId } = req.params;
        const task = parseTaskStatus.get(taskId);
        if (!task) {
            return next(new ApiError_1.ApiError('转换任务不存在', 404));
        }
        res.json({
            success: true,
            data: {
                taskId,
                status: task.status,
                progress: task.progress,
                result: task.result,
                error: task.error,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getConvertStatus = getConvertStatus;
const reparseQuiz = async (req, res, next) => {
    try {
        const { quizId, apiKey } = req.body;
        const userId = req.user._id;
        const quiz = await Quiz_1.Quiz.findOne({
            _id: quizId,
            userId
        });
        if (!quiz) {
            return next(new ApiError_1.ApiError('题库不存在或您没有访问权限', 404));
        }
        quiz.questions = [];
        quiz.status = 'draft';
        quiz.processingProgress = 0;
        quiz.processingError = undefined;
        await quiz.save();
        req.body = { quizId, apiKey };
        return (0, exports.parseQuiz)(req, res, next);
    }
    catch (error) {
        logger_1.logger.error('重新解析题库失败', error);
        next(error);
    }
};
exports.reparseQuiz = reparseQuiz;
const convertQuiz = async (req, res, next) => {
    try {
        let content = '';
        let fileName = '';
        const { order, apiKey } = req.body;
        if (!order || !apiKey) {
            return next(new ApiError_1.ApiError('出题顺序和API密钥是必需的', 400));
        }
        if (!['顺序', '随机'].includes(order)) {
            return next(new ApiError_1.ApiError('出题顺序必须是"顺序"或"随机"', 400));
        }
        if (req.file) {
            try {
                const parseResult = await fileParserService.parseFile(req.file.buffer, req.file.originalname, req.file.mimetype);
                content = parseResult.text;
                fileName = req.file.originalname;
            }
            catch (error) {
                return next(new ApiError_1.ApiError(`文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`, 400));
            }
        }
        else if (req.body.fileContent) {
            content = req.body.fileContent;
            fileName = req.body.fileName || '手动输入.txt';
        }
        else {
            return next(new ApiError_1.ApiError('请提供文件或文字内容', 400));
        }
        if (!content.trim()) {
            return next(new ApiError_1.ApiError('内容不能为空', 400));
        }
        const taskId = (0, uuid_1.v4)();
        parseTaskStatus.set(taskId, {
            status: 'processing',
            progress: 0,
            userId: 'anonymous'
        });
        setImmediate(async () => {
            try {
                logger_1.logger.info('开始智能题库转换', { taskId, fileName });
                const task = parseTaskStatus.get(taskId);
                if (task) {
                    task.status = 'generating';
                    task.progress = 10;
                    parseTaskStatus.set(taskId, task);
                }
                const result = await aiService_1.aiService.generateQuizHTML({
                    content,
                    apiKey,
                    questionOrder: order,
                    progressCallback: (progress) => {
                        const currentTask = parseTaskStatus.get(taskId);
                        if (currentTask) {
                            currentTask.progress = progress;
                            parseTaskStatus.set(taskId, currentTask);
                        }
                    }
                });
                const finalTask = parseTaskStatus.get(taskId);
                if (finalTask) {
                    if (result.success) {
                        finalTask.status = 'completed';
                        finalTask.progress = 100;
                        finalTask.result = { html: result.html };
                    }
                    else {
                        finalTask.status = 'failed';
                        finalTask.error = result.error;
                    }
                    parseTaskStatus.set(taskId, finalTask);
                }
                logger_1.logger.info('智能题库转换完成', { taskId, success: result.success });
            }
            catch (error) {
                logger_1.logger.error('智能题库转换失败', { taskId, error });
                const failedTask = parseTaskStatus.get(taskId);
                if (failedTask) {
                    failedTask.status = 'failed';
                    failedTask.error = error instanceof Error ? error.message : '转换失败';
                    parseTaskStatus.set(taskId, failedTask);
                }
            }
        });
        res.status(200).json({
            success: true,
            data: {
                taskId,
                message: '题库转换已开始，请使用taskId查询进度'
            }
        });
    }
    catch (error) {
        logger_1.logger.error('智能题库转换请求失败', error);
        next(error);
    }
};
exports.convertQuiz = convertQuiz;
//# sourceMappingURL=aiController.js.map