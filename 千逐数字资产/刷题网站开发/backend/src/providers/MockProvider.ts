import { 
  IAiProvider, 
  ValidationResult, 
  QuizGenerationOptions, 
  QuizGenerationResult 
} from '../interfaces/IAiProvider';
import { logger } from '../utils/logger';

/**
 * Mock AI Provider - 用于测试和降级场景
 */
export class MockProvider implements IAiProvider {
  public readonly name = 'mock';
  public readonly version = '1.0.0';

  private delay: number;
  private shouldFail: boolean;

  constructor(config: {
    delay?: number;
    shouldFail?: boolean;
  } = {}) {
    this.delay = config.delay || 1000;
    this.shouldFail = config.shouldFail || false;
  }

  async validateKey(apiKey?: string): Promise<ValidationResult> {
    logger.info('Mock provider validating API key...');
    
    await this.simulateDelay();

    if (this.shouldFail) {
      return {
        valid: false,
        reason: 'Mock provider configured to fail validation'
      };
    }

    return {
      valid: true,
      quota: {
        used: 10,
        limit: 1000,
        remaining: 990
      }
    };
  }

  async generateQuizHtml(options: QuizGenerationOptions): Promise<QuizGenerationResult> {
    logger.info('Mock provider generating quiz HTML...');
    
    await this.simulateDelay();

    if (this.shouldFail) {
      return {
        success: false,
        error: 'Mock provider configured to fail generation'
      };
    }

    const html = this.generateMockHtml(options);
    const questionCount = this.extractQuestionCount(options.content);

    return {
      success: true,
      html,
      metadata: {
        questionCount,
        processingTime: this.delay,
        tokensUsed: Math.ceil(options.content.length / 4)
      }
    };
  }

  async healthCheck(): Promise<boolean> {
    await this.simulateDelay(100);
    return !this.shouldFail;
  }

  async getUsageStats(): Promise<{
    requestsToday: number;
    tokensUsed: number;
    errorRate: number;
  }> {
    return {
      requestsToday: 42,
      tokensUsed: 1337,
      errorRate: this.shouldFail ? 1.0 : 0.05
    };
  }

  private async simulateDelay(customDelay?: number): Promise<void> {
    const delay = customDelay || this.delay;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private generateMockHtml(options: QuizGenerationOptions): string {
    const questionCount = this.extractQuestionCount(options.content);
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mock 题库</title>
    <style>
        .quiz-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            font-family: 'Microsoft YaHei', sans-serif;
        }
        .quiz-title {
            color: #333;
            border-bottom: 2px solid #007bff;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        .question {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            background-color: #f9f9f9;
        }
        .question-title {
            font-weight: bold;
            margin-bottom: 15px;
            color: #333;
        }
        .options {
            margin: 15px 0;
        }
        .option {
            margin: 8px 0;
            padding: 8px 12px;
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .answer {
            margin-top: 15px;
            padding: 10px;
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            border-radius: 4px;
            color: #155724;
        }
        .explanation {
            margin-top: 10px;
            padding: 10px;
            background-color: #e2e3e5;
            border: 1px solid #d6d8db;
            border-radius: 4px;
            color: #383d41;
        }
        .mock-notice {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="quiz-container">
        <div class="mock-notice">
            <strong>🤖 Mock AI 演示模式</strong><br>
            这是由Mock Provider生成的示例题库，用于演示和测试目的。<br>
            实际使用时请配置真实的AI服务提供商。
        </div>
        
        <h1 class="quiz-title">Mock 题库演示</h1>
        
        <div class="question">
            <div class="question-title">1. 什么是Mock Provider？</div>
            <div class="options">
                <div class="option">A. 真实的AI服务提供商</div>
                <div class="option">B. 用于测试和演示的模拟服务</div>
                <div class="option">C. 一种数据库类型</div>
                <div class="option">D. 前端框架</div>
            </div>
            <div class="answer"><strong>答案：B</strong></div>
            <div class="explanation">
                <strong>解析：</strong>Mock Provider是一个模拟的AI服务提供商，
                主要用于测试、演示和在真实AI服务不可用时的降级场景。
            </div>
        </div>

        <div class="question">
            <div class="question-title">2. Mock Provider的主要用途是什么？</div>
            <div class="options">
                <div class="option">A. 生产环境使用</div>
                <div class="option">B. 测试和演示</div>
                <div class="option">C. 数据存储</div>
                <div class="option">D. 用户认证</div>
            </div>
            <div class="answer"><strong>答案：B</strong></div>
            <div class="explanation">
                <strong>解析：</strong>Mock Provider主要用于开发测试阶段，
                以及在真实AI服务不可用时提供基本的功能演示。
            </div>
        </div>

        <div class="question">
            <div class="question-title">3. 填空题：Mock Provider可以模拟 _____ 的行为。</div>
            <div class="answer"><strong>答案：真实AI服务</strong></div>
            <div class="explanation">
                <strong>解析：</strong>Mock Provider通过模拟真实AI服务的接口和行为，
                让开发者可以在没有真实AI服务的情况下进行开发和测试。
            </div>
        </div>

        <div style="margin-top: 40px; text-align: center; color: #666;">
            <p>📊 统计信息：</p>
            <p>题目数量: ${questionCount} | 处理模式: ${options.orderMode} | 生成时间: ${new Date().toLocaleString()}</p>
            <p>原始内容长度: ${options.content.length} 字符</p>
        </div>
    </div>
</body>
</html>`;
  }

  private extractQuestionCount(content: string): number {
    // 简单的题目计数
    const lines = content.split('\n');
    let count = 0;
    
    for (const line of lines) {
      if (/^\d+\./.test(line.trim()) || 
          line.includes('题目') || 
          line.includes('问题')) {
        count++;
      }
    }
    
    return Math.max(count, 3); // 至少返回3个题目
  }
}
