"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuizHTML = generateQuizHTML;
const logger_1 = require("../utils/logger");
const AIService = require('./aiService');
async function generateQuizHTML(content, orderMode) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('未配置Gemini API密钥');
        }
        logger_1.logger.info('开始调用Gemini生成题库HTML', {
            contentLength: content.length,
            orderMode,
        });
        const aiService = new AIService();
        const result = await aiService.generateQuiz({
            content,
            apiKey,
            questionOrder: orderMode,
        });
        if (!result.success) {
            throw new Error(result.error || '题库生成失败');
        }
        logger_1.logger.info('Gemini题库生成成功', {
            htmlLength: result.html?.length || 0,
        });
        return result.html || '';
    }
    catch (error) {
        logger_1.logger.error('Gemini题库生成失败:', error);
        throw new Error(`题库生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
}
//# sourceMappingURL=gemini.js.map