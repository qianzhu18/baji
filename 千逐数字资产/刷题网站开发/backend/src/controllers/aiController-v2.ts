import { Request, Response } from 'express';
import { AiProviderFactory } from '../providers/AiProviderFactory';
import { configManager } from '../config/settings';
import { logger } from '../utils/logger';
import { AiProviderError, AI_ERROR_CODES } from '../interfaces/IAiProvider';
import { cacheService, CacheService } from '../services/cacheService';

export class AiController {
  private providerFactory: AiProviderFactory;

  constructor() {
    this.providerFactory = AiProviderFactory.getInstance();
  }

  /**
   * 验证Gemini API密钥（带缓存和降级）
   * GET /api/ai/validate-key
   */
  async validateGeminiKey(req: Request, res: Response): Promise<void> {
    try {
      const { apiKey } = req.query;
      const keyToValidate = (apiKey as string) || configManager.get('ai').geminiApiKey;

      if (!keyToValidate) {
        res.status(400).json({
          valid: false,
          reason: 'No API key provided',
          code: AI_ERROR_CODES.INVALID_API_KEY
        });
        return;
      }

      // 检查缓存的验证结果
      const cachedResult = await cacheService.getCachedValidationResult('gemini', keyToValidate);
      if (cachedResult) {
        res.json({
          ...cachedResult,
          cached: true,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // 检查是否处于降级模式
      const isDegraded = await cacheService.isDegradedMode('gemini');
      if (isDegraded) {
        const degradedInfo = await cacheService.getDegradedModeInfo('gemini');
        res.status(503).json({
          valid: false,
          reason: `Service temporarily degraded: ${degradedInfo?.reason || 'Unknown reason'}`,
          provider: 'gemini',
          degraded: true,
          degradedSince: degradedInfo?.timestamp,
          timestamp: new Date().toISOString()
        });
        return;
      }

      logger.info('Validating Gemini API key...');

      // 创建Gemini Provider进行验证
      const provider = this.providerFactory.createProvider('gemini', {
        apiKey: keyToValidate,
        timeout: 15000 // 验证时使用较短的超时时间
      });

      const result = await provider.validateKey(keyToValidate);

      if (result.valid) {
        logger.info('Gemini API key validation successful');

        // 缓存成功的验证结果（1小时）
        const successResult = {
          valid: true,
          provider: 'gemini',
          quota: result.quota
        };
        await cacheService.cacheValidationResult('gemini', keyToValidate, successResult, 3600);

        // 清除降级模式（如果存在）
        await cacheService.clearDegradedMode('gemini');

        res.json({
          ...successResult,
          timestamp: new Date().toISOString()
        });
      } else {
        logger.warn('Gemini API key validation failed:', result.reason);

        // 缓存失败的验证结果（较短时间，5分钟）
        const failureResult = {
          valid: false,
          reason: result.reason,
          provider: 'gemini'
        };
        await cacheService.cacheValidationResult('gemini', keyToValidate, failureResult, 300);

        res.status(401).json({
          ...failureResult,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error: any) {
      logger.error('Error validating Gemini API key:', error);

      let statusCode = 500;
      let errorCode: string = AI_ERROR_CODES.UNKNOWN_ERROR;
      let reason = 'Internal server error';
      let shouldDegrade = false;

      if (error instanceof AiProviderError) {
        errorCode = error.code;
        switch (error.code) {
          case AI_ERROR_CODES.INVALID_API_KEY:
            statusCode = 401;
            reason = 'API key is invalid or has been revoked';
            break;
          case AI_ERROR_CODES.QUOTA_EXCEEDED:
            statusCode = 429;
            reason = 'API quota exceeded';
            shouldDegrade = true; // 配额超限时启用降级
            break;
          case AI_ERROR_CODES.RATE_LIMITED:
            statusCode = 429;
            reason = 'Rate limit exceeded';
            shouldDegrade = true; // 限流时启用降级
            break;
          case AI_ERROR_CODES.TIMEOUT:
            statusCode = 408;
            reason = 'Request timeout';
            shouldDegrade = true; // 超时时启用降级
            break;
          case AI_ERROR_CODES.NETWORK_ERROR:
            statusCode = 503;
            reason = 'Network error';
            shouldDegrade = true; // 网络错误时启用降级
            break;
        }
        errorCode = error.code;
      }

      // 如果需要降级，设置降级模式
      if (shouldDegrade) {
        await cacheService.setDegradedMode('gemini', reason, 1800); // 30分钟降级
        logger.warn('AI服务进入降级模式', { provider: 'gemini', reason });
      }

      res.status(statusCode).json({
        valid: false,
        reason,
        code: errorCode,
        provider: 'gemini',
        timestamp: new Date().toISOString(),
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * 获取AI服务状态
   * GET /api/ai/status
   */
  async getAiStatus(req: Request, res: Response): Promise<void> {
    try {
      const config = configManager.get('ai');
      
      const status = {
        provider: config.provider,
        model: config.model,
        configured: !!config.geminiApiKey,
        supportedProviders: this.providerFactory.getSupportedTypes(),
        timestamp: new Date().toISOString()
      };

      // 如果配置了API密钥，检查健康状态
      if (config.geminiApiKey && config.provider === 'gemini') {
        try {
          const provider = this.providerFactory.createProvider('gemini', {
            apiKey: config.geminiApiKey,
            timeout: 10000
          });
          
          const healthy = await provider.healthCheck();
          (status as any).healthy = healthy;
          
          if (healthy) {
            const stats = await provider.getUsageStats();
            (status as any).usage = stats;
          }
        } catch (error) {
          logger.warn('Health check failed:', error);
          (status as any).healthy = false;
        }
      }

      res.json(status);

    } catch (error: any) {
      logger.error('Error getting AI status:', error);
      res.status(500).json({
        error: 'Failed to get AI status',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 测试AI生成功能（带缓存）
   * POST /api/ai/test-generation
   */
  async testGeneration(req: Request, res: Response): Promise<void> {
    try {
      const { content, provider = 'gemini' } = req.body;

      if (!content) {
        res.status(400).json({
          success: false,
          error: 'Content is required for testing'
        });
        return;
      }

      // 生成内容哈希用于缓存
      const contentHash = CacheService.generateContentHash(content, { provider });

      // 检查缓存的生成结果
      const cachedResult = await cacheService.getCachedGenerationResult(contentHash);
      if (cachedResult) {
        res.json({
          ...cachedResult,
          cached: true,
          timestamp: new Date().toISOString()
        });
        return;
      }

      logger.info(`Testing AI generation with provider: ${provider}`);

      const config = configManager.get('ai');
      let providerInstance;

      if (provider === 'gemini' && config.geminiApiKey) {
        providerInstance = this.providerFactory.createProvider('gemini', {
          apiKey: config.geminiApiKey,
          timeout: 30000
        });
      } else {
        // 使用Mock Provider进行测试
        providerInstance = this.providerFactory.createProvider('mock', {
          apiKey: 'mock-key'
        });
      }

      const result = await providerInstance.generateQuizHtml({
        content,
        orderMode: '顺序'
      });

      if (result.success) {
        res.json({
          success: true,
          provider: providerInstance.name,
          metadata: result.metadata,
          htmlPreview: result.html?.substring(0, 500) + '...',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          provider: providerInstance.name,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error: any) {
      logger.error('Error testing AI generation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test AI generation',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 切换AI提供商
   * POST /api/ai/switch-provider
   */
  async switchProvider(req: Request, res: Response): Promise<void> {
    try {
      const { provider, apiKey } = req.body;

      if (!provider) {
        res.status(400).json({
          success: false,
          error: 'Provider type is required'
        });
        return;
      }

      const supportedTypes = this.providerFactory.getSupportedTypes();
      if (!supportedTypes.includes(provider)) {
        res.status(400).json({
          success: false,
          error: `Unsupported provider: ${provider}`,
          supportedProviders: supportedTypes
        });
        return;
      }

      // 验证新的Provider配置
      if (provider === 'gemini' && !apiKey) {
        res.status(400).json({
          success: false,
          error: 'API key is required for Gemini provider'
        });
        return;
      }

      // 测试新Provider
      const testProvider = this.providerFactory.createProvider(provider, {
        apiKey: apiKey || 'mock-key'
      });

      const isHealthy = await testProvider.healthCheck();
      
      if (!isHealthy && provider !== 'mock') {
        res.status(400).json({
          success: false,
          error: `Provider ${provider} health check failed`
        });
        return;
      }

      // 更新配置（仅在开发环境）
      if (process.env.NODE_ENV === 'development') {
        configManager.updateConfig({
          ai: {
            ...configManager.get('ai'),
            provider,
            geminiApiKey: provider === 'gemini' ? apiKey : configManager.get('ai').geminiApiKey
          }
        });
      }

      res.json({
        success: true,
        provider,
        healthy: isHealthy,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('Error switching provider:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to switch provider',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

export const aiController = new AiController();
