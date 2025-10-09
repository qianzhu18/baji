import { logger } from '../utils/logger';
import { AiProviderFactory } from '../providers/AiProviderFactory';
import { configManager } from '../config/settings';

/**
 * 使用Gemini AI生成题库HTML
 * @param content 解析后的文本内容
 * @param orderMode 出题模式：'顺序' 或 '随机'
 * @returns 生成的HTML内容
 */
export async function generateQuizHTML(content: string, orderMode: '顺序' | '随机'): Promise<string> {
  try {
    logger.info('开始调用Gemini生成题库HTML', {
      contentLength: content.length,
      orderMode,
    });

    const config = configManager.get('ai');
    const factory = AiProviderFactory.getInstance();

    // 根据配置选择Provider
    let provider;
    if (config.geminiApiKey && config.provider === 'gemini') {
      provider = factory.createProvider('gemini', {
        apiKey: config.geminiApiKey,
        model: config.model,
        timeout: config.timeout
      });
    } else {
      // 降级到Mock Provider
      logger.warn('Gemini API key not configured, using mock provider');
      provider = factory.createProvider('mock', {
        apiKey: 'mock-key'
      });
    }

    const result = await provider.generateQuizHtml({
      content,
      orderMode
    });

    if (!result.success) {
      throw new Error(result.error || '题库生成失败');
    }

    logger.info('题库HTML生成成功', {
      provider: provider.name,
      htmlLength: result.html?.length || 0,
      metadata: result.metadata
    });

    return result.html || '';

  } catch (error) {
    logger.error('Gemini题库生成失败:', error);
    throw new Error(`题库生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}
