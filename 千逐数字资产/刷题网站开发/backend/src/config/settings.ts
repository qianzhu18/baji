import { logger } from '../utils/logger';

export interface SystemConfig {
  // 服务器配置
  server: {
    port: number;
    host: string;
    environment: 'development' | 'production' | 'test';
  };
  
  // 数据库配置
  database: {
    url: string;
    type: 'sqlite' | 'postgresql' | 'mysql';
  };
  
  // Redis配置
  redis: {
    url: string;
    host: string;
    port: number;
    password?: string;
  };
  
  // AI服务配置
  ai: {
    geminiApiKey?: string;
    provider: 'gemini' | 'openai' | 'mock';
    model: string;
    maxTokens: number;
    timeout: number;
  };
  
  // JWT配置
  jwt: {
    secret: string;
    expiresIn: string;
  };
  
  // 文件上传配置
  upload: {
    maxFileSize: number;
    allowedTypes: string[];
    uploadDir: string;
  };
  
  // 队列配置
  queue: {
    concurrency: number;
    retryAttempts: number;
    retryDelay: number;
  };
}

class ConfigManager {
  private static instance: ConfigManager;
  private config: SystemConfig;
  private isValidated: boolean = false;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 加载系统配置
   */
  private loadConfig(): SystemConfig {
    return {
      server: {
        port: parseInt(process.env.PORT || '3001'),
        host: process.env.HOST || 'localhost',
        environment: (process.env.NODE_ENV as any) || 'development',
      },
      
      database: {
        url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
        type: this.getDatabaseType(),
      },
      
      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      
      ai: {
        geminiApiKey: process.env.GEMINI_API_KEY,
        provider: (process.env.AI_PROVIDER as any) || 'gemini',
        model: process.env.AI_MODEL || 'gemini-pro',
        maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4096'),
        timeout: parseInt(process.env.AI_TIMEOUT || '30000'),
      },
      
      jwt: {
        secret: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      },
      
      upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
        allowedTypes: ['.txt', '.md', '.doc', '.docx', '.xls', '.xlsx', '.pdf', '.csv'],
        uploadDir: process.env.UPLOAD_DIR || './uploads',
      },
      
      queue: {
        concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5'),
        retryAttempts: parseInt(process.env.QUEUE_RETRY_ATTEMPTS || '3'),
        retryDelay: parseInt(process.env.QUEUE_RETRY_DELAY || '5000'),
      },
    };
  }

  /**
   * 获取数据库类型
   */
  private getDatabaseType(): 'sqlite' | 'postgresql' | 'mysql' {
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
      return 'postgresql';
    } else if (dbUrl.startsWith('mysql://')) {
      return 'mysql';
    }
    return 'sqlite';
  }

  /**
   * 验证配置
   */
  public async validateConfig(): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    logger.info('开始验证系统配置...');

    // 验证必需的配置
    if (!this.config.jwt.secret || this.config.jwt.secret === 'default-jwt-secret-change-in-production') {
      if (this.config.server.environment === 'production') {
        errors.push('生产环境必须设置 JWT_SECRET');
      } else {
        warnings.push('建议设置自定义的 JWT_SECRET');
      }
    }

    // 验证AI配置
    if (!this.config.ai.geminiApiKey) {
      if (this.config.ai.provider === 'gemini') {
        errors.push('使用Gemini AI需要设置 GEMINI_API_KEY');
      } else {
        warnings.push('未设置 GEMINI_API_KEY，AI功能将不可用');
      }
    }

    // 验证端口
    if (this.config.server.port < 1 || this.config.server.port > 65535) {
      errors.push(`无效的端口号: ${this.config.server.port}`);
    }

    // 验证文件大小限制
    if (this.config.upload.maxFileSize < 1024 * 1024) { // 小于1MB
      warnings.push('文件大小限制过小，可能影响用户体验');
    }

    // 验证队列配置
    if (this.config.queue.concurrency < 1) {
      errors.push('队列并发数必须大于0');
    }

    this.isValidated = errors.length === 0;

    logger.info('配置验证完成', {
      valid: this.isValidated,
      errors: errors.length,
      warnings: warnings.length,
    });

    return {
      valid: this.isValidated,
      errors,
      warnings,
    };
  }

  /**
   * 获取配置
   */
  public getConfig(): SystemConfig {
    return { ...this.config };
  }

  /**
   * 获取特定配置
   */
  public get<K extends keyof SystemConfig>(key: K): SystemConfig[K] {
    return this.config[key];
  }

  /**
   * 更新配置（仅用于测试）
   */
  public updateConfig(updates: Partial<SystemConfig>): void {
    if (this.config.server.environment === 'production') {
      throw new Error('生产环境不允许动态更新配置');
    }
    
    this.config = { ...this.config, ...updates };
    this.isValidated = false;
  }

  /**
   * 检查配置是否已验证
   */
  public isConfigValidated(): boolean {
    return this.isValidated;
  }

  /**
   * 生成配置报告
   */
  public generateConfigReport(): string {
    const report = [
      '=== 系统配置报告 ===',
      `环境: ${this.config.server.environment}`,
      `服务器: ${this.config.server.host}:${this.config.server.port}`,
      `数据库: ${this.config.database.type}`,
      `Redis: ${this.config.redis.host}:${this.config.redis.port}`,
      `AI提供商: ${this.config.ai.provider}`,
      `AI密钥: ${this.config.ai.geminiApiKey ? '已配置' : '未配置'}`,
      `文件上传限制: ${this.formatBytes(this.config.upload.maxFileSize)}`,
      `队列并发: ${this.config.queue.concurrency}`,
      `JWT过期时间: ${this.config.jwt.expiresIn}`,
      '==================',
    ];

    return report.join('\n');
  }

  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 导出环境变量模板
   */
  public generateEnvTemplate(): string {
    return `# 刷题网站系统配置
# 复制此文件为 .env 并填写相应的值

# 服务器配置
PORT=3001
HOST=localhost
NODE_ENV=development

# 数据库配置
DATABASE_URL="file:./prisma/dev.db"
# 生产环境使用 PostgreSQL:
# DATABASE_URL="postgresql://username:password@localhost:5432/quiz_system"

# Redis配置
REDIS_URL="redis://localhost:6379"
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=your_redis_password

# AI服务配置 (必需)
GEMINI_API_KEY=your_gemini_api_key_here
AI_PROVIDER=gemini
AI_MODEL=gemini-pro
AI_MAX_TOKENS=4096
AI_TIMEOUT=30000

# JWT配置
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# 文件上传配置
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# 队列配置
QUEUE_CONCURRENCY=5
QUEUE_RETRY_ATTEMPTS=3
QUEUE_RETRY_DELAY=5000

# 日志配置
LOG_LEVEL=info
`;
  }
}

// 导出单例实例
export const configManager = ConfigManager.getInstance();
export default configManager;
