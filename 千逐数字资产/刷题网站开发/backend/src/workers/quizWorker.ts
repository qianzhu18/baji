import { Worker, Job } from 'bullmq';
import { workerOptions } from '../config/queue';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import { parseFileToJSON } from '../services/parser';
import { generateQuizHTML } from '../services/gemini';
import fs from 'fs/promises';
import path from 'path';

// 任务数据接口
interface QuizJobData {
  quizId: string;
  filePath?: string;
  fileContent?: string;
  orderMode: '顺序' | '随机';
  userId: string;
}

// 创建Worker
export const quizWorker = new Worker(
  'quiz-processing',
  async (job: Job<QuizJobData>) => {
    const { quizId, filePath, fileContent, orderMode, userId } = job.data;
    
    logger.info(`开始处理题库任务: ${job.id}`, { quizId, orderMode });

    try {
      // 更新任务状态为处理中
      await updateJobProgress(job, 10, '开始解析文件...');
      
      let content: string;
      
      // 获取文件内容
      if (filePath) {
        // 从文件路径读取
        content = await fs.readFile(filePath, 'utf-8');
      } else if (fileContent) {
        // 直接使用提供的内容
        content = fileContent;
      } else {
        throw new Error('未提供文件路径或文件内容');
      }

      // 更新进度
      await updateJobProgress(job, 30, '解析文件内容...');

      // 解析文件内容为结构化数据
      const parsedData = await parseFileToJSON(content, filePath);
      
      // 更新进度
      await updateJobProgress(job, 50, '调用AI生成HTML...');

      // 调用Gemini API生成HTML
      const html = await generateQuizHTML(parsedData, orderMode);
      
      // 更新进度
      await updateJobProgress(job, 80, '保存结果...');

      // 更新数据库中的题库记录
      await prisma.quiz.update({
        where: { id: quizId },
        data: {
          html,
          status: 'completed',
          updatedAt: new Date(),
        },
      });

      // 更新任务状态为完成
      await updateJobProgress(job, 100, '处理完成');

      logger.info(`题库任务处理完成: ${job.id}`, { quizId });

      return {
        success: true,
        quizId,
        message: '题库生成成功',
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      logger.error(`题库任务处理失败: ${job.id}`, { 
        quizId, 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined 
      });

      // 更新数据库中的题库记录为失败状态
      await prisma.quiz.update({
        where: { id: quizId },
        data: {
          status: 'failed',
          errorMsg: errorMessage,
          updatedAt: new Date(),
        },
      });

      // 抛出错误，让BullMQ处理重试逻辑
      throw error;
    }
  },
  workerOptions
);

// 更新任务进度的辅助函数
async function updateJobProgress(job: Job, progress: number, message: string) {
  try {
    await job.updateProgress(progress);
    
    // 同时更新数据库中的Job记录
    await prisma.job.updateMany({
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

    logger.debug(`任务进度更新: ${job.id}`, { progress, message });
  } catch (error) {
    logger.error(`更新任务进度失败: ${job.id}`, error);
  }
}

// Worker事件监听
quizWorker.on('completed', (job) => {
  logger.info(`Worker完成任务: ${job.id}`);
});

quizWorker.on('failed', (job, err) => {
  logger.error(`Worker任务失败: ${job?.id}`, err);
});

quizWorker.on('error', (err) => {
  logger.error('Worker错误:', err);
});

// 优雅关闭Worker
export const closeWorker = async () => {
  try {
    await quizWorker.close();
    logger.info('Quiz Worker已关闭');
  } catch (error) {
    logger.error('关闭Quiz Worker失败:', error);
  }
};

logger.info('Quiz Worker已启动');
