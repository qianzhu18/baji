/**
 * AI Provider 接口定义
 * 支持多种AI服务提供商的统一接口
 */

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  quota?: {
    used: number;
    limit: number;
    remaining: number;
  };
}

export interface QuizGenerationOptions {
  content: string;
  orderMode: '顺序' | '随机';
  maxQuestions?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  language?: string;
}

export interface QuizGenerationResult {
  success: boolean;
  html?: string;
  error?: string;
  metadata?: {
    questionCount: number;
    processingTime: number;
    tokensUsed: number;
  };
}

export interface ProviderConfig {
  apiKey: string;
  model?: string;
  timeout?: number;
  maxRetries?: number;
  baseUrl?: string;
}

/**
 * AI Provider 统一接口
 */
export interface IAiProvider {
  /**
   * Provider 名称
   */
  readonly name: string;

  /**
   * Provider 版本
   */
  readonly version: string;

  /**
   * 验证API密钥有效性
   * @param apiKey API密钥
   * @returns 验证结果
   */
  validateKey(apiKey: string): Promise<ValidationResult>;

  /**
   * 生成题库HTML
   * @param options 生成选项
   * @returns 生成结果
   */
  generateQuizHtml(options: QuizGenerationOptions): Promise<QuizGenerationResult>;

  /**
   * 检查服务健康状态
   * @returns 健康状态
   */
  healthCheck(): Promise<boolean>;

  /**
   * 获取使用统计
   * @returns 使用统计信息
   */
  getUsageStats(): Promise<{
    requestsToday: number;
    tokensUsed: number;
    errorRate: number;
  }>;
}

/**
 * Provider 工厂接口
 */
export interface IAiProviderFactory {
  /**
   * 创建Provider实例
   * @param type Provider类型
   * @param config 配置
   * @returns Provider实例
   */
  createProvider(type: string, config: ProviderConfig): IAiProvider;

  /**
   * 获取支持的Provider类型列表
   * @returns 支持的类型
   */
  getSupportedTypes(): string[];
}

/**
 * Provider 错误类型
 */
export class AiProviderError extends Error {
  constructor(
    message: string,
    public readonly code: AiErrorCodeString,
    public readonly provider: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}

/**
 * 常见错误代码
 */
export const AI_ERROR_CODES = {
  INVALID_API_KEY: 'INVALID_API_KEY',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  RATE_LIMITED: 'RATE_LIMITED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  INVALID_REQUEST: 'INVALID_REQUEST',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type AiErrorCode = typeof AI_ERROR_CODES[keyof typeof AI_ERROR_CODES];

export type AiErrorCodeType =
  | 'INVALID_API_KEY'
  | 'QUOTA_EXCEEDED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INVALID_REQUEST'
  | 'SERVICE_UNAVAILABLE'
  | 'UNKNOWN_ERROR';

// 简化类型定义，使用字符串类型
export type AiErrorCodeString = string;
