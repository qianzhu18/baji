import { redisClient } from '../config/queue';
import { logger } from '../utils/logger';

export class CacheService {
  private static instance: CacheService;
  private readonly defaultTTL = 3600; // 1小时

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * 缓存AI验证结果
   */
  async cacheValidationResult(provider: string, apiKey: string, result: any, ttl: number = 3600): Promise<void> {
    try {
      const key = this.getValidationKey(provider, apiKey);
      await redisClient.setex(key, ttl, JSON.stringify(result));
      logger.info('AI验证结果已缓存', { provider, ttl });
    } catch (error) {
      logger.error('缓存AI验证结果失败:', error);
    }
  }

  /**
   * 获取缓存的AI验证结果
   */
  async getCachedValidationResult(provider: string, apiKey: string): Promise<any | null> {
    try {
      const key = this.getValidationKey(provider, apiKey);
      const cached = await redisClient.get(key);
      if (cached) {
        logger.info('使用缓存的AI验证结果', { provider });
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      logger.error('获取缓存的AI验证结果失败:', error);
      return null;
    }
  }

  /**
   * 缓存AI生成结果
   */
  async cacheGenerationResult(contentHash: string, result: any, ttl: number = 7200): Promise<void> {
    try {
      const key = this.getGenerationKey(contentHash);
      await redisClient.setex(key, ttl, JSON.stringify(result));
      logger.info('AI生成结果已缓存', { contentHash: contentHash.substring(0, 8), ttl });
    } catch (error) {
      logger.error('缓存AI生成结果失败:', error);
    }
  }

  /**
   * 获取缓存的AI生成结果
   */
  async getCachedGenerationResult(contentHash: string): Promise<any | null> {
    try {
      const key = this.getGenerationKey(contentHash);
      const cached = await redisClient.get(key);
      if (cached) {
        logger.info('使用缓存的AI生成结果', { contentHash: contentHash.substring(0, 8) });
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      logger.error('获取缓存的AI生成结果失败:', error);
      return null;
    }
  }

  /**
   * 设置降级模式标记
   */
  async setDegradedMode(provider: string, reason: string, ttl: number = 1800): Promise<void> {
    try {
      const key = this.getDegradedKey(provider);
      const data = {
        reason,
        timestamp: new Date().toISOString(),
        provider
      };
      await redisClient.setex(key, ttl, JSON.stringify(data));
      logger.warn('AI服务进入降级模式', { provider, reason, ttl });
    } catch (error) {
      logger.error('设置降级模式失败:', error);
    }
  }

  /**
   * 检查是否处于降级模式
   */
  async isDegradedMode(provider: string): Promise<boolean> {
    try {
      const key = this.getDegradedKey(provider);
      const cached = await redisClient.get(key);
      return cached !== null;
    } catch (error) {
      logger.error('检查降级模式失败:', error);
      return false;
    }
  }

  /**
   * 获取降级模式信息
   */
  async getDegradedModeInfo(provider: string): Promise<any | null> {
    try {
      const key = this.getDegradedKey(provider);
      const cached = await redisClient.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      logger.error('获取降级模式信息失败:', error);
      return null;
    }
  }

  /**
   * 清除降级模式
   */
  async clearDegradedMode(provider: string): Promise<void> {
    try {
      const key = this.getDegradedKey(provider);
      await redisClient.del(key);
      logger.info('AI服务降级模式已清除', { provider });
    } catch (error) {
      logger.error('清除降级模式失败:', error);
    }
  }

  /**
   * 缓存API配额信息
   */
  async cacheQuotaInfo(provider: string, quotaInfo: any, ttl: number = 3600): Promise<void> {
    try {
      const key = this.getQuotaKey(provider);
      await redisClient.setex(key, ttl, JSON.stringify(quotaInfo));
      logger.info('API配额信息已缓存', { provider, ttl });
    } catch (error) {
      logger.error('缓存API配额信息失败:', error);
    }
  }

  /**
   * 获取缓存的API配额信息
   */
  async getCachedQuotaInfo(provider: string): Promise<any | null> {
    try {
      const key = this.getQuotaKey(provider);
      const cached = await redisClient.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      logger.error('获取缓存的API配额信息失败:', error);
      return null;
    }
  }

  /**
   * 清除所有缓存
   */
  async clearAllCache(): Promise<void> {
    try {
      const keys = await redisClient.keys('ai:*');
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info('所有AI缓存已清除', { count: keys.length });
      }
    } catch (error) {
      logger.error('清除缓存失败:', error);
    }
  }

  // 私有方法：生成缓存键
  private getValidationKey(provider: string, apiKey: string): string {
    const keyHash = this.hashApiKey(apiKey);
    return `ai:validation:${provider}:${keyHash}`;
  }

  private getGenerationKey(contentHash: string): string {
    return `ai:generation:${contentHash}`;
  }

  private getDegradedKey(provider: string): string {
    return `ai:degraded:${provider}`;
  }

  private getQuotaKey(provider: string): string {
    return `ai:quota:${provider}`;
  }

  private hashApiKey(apiKey: string): string {
    // 简单的哈希函数，用于保护API密钥
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
  }

  /**
   * 生成内容哈希
   */
  static generateContentHash(content: string, options?: any): string {
    const crypto = require('crypto');
    const data = JSON.stringify({ content, options });
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

export const cacheService = CacheService.getInstance();
