import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/utils/logger';
import { ApiError } from '@/utils/ApiError';
import { IQuestion } from '@/models/Quiz';
import fs from 'fs';
import path from 'path';

interface ParseResult {
  success: boolean;
  questions: IQuestion[];
  error?: string;
  totalQuestions: number;
}

interface AIParseOptions {
  content: string;
  apiKey: string;
  progressCallback?: (progress: number) => void;
}

interface QuizGenerationOptions {
  content: string;
  apiKey: string;
  questionOrder: '顺序' | '随机';
  progressCallback?: (progress: number) => void;
}

interface QuizGenerationResult {
  success: boolean;
  html?: string;
  error?: string;
}

class AIService {
  private genAI: GoogleGenerativeAI | null = null;

  /**
   * 初始化AI服务
   */
  private initializeAI(apiKey: string): void {
    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      logger.info('AI服务初始化成功');
    } catch (error) {
      logger.error('AI服务初始化失败:', error);
      throw new ApiError('AI服务初始化失败', 500);
    }
  }

  /**
   * 验证API密钥
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      this.initializeAI(apiKey);
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-pro' });
      
      // 发送一个简单的测试请求
      const result = await model.generateContent('测试连接');
      const response = await result.response;
      
      return !!response.text();
    } catch (error) {
      logger.error('API密钥验证失败:', error);
      return false;
    }
  }

  /**
   * 解析题库内容
   */
  async parseQuizContent(options: AIParseOptions): Promise<ParseResult> {
    const { content, apiKey, progressCallback } = options;

    try {
      // 初始化AI服务
      this.initializeAI(apiKey);
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-pro' });

      // 更新进度
      progressCallback?.(10);

      // 构建解析提示词
      const prompt = this.buildParsePrompt(content);
      
      logger.info('开始AI解析题库内容', { 
        contentLength: content.length 
      });

      // 更新进度
      progressCallback?.(30);

      // 发送解析请求
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // 更新进度
      progressCallback?.(70);

      // 解析AI返回的结果
      const questions = this.parseAIResponse(text);

      // 更新进度
      progressCallback?.(90);

      logger.info('AI解析完成', { 
        totalQuestions: questions.length 
      });

      // 更新进度
      progressCallback?.(100);

      return {
        success: true,
        questions,
        totalQuestions: questions.length
      };

    } catch (error) {
      logger.error('AI解析失败:', error);
      return {
        success: false,
        questions: [],
        totalQuestions: 0,
        error: error instanceof Error ? error.message : '解析失败'
      };
    }
  }

  /**
   * 生成完整的刷题HTML网页
   */
  async generateQuizHTML(options: QuizGenerationOptions): Promise<QuizGenerationResult> {
    const { content, apiKey, questionOrder, progressCallback } = options;

    try {
      // 初始化AI服务
      this.initializeAI(apiKey);
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-pro' });

      progressCallback?.(10);

      // 读取题库转换prompt模板
      const promptTemplate = await this.loadPromptTemplate();

      progressCallback?.(20);

      // 构建完整的prompt
      const prompt = this.buildQuizGenerationPrompt(content, questionOrder, promptTemplate);

      logger.info('开始生成题库HTML', {
        contentLength: content.length,
        questionOrder
      });

      progressCallback?.(30);

      // 发送生成请求
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const htmlContent = response.text();

      progressCallback?.(80);

      // 验证生成的HTML
      if (!htmlContent || !htmlContent.includes('<html')) {
        throw new Error('生成的HTML内容无效');
      }

      progressCallback?.(100);

      logger.info('题库HTML生成完成');

      return {
        success: true,
        html: htmlContent
      };

    } catch (error) {
      logger.error('题库HTML生成失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成失败'
      };
    }
  }

  /**
   * 加载题库转换prompt模板
   */
  private async loadPromptTemplate(): Promise<string> {
    try {
      const promptPath = path.join(process.cwd(), '题库转换prompt.md');
      const promptContent = await fs.promises.readFile(promptPath, 'utf-8');
      return promptContent;
    } catch (error) {
      logger.error('加载prompt模板失败:', error);
      throw new Error('无法加载题库转换模板');
    }
  }

  /**
   * 构建题库生成提示词
   */
  private buildQuizGenerationPrompt(content: string, questionOrder: '顺序' | '随机', promptTemplate: string): string {
    // 构建符合prompt规则的AI指令
    const prompt = `你是一个专业的题库转换AI助手。请根据以下规则和用户提供的内容，生成一个完整的HTML刷题网页。

## 任务要求
根据用户选择的"${questionOrder}"模式和提供的题库内容，创建一个功能完善、用于刷题的前端网页，需打包在单个HTML文件中。

## 用户选择
- 出题顺序：${questionOrder}

## 题库内容
${content}

## 生成规则

### 1. 题目排列
${questionOrder === '随机' ?
  '- 必须首先一次性地将整个题库顺序打乱，生成一个全新的随机序列\n- 所有面向用户的编号（如"题目 1 / 96"）、导航控制（"上一题"、"下一题"按钮）以及底部的题目导航栏，都必须严格遵循这个新生成的随机序列' :
  '- 严格按照题库中的原始顺序排列题目'
}

### 2. 题目解析
- 自动识别题目类型：选择题（有选项）、填空题（题干+答案）
- 对于选择题：正确选项行开头有句号"。"标记
- 网页上的题号从"1"开始，按顺序连续编号
- 选择题选项不使用A/B/C/D标签，按文档顺序排列

### 3. 界面功能
- 一次只显示一道题目
- 实时反馈：选择题正确选项绿色高亮，错误选项红色高亮
- 填空题：提供输入框和提交按钮，严格完全匹配验证
- 作答后锁定，不可更改
- 保存用户作答记录，支持题目间切换

### 4. 导航控制
- 上一题/下一题按钮
- 底部题目导航栏：所有题号水平排列，支持横向滑动
- 状态显示：当前题目蓝色高亮，答对绿色，答错红色
- "完成练习"按钮，显示结果页面
- 结果格式：答对题数/总题数(正确率%)
- "重新开始"按钮

### 5. 技术要求
- 所有代码（HTML, CSS, JavaScript）包含在单个文件中
- 使用Tailwind CSS进行样式设计
- 优先确保手机端良好显示
- 所有状态更新必须是静态的，立即完成，不使用动画

## 输出要求
请直接返回完整的HTML代码，以<!DOCTYPE html>开始，包含完整的功能实现。不要包含任何解释文字或代码块标记。`;

    return prompt;
  }

  /**
   * 构建解析提示词（保留原有功能）
   */
  private buildParsePrompt(content: string): string {
    return `
请将以下内容解析为结构化的题目数据。请严格按照以下JSON格式返回，不要包含任何其他文字说明：

[
  {
    "id": "唯一标识符",
    "question": "题目内容",
    "type": "题目类型(multiple-choice/short-answer/true-false/fill-blank)",
    "options": ["选项A", "选项B", "选项C", "选项D"] (仅选择题需要),
    "answer": "正确答案",
    "explanation": "答案解释(可选)",
    "difficulty": "难度(easy/medium/hard)",
    "tags": ["标签1", "标签2"] (可选)
  }
]

解析规则：
1. 自动识别题目类型：
   - 有选项的是选择题(multiple-choice)
   - 判断对错的是判断题(true-false)
   - 填空的是填空题(fill-blank)
   - 其他的是简答题(short-answer)

2. 为每个题目生成唯一的ID（使用数字序号）
3. 提取准确的答案
4. 根据题目内容判断难度等级
5. 如果有相关主题，添加标签

待解析内容：
${content}

请返回JSON数组：
`;
  }

  /**
   * 解析AI返回的结果
   */
  private parseAIResponse(aiResponse: string): IQuestion[] {
    try {
      // 清理响应文本，提取JSON部分
      let jsonText = aiResponse.trim();
      
      // 移除可能的markdown代码块标记
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // 查找JSON数组的开始和结束
      const startIndex = jsonText.indexOf('[');
      const endIndex = jsonText.lastIndexOf(']');
      
      if (startIndex === -1 || endIndex === -1) {
        throw new Error('AI响应中未找到有效的JSON数组');
      }
      
      jsonText = jsonText.substring(startIndex, endIndex + 1);
      
      // 解析JSON
      const parsedQuestions = JSON.parse(jsonText);
      
      if (!Array.isArray(parsedQuestions)) {
        throw new Error('AI响应不是有效的数组格式');
      }

      // 验证和标准化题目数据
      const questions: IQuestion[] = parsedQuestions.map((q, index) => {
        return {
          id: q.id || `question_${index + 1}`,
          question: q.question || '',
          type: this.validateQuestionType(q.type),
          options: q.type === 'multiple-choice' ? (q.options || []) : undefined,
          answer: q.answer || '',
          explanation: q.explanation || undefined,
          difficulty: this.validateDifficulty(q.difficulty),
          tags: Array.isArray(q.tags) ? q.tags : undefined
        };
      }).filter(q => q.question && q.answer); // 过滤掉无效题目

      logger.info('AI响应解析成功', { 
        originalCount: parsedQuestions.length,
        validCount: questions.length 
      });

      return questions;

    } catch (error) {
      logger.error('解析AI响应失败:', error);
      throw new Error('AI响应格式无效，请重试');
    }
  }

  /**
   * 验证题目类型
   */
  private validateQuestionType(type: string): IQuestion['type'] {
    const validTypes: IQuestion['type'][] = ['multiple-choice', 'short-answer', 'true-false', 'fill-blank'];
    return validTypes.includes(type as IQuestion['type']) ? type as IQuestion['type'] : 'short-answer';
  }

  /**
   * 验证难度等级
   */
  private validateDifficulty(difficulty: string): IQuestion['difficulty'] {
    const validDifficulties: IQuestion['difficulty'][] = ['easy', 'medium', 'hard'];
    return validDifficulties.includes(difficulty as IQuestion['difficulty']) ? 
      difficulty as IQuestion['difficulty'] : 'medium';
  }

  /**
   * 批量解析大型内容
   */
  async parseLargeContent(options: AIParseOptions): Promise<ParseResult> {
    const { content, apiKey, progressCallback } = options;
    
    // 如果内容较小，直接解析
    if (content.length <= 5000) {
      return this.parseQuizContent(options);
    }

    // 分块处理大型内容
    const chunks = this.splitContent(content, 4000);
    const allQuestions: IQuestion[] = [];
    let questionIdCounter = 1;

    for (let i = 0; i < chunks.length; i++) {
      const chunkProgress = (i / chunks.length) * 100;
      progressCallback?.(chunkProgress);

      try {
        const chunkResult = await this.parseQuizContent({
          content: chunks[i],
          apiKey,
          progressCallback: (progress) => {
            const totalProgress = chunkProgress + (progress / chunks.length);
            progressCallback?.(totalProgress);
          }
        });

        if (chunkResult.success) {
          // 重新分配ID以确保唯一性
          const questionsWithNewIds = chunkResult.questions.map(q => ({
            ...q,
            id: `question_${questionIdCounter++}`
          }));
          allQuestions.push(...questionsWithNewIds);
        }
      } catch (error) {
        logger.error(`解析第${i + 1}块内容失败:`, error);
      }
    }

    return {
      success: allQuestions.length > 0,
      questions: allQuestions,
      totalQuestions: allQuestions.length,
      error: allQuestions.length === 0 ? '所有内容块解析失败' : undefined
    };
  }

  /**
   * 分割内容为较小的块
   */
  private splitContent(content: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    const lines = content.split('\n');
    let currentChunk = '';

    for (const line of lines) {
      if (currentChunk.length + line.length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = line;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

// 导出单例实例
export const aiService = new AIService();
