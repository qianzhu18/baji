import { IAiProvider, IAiProviderFactory, ProviderConfig, AiProviderError, AI_ERROR_CODES } from '../interfaces/IAiProvider';
import { GeminiProvider } from './GeminiProvider';
import { MockProvider } from './MockProvider';
import { logger } from '../utils/logger';

/**
 * AI Provider 工厂类
 * 负责创建和管理不同类型的AI服务提供商
 */
export class AiProviderFactory implements IAiProviderFactory {
  private static instance: AiProviderFactory;
  private providers: Map<string, IAiProvider> = new Map();

  private constructor() {}

  public static getInstance(): AiProviderFactory {
    if (!AiProviderFactory.instance) {
      AiProviderFactory.instance = new AiProviderFactory();
    }
    return AiProviderFactory.instance;
  }

  /**
   * 创建Provider实例
   */
  createProvider(type: string, config: ProviderConfig): IAiProvider {
    const cacheKey = `${type}-${config.apiKey?.substring(0, 8)}`;
    
    // 检查缓存
    if (this.providers.has(cacheKey)) {
      logger.info(`Returning cached provider: ${type}`);
      return this.providers.get(cacheKey)!;
    }

    let provider: IAiProvider;

    switch (type.toLowerCase()) {
      case 'gemini':
        provider = new GeminiProvider({
          apiKey: config.apiKey,
          model: config.model || 'gemini-pro',
          timeout: config.timeout || 30000,
          maxRetries: config.maxRetries || 3
        });
        break;

      case 'mock':
        provider = new MockProvider({
          delay: 1000,
          shouldFail: false
        });
        break;

      case 'openai':
        // TODO: 实现OpenAI Provider
        throw new AiProviderError(
          'OpenAI provider not implemented yet',
          AI_ERROR_CODES.SERVICE_UNAVAILABLE,
          'openai'
        );

      default:
        throw new AiProviderError(
          `Unsupported provider type: ${type}`,
          AI_ERROR_CODES.INVALID_REQUEST,
          type
        );
    }

    // 缓存Provider实例
    this.providers.set(cacheKey, provider);
    logger.info(`Created new provider: ${type}`);

    return provider;
  }

  /**
   * 获取支持的Provider类型
   */
  getSupportedTypes(): string[] {
    return ['gemini', 'mock', 'openai'];
  }

  /**
   * 清除缓存的Provider
   */
  clearCache(): void {
    this.providers.clear();
    logger.info('Provider cache cleared');
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.providers.size,
      keys: Array.from(this.providers.keys())
    };
  }
}

/**
 * Provider管理器 - 提供高级功能
 */
export class AiProviderManager {
  private factory: AiProviderFactory;
  private currentProvider: IAiProvider | null = null;
  private fallbackProvider: IAiProvider | null = null;

  constructor() {
    this.factory = AiProviderFactory.getInstance();
  }

  /**
   * 初始化Provider
   */
  async initialize(config: {
    primary: { type: string; config: ProviderConfig };
    fallback?: { type: string; config: ProviderConfig };
  }): Promise<void> {
    try {
      // 初始化主Provider
      this.currentProvider = this.factory.createProvider(
        config.primary.type,
        config.primary.config
      );

      // 验证主Provider
      const isHealthy = await this.currentProvider.healthCheck();
      if (!isHealthy) {
        logger.warn('Primary provider health check failed, will use fallback if available');
      }

      // 初始化备用Provider
      if (config.fallback) {
        this.fallbackProvider = this.factory.createProvider(
          config.fallback.type,
          config.fallback.config
        );
        logger.info('Fallback provider initialized');
      }

      logger.info('Provider manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize provider manager:', error);
      throw error;
    }
  }

  /**
   * 获取当前可用的Provider
   */
  async getProvider(): Promise<IAiProvider> {
    if (!this.currentProvider) {
      throw new AiProviderError(
        'No provider initialized',
        AI_ERROR_CODES.SERVICE_UNAVAILABLE,
        'manager'
      );
    }

    // 检查主Provider健康状态
    const isHealthy = await this.currentProvider.healthCheck();
    
    if (isHealthy) {
      return this.currentProvider;
    }

    // 主Provider不可用，尝试使用备用Provider
    if (this.fallbackProvider) {
      logger.warn('Primary provider unhealthy, switching to fallback');
      const fallbackHealthy = await this.fallbackProvider.healthCheck();
      
      if (fallbackHealthy) {
        return this.fallbackProvider;
      }
    }

    // 都不可用，返回主Provider（让调用方处理错误）
    logger.error('All providers are unhealthy');
    return this.currentProvider;
  }

  /**
   * 强制切换到备用Provider
   */
  async switchToFallback(): Promise<boolean> {
    if (!this.fallbackProvider) {
      logger.warn('No fallback provider available');
      return false;
    }

    const isHealthy = await this.fallbackProvider.healthCheck();
    if (isHealthy) {
      // 交换主备Provider
      const temp = this.currentProvider;
      this.currentProvider = this.fallbackProvider;
      this.fallbackProvider = temp;
      
      logger.info('Switched to fallback provider');
      return true;
    }

    return false;
  }

  /**
   * 获取所有Provider的状态
   */
  async getStatus(): Promise<{
    primary: { name: string; healthy: boolean };
    fallback?: { name: string; healthy: boolean };
  }> {
    const result: any = {};

    if (this.currentProvider) {
      result.primary = {
        name: this.currentProvider.name,
        healthy: await this.currentProvider.healthCheck()
      };
    }

    if (this.fallbackProvider) {
      result.fallback = {
        name: this.fallbackProvider.name,
        healthy: await this.fallbackProvider.healthCheck()
      };
    }

    return result;
  }
}

// 导出单例实例
export const aiProviderManager = new AiProviderManager();
