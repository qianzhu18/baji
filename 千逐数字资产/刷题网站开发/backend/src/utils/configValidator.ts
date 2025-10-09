import { configManager } from '../config/settings';
import { logger } from './logger';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

export interface ValidationResult {
  component: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
  solution?: string;
}

export class ConfigValidator {
  private results: ValidationResult[] = [];

  /**
   * 执行完整的配置验证
   */
  async validateAll(): Promise<{ success: boolean; results: ValidationResult[] }> {
    this.results = [];
    
    logger.info('开始系统配置验证...');

    // 1. 基础配置验证
    await this.validateBasicConfig();

    // 2. 数据库连接验证
    await this.validateDatabase();

    // 3. Redis连接验证
    await this.validateRedis();

    // 4. AI服务验证
    await this.validateAIService();

    // 5. 文件系统验证
    await this.validateFileSystem();

    const hasErrors = this.results.some(r => r.status === 'error');
    const success = !hasErrors;

    logger.info('配置验证完成', {
      success,
      total: this.results.length,
      errors: this.results.filter(r => r.status === 'error').length,
      warnings: this.results.filter(r => r.status === 'warning').length,
    });

    return { success, results: this.results };
  }

  /**
   * 验证基础配置
   */
  private async validateBasicConfig(): Promise<void> {
    const config = configManager.getConfig();

    // JWT密钥验证
    if (!config.jwt.secret || config.jwt.secret === 'default-jwt-secret-change-in-production') {
      if (config.server.environment === 'production') {
        this.addResult({
          component: 'JWT配置',
          status: 'error',
          message: 'JWT密钥未设置或使用默认值',
          details: '生产环境必须设置安全的JWT密钥',
          solution: '设置环境变量 JWT_SECRET=your_secure_secret_key',
        });
      } else {
        this.addResult({
          component: 'JWT配置',
          status: 'warning',
          message: '使用默认JWT密钥',
          details: '建议设置自定义的JWT密钥以提高安全性',
          solution: '设置环境变量 JWT_SECRET=your_secure_secret_key',
        });
      }
    } else {
      this.addResult({
        component: 'JWT配置',
        status: 'success',
        message: 'JWT密钥配置正确',
      });
    }

    // 端口验证
    if (config.server.port < 1 || config.server.port > 65535) {
      this.addResult({
        component: '服务器配置',
        status: 'error',
        message: `无效的端口号: ${config.server.port}`,
        solution: '设置有效的端口号 (1-65535)',
      });
    } else {
      this.addResult({
        component: '服务器配置',
        status: 'success',
        message: `服务器端口配置正确: ${config.server.port}`,
      });
    }
  }

  /**
   * 验证数据库连接
   */
  private async validateDatabase(): Promise<void> {
    try {
      const prisma = new PrismaClient();
      await prisma.$connect();
      await prisma.$disconnect();

      this.addResult({
        component: '数据库连接',
        status: 'success',
        message: '数据库连接正常',
      });
    } catch (error) {
      this.addResult({
        component: '数据库连接',
        status: 'error',
        message: '数据库连接失败',
        details: error instanceof Error ? error.message : '未知错误',
        solution: '检查 DATABASE_URL 配置，确保数据库服务正在运行',
      });
    }
  }

  /**
   * 验证Redis连接
   */
  private async validateRedis(): Promise<void> {
    let redis: Redis | null = null;
    
    try {
      const config = configManager.get('redis');
      redis = new Redis({
        host: config.host,
        port: config.port,
        password: config.password,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });

      await redis.connect();
      await redis.ping();

      this.addResult({
        component: 'Redis连接',
        status: 'success',
        message: 'Redis连接正常',
      });
    } catch (error) {
      this.addResult({
        component: 'Redis连接',
        status: 'error',
        message: 'Redis连接失败',
        details: error instanceof Error ? error.message : '未知错误',
        solution: '检查Redis服务是否运行，验证连接配置',
      });
    } finally {
      if (redis) {
        await redis.disconnect();
      }
    }
  }

  /**
   * 验证AI服务
   */
  private async validateAIService(): Promise<void> {
    const config = configManager.get('ai');

    if (!config.geminiApiKey) {
      this.addResult({
        component: 'AI服务配置',
        status: 'error',
        message: 'Gemini API密钥未配置',
        details: 'AI功能需要有效的Gemini API密钥',
        solution: '设置环境变量 GEMINI_API_KEY=your_api_key',
      });
      return;
    }

    try {
      const genAI = new GoogleGenerativeAI(config.geminiApiKey);
      const model = genAI.getGenerativeModel({ model: config.model });
      
      // 发送测试请求
      const result = await model.generateContent('测试连接');
      const response = await result.response;
      
      if (response.text()) {
        this.addResult({
          component: 'AI服务连接',
          status: 'success',
          message: 'Gemini AI服务连接正常',
        });
      } else {
        throw new Error('API响应为空');
      }
    } catch (error) {
      let message = 'Gemini AI服务连接失败';
      let solution = '检查API密钥是否正确，确保网络连接正常';

      if (error instanceof Error) {
        if (error.message.includes('API key not valid')) {
          message = 'Gemini API密钥无效';
          solution = '请检查并更新 GEMINI_API_KEY 环境变量';
        } else if (error.message.includes('quota')) {
          message = 'Gemini API配额不足';
          solution = '检查API使用配额或升级账户';
        }
      }

      this.addResult({
        component: 'AI服务连接',
        status: 'error',
        message,
        details: error instanceof Error ? error.message : '未知错误',
        solution,
      });
    }
  }

  /**
   * 验证文件系统
   */
  private async validateFileSystem(): Promise<void> {
    const config = configManager.get('upload');
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      // 检查上传目录
      const uploadDir = path.resolve(config.uploadDir);
      
      try {
        await fs.access(uploadDir);
      } catch {
        // 目录不存在，尝试创建
        await fs.mkdir(uploadDir, { recursive: true });
      }

      // 测试写入权限
      const testFile = path.join(uploadDir, '.test-write-permission');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);

      this.addResult({
        component: '文件系统',
        status: 'success',
        message: '文件上传目录配置正确',
        details: `上传目录: ${uploadDir}`,
      });
    } catch (error) {
      this.addResult({
        component: '文件系统',
        status: 'error',
        message: '文件上传目录配置失败',
        details: error instanceof Error ? error.message : '未知错误',
        solution: '检查上传目录权限，确保应用有读写权限',
      });
    }
  }

  /**
   * 添加验证结果
   */
  private addResult(result: ValidationResult): void {
    this.results.push(result);
    
    const level = result.status === 'error' ? 'error' : 
                  result.status === 'warning' ? 'warn' : 'info';
    
    logger[level](`配置验证 - ${result.component}`, {
      status: result.status,
      message: result.message,
      details: result.details,
    });
  }

  /**
   * 生成配置报告
   */
  generateReport(): string {
    const report = ['=== 系统配置验证报告 ==='];
    
    const successCount = this.results.filter(r => r.status === 'success').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;
    const errorCount = this.results.filter(r => r.status === 'error').length;

    report.push(`总计: ${this.results.length} 项检查`);
    report.push(`✅ 成功: ${successCount}`);
    report.push(`⚠️ 警告: ${warningCount}`);
    report.push(`❌ 错误: ${errorCount}`);
    report.push('');

    // 按状态分组显示结果
    const errorResults = this.results.filter(r => r.status === 'error');
    if (errorResults.length > 0) {
      report.push('🚨 错误项目:');
      errorResults.forEach(result => {
        report.push(`  ❌ ${result.component}: ${result.message}`);
        if (result.details) {
          report.push(`     详情: ${result.details}`);
        }
        if (result.solution) {
          report.push(`     解决方案: ${result.solution}`);
        }
        report.push('');
      });
    }

    const warningResults = this.results.filter(r => r.status === 'warning');
    if (warningResults.length > 0) {
      report.push('⚠️ 警告项目:');
      warningResults.forEach(result => {
        report.push(`  ⚠️ ${result.component}: ${result.message}`);
        if (result.solution) {
          report.push(`     建议: ${result.solution}`);
        }
        report.push('');
      });
    }

    const successResults = this.results.filter(r => r.status === 'success');
    if (successResults.length > 0) {
      report.push('✅ 正常项目:');
      successResults.forEach(result => {
        report.push(`  ✅ ${result.component}: ${result.message}`);
      });
    }

    report.push('========================');
    
    return report.join('\n');
  }

  /**
   * 生成快速修复指南
   */
  generateQuickFixGuide(): string {
    const errorResults = this.results.filter(r => r.status === 'error' && r.solution);
    
    if (errorResults.length === 0) {
      return '🎉 所有配置都正常，无需修复！';
    }

    const guide = [
      '🔧 快速修复指南',
      '================',
      '',
      '请按照以下步骤修复配置问题：',
      '',
    ];

    errorResults.forEach((result, index) => {
      guide.push(`${index + 1}. ${result.component}`);
      guide.push(`   问题: ${result.message}`);
      guide.push(`   解决: ${result.solution}`);
      guide.push('');
    });

    guide.push('修复完成后，重新启动服务器以验证配置。');
    
    return guide.join('\n');
  }
}

export default ConfigValidator;
