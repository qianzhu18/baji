"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeWorker = exports.quizWorker = void 0;
const bullmq_1 = require("bullmq");
const queue_1 = require("../config/queue");
const prisma_1 = require("../config/prisma");
const logger_1 = require("../utils/logger");
const parser_1 = require("../services/parser");
const gemini_1 = require("../services/gemini");
const promises_1 = __importDefault(require("fs/promises"));
exports.quizWorker = new bullmq_1.Worker('quiz-processing', async (job) => {
    const { quizId, filePath, fileContent, orderMode, userId } = job.data;
    logger_1.logger.info(`开始处理题库任务: ${job.id}`, { quizId, orderMode });
    try {
        await updateJobProgress(job, 10, '开始解析文件...');
        let content;
        if (filePath) {
            content = await promises_1.default.readFile(filePath, 'utf-8');
        }
        else if (fileContent) {
            content = fileContent;
        }
        else {
            throw new Error('未提供文件路径或文件内容');
        }
        await updateJobProgress(job, 30, '解析文件内容...');
        const parsedData = await (0, parser_1.parseFileToJSON)(content, filePath);
        await updateJobProgress(job, 50, '调用AI生成HTML...');
        const html = await (0, gemini_1.generateQuizHTML)(parsedData, orderMode);
        await updateJobProgress(job, 80, '保存结果...');
        await prisma_1.prisma.quiz.update({
            where: { id: quizId },
            data: {
                html,
                status: 'completed',
                updatedAt: new Date(),
            },
        });
        await updateJobProgress(job, 100, '处理完成');
        logger_1.logger.info(`题库任务处理完成: ${job.id}`, { quizId });
        return {
            success: true,
            quizId,
            message: '题库生成成功',
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        logger_1.logger.error(`题库任务处理失败: ${job.id}`, {
            quizId,
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined
        });
        await prisma_1.prisma.quiz.update({
            where: { id: quizId },
            data: {
                status: 'failed',
                errorMsg: errorMessage,
                updatedAt: new Date(),
            },
        });
        throw error;
    }
}, queue_1.workerOptions);
async function updateJobProgress(job, progress, message) {
    try {
        await job.updateProgress(progress);
        await prisma_1.prisma.job.updateMany({
            where: {
                data: {
                    contains: job.id
                }
            },
            data: {
                progress,
                updatedAt: new Date(),
            },
        });
        logger_1.logger.debug(`任务进度更新: ${job.id}`, { progress, message });
    }
    catch (error) {
        logger_1.logger.error(`更新任务进度失败: ${job.id}`, error);
    }
}
exports.quizWorker.on('completed', (job) => {
    logger_1.logger.info(`Worker完成任务: ${job.id}`);
});
exports.quizWorker.on('failed', (job, err) => {
    logger_1.logger.error(`Worker任务失败: ${job?.id}`, err);
});
exports.quizWorker.on('error', (err) => {
    logger_1.logger.error('Worker错误:', err);
});
const closeWorker = async () => {
    try {
        await exports.quizWorker.close();
        logger_1.logger.info('Quiz Worker已关闭');
    }
    catch (error) {
        logger_1.logger.error('关闭Quiz Worker失败:', error);
    }
};
exports.closeWorker = closeWorker;
logger_1.logger.info('Quiz Worker已启动');
//# sourceMappingURL=quizWorker.js.map