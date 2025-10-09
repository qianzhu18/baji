import { configManager } from '../config/settings';
import ConfigValidator from '../utils/configValidator';
import { logger } from '../utils/logger';
import * as readline from 'readline';
import * as fs from 'fs/promises';
import * as path from 'path';

class ConfigSetup {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * 执行配置设置向导
   */
  async runSetupWizard(): Promise<void> {
    console.log('🚀 刷题网站系统配置向导');
    console.log('========================');
    console.log('');

    try {
      // 1. 检查现有配置
      await this.checkExistingConfig();

      // 2. 验证当前配置
      await this.validateCurrentConfig();

      // 3. 交互式配置
      await this.interactiveConfig();

      // 4. 生成配置文件
      await this.generateConfigFiles();

      // 5. 最终验证
      await this.finalValidation();

      console.log('');
      console.log('🎉 配置设置完成！');
      console.log('');
      console.log('下一步：');
      console.log('1. 启动服务器: npm run dev:v2');
      console.log('2. 访问健康检查: http://localhost:3001/health');
      console.log('3. 查看API文档: http://localhost:3001/api');

    } catch (error) {
      console.error('❌ 配置设置失败:', error);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  /**
   * 检查现有配置
   */
  private async checkExistingConfig(): Promise<void> {
    console.log('📋 1. 检查现有配置...');

    const envPath = path.join(process.cwd(), '.env');
    
    try {
      await fs.access(envPath);
      console.log('✅ 找到现有的 .env 文件');
      
      const answer = await this.question('是否要重新配置？(y/N): ');
      if (answer.toLowerCase() !== 'y') {
        console.log('使用现有配置，跳转到验证步骤...');
        await this.validateCurrentConfig();
        return;
      }
    } catch {
      console.log('ℹ️ 未找到 .env 文件，将创建新的配置');
    }
  }

  /**
   * 验证当前配置
   */
  private async validateCurrentConfig(): Promise<void> {
    console.log('');
    console.log('🔍 2. 验证当前配置...');

    const validator = new ConfigValidator();
    const { success, results } = await validator.validateAll();

    if (success) {
      console.log('✅ 所有配置验证通过！');
      console.log('');
      console.log(validator.generateReport());
      
      const answer = await this.question('配置正常，是否继续设置向导？(y/N): ');
      if (answer.toLowerCase() !== 'y') {
        process.exit(0);
      }
    } else {
      console.log('❌ 配置验证发现问题：');
      console.log('');
      console.log(validator.generateReport());
      console.log('');
      console.log(validator.generateQuickFixGuide());
      console.log('');
      
      const answer = await this.question('是否通过向导修复这些问题？(Y/n): ');
      if (answer.toLowerCase() === 'n') {
        process.exit(1);
      }
    }
  }

  /**
   * 交互式配置
   */
  private async interactiveConfig(): Promise<void> {
    console.log('');
    console.log('⚙️ 3. 交互式配置...');
    console.log('');

    const config: Record<string, string> = {};

    // Gemini API密钥配置
    console.log('🤖 AI服务配置');
    console.log('-------------');
    
    const currentApiKey = process.env.GEMINI_API_KEY;
    if (currentApiKey) {
      console.log(`当前API密钥: ${currentApiKey.substring(0, 10)}...`);
      const keepKey = await this.question('保持当前API密钥？(Y/n): ');
      if (keepKey.toLowerCase() !== 'n') {
        config.GEMINI_API_KEY = currentApiKey;
      }
    }

    if (!config.GEMINI_API_KEY) {
      console.log('');
      console.log('📝 请输入Gemini API密钥：');
      console.log('   1. 访问 https://makersuite.google.com/app/apikey');
      console.log('   2. 创建新的API密钥');
      console.log('   3. 复制密钥并粘贴到下方');
      console.log('');
      
      const apiKey = await this.question('Gemini API密钥: ');
      if (!apiKey.trim()) {
        throw new Error('Gemini API密钥是必需的');
      }
      config.GEMINI_API_KEY = apiKey.trim();
    }

    // 服务器配置
    console.log('');
    console.log('🌐 服务器配置');
    console.log('-------------');
    
    const port = await this.question(`服务器端口 (默认: 3001): `);
    if (port.trim()) {
      config.PORT = port.trim();
    }

    // JWT配置
    console.log('');
    console.log('🔐 安全配置');
    console.log('-------------');
    
    const jwtSecret = await this.question('JWT密钥 (留空自动生成): ');
    if (jwtSecret.trim()) {
      config.JWT_SECRET = jwtSecret.trim();
    } else {
      config.JWT_SECRET = this.generateSecureSecret();
      console.log('✅ 已生成安全的JWT密钥');
    }

    // 数据库配置
    console.log('');
    console.log('🗄️ 数据库配置');
    console.log('-------------');
    
    const dbChoice = await this.question('数据库类型 (1: SQLite, 2: PostgreSQL): ');
    if (dbChoice === '2') {
      const dbUrl = await this.question('PostgreSQL连接字符串: ');
      if (dbUrl.trim()) {
        config.DATABASE_URL = dbUrl.trim();
      }
    } else {
      console.log('✅ 使用SQLite数据库（默认）');
    }

    // Redis配置
    console.log('');
    console.log('📦 Redis配置');
    console.log('-------------');
    
    const redisUrl = await this.question('Redis连接字符串 (默认: redis://localhost:6379): ');
    if (redisUrl.trim()) {
      config.REDIS_URL = redisUrl.trim();
    }

    // 保存配置
    this.currentConfig = config;
  }

  private currentConfig: Record<string, string> = {};

  /**
   * 生成配置文件
   */
  private async generateConfigFiles(): Promise<void> {
    console.log('');
    console.log('📝 4. 生成配置文件...');

    // 生成 .env 文件
    const envContent = this.generateEnvContent();
    const envPath = path.join(process.cwd(), '.env');
    
    await fs.writeFile(envPath, envContent);
    console.log('✅ 已生成 .env 文件');

    // 生成 .env.example 文件
    const exampleContent = configManager.generateEnvTemplate();
    const examplePath = path.join(process.cwd(), '.env.example');
    
    await fs.writeFile(examplePath, exampleContent);
    console.log('✅ 已生成 .env.example 文件');

    // 生成配置说明文档
    const docContent = this.generateConfigDocumentation();
    const docPath = path.join(process.cwd(), 'CONFIG.md');
    
    await fs.writeFile(docPath, docContent);
    console.log('✅ 已生成 CONFIG.md 配置文档');
  }

  /**
   * 最终验证
   */
  private async finalValidation(): Promise<void> {
    console.log('');
    console.log('🔍 5. 最终验证...');

    // 重新加载配置
    delete require.cache[require.resolve('../config/settings')];
    
    const validator = new ConfigValidator();
    const { success, results } = await validator.validateAll();

    if (success) {
      console.log('✅ 所有配置验证通过！');
    } else {
      console.log('❌ 仍有配置问题：');
      console.log(validator.generateReport());
      throw new Error('配置验证失败');
    }
  }

  /**
   * 生成环境变量内容
   */
  private generateEnvContent(): string {
    const lines = [
      '# 刷题网站系统配置',
      '# 由配置向导自动生成',
      `# 生成时间: ${new Date().toISOString()}`,
      '',
    ];

    // 添加配置项
    const defaultConfig = {
      PORT: '3001',
      NODE_ENV: 'development',
      DATABASE_URL: 'file:./prisma/dev.db',
      REDIS_URL: 'redis://localhost:6379',
      AI_PROVIDER: 'gemini',
      AI_MODEL: 'gemini-pro',
      JWT_EXPIRES_IN: '7d',
      MAX_FILE_SIZE: '10485760',
      UPLOAD_DIR: './uploads',
      ...this.currentConfig,
    };

    Object.entries(defaultConfig).forEach(([key, value]) => {
      lines.push(`${key}=${value}`);
    });

    return lines.join('\n');
  }

  /**
   * 生成配置文档
   */
  private generateConfigDocumentation(): string {
    return `# 系统配置说明

## 快速开始

1. 确保已安装依赖：\`npm install\`
2. 配置Gemini API密钥（必需）
3. 启动服务器：\`npm run dev:v2\`

## 必需配置

### Gemini API密钥
\`\`\`
GEMINI_API_KEY=your_api_key_here
\`\`\`

获取API密钥：
1. 访问 https://makersuite.google.com/app/apikey
2. 创建新的API密钥
3. 复制并设置到环境变量

## 可选配置

### 服务器配置
- \`PORT\`: 服务器端口（默认：3001）
- \`HOST\`: 服务器主机（默认：localhost）
- \`NODE_ENV\`: 运行环境（development/production）

### 数据库配置
- \`DATABASE_URL\`: 数据库连接字符串
  - SQLite: \`file:./prisma/dev.db\`
  - PostgreSQL: \`postgresql://user:pass@host:port/db\`

### Redis配置
- \`REDIS_URL\`: Redis连接字符串（默认：redis://localhost:6379）

### 安全配置
- \`JWT_SECRET\`: JWT签名密钥（生产环境必需）
- \`JWT_EXPIRES_IN\`: JWT过期时间（默认：7d）

## 故障排除

### 常见问题

1. **API密钥无效**
   - 检查密钥是否正确
   - 确认API密钥有效且未过期

2. **数据库连接失败**
   - 检查数据库服务是否运行
   - 验证连接字符串格式

3. **Redis连接失败**
   - 确认Redis服务正在运行
   - 检查连接配置

### 配置验证

运行配置验证：
\`\`\`bash
npm run config:validate
\`\`\`

### 重新配置

运行配置向导：
\`\`\`bash
npm run config:setup
\`\`\`

## 生产环境部署

1. 设置安全的JWT密钥
2. 使用PostgreSQL数据库
3. 配置Redis集群
4. 设置环境变量而非.env文件
5. 启用HTTPS和安全头
`;
  }

  /**
   * 生成安全密钥
   */
  private generateSecureSecret(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * 询问用户输入
   */
  private question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }
}

// 执行配置设置
async function runConfigSetup() {
  const setup = new ConfigSetup();
  await setup.runSetupWizard();
}

// 如果直接运行此脚本
if (require.main === module) {
  runConfigSetup().catch(console.error);
}

export { ConfigSetup };
