import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  statistics: {
    users: { mongo: number; prisma: number; match: boolean };
    quizzes: { mongo: number; prisma: number; match: boolean };
    jobs: { mongo: number; prisma: number; match: boolean };
  };
}

class MigrationValidator {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * 执行完整的迁移验证
   */
  async validate(): Promise<ValidationResult> {
    const result: ValidationResult = {
      success: true,
      errors: [],
      warnings: [],
      statistics: {
        users: { mongo: 0, prisma: 0, match: false },
        quizzes: { mongo: 0, prisma: 0, match: false },
        jobs: { mongo: 0, prisma: 0, match: false },
      },
    };

    try {
      logger.info('开始验证数据迁移结果...');

      // 1. 连接数据库
      await this.connectDatabases();

      // 2. 验证数据统计
      await this.validateStatistics(result);

      // 3. 验证数据完整性
      await this.validateDataIntegrity(result);

      // 4. 验证关联关系
      await this.validateRelationships(result);

      // 5. 验证业务逻辑
      await this.validateBusinessLogic(result);

      // 6. 性能基准测试
      await this.performanceBenchmark(result);

      result.success = result.errors.length === 0;

      logger.info('数据迁移验证完成', {
        success: result.success,
        errors: result.errors.length,
        warnings: result.warnings.length,
      });

    } catch (error) {
      result.success = false;
      result.errors.push(`验证过程异常: ${error instanceof Error ? error.message : '未知错误'}`);
      logger.error('验证过程异常:', error);
    } finally {
      await this.cleanup();
    }

    return result;
  }

  /**
   * 连接数据库
   */
  private async connectDatabases(): Promise<void> {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz-system';
    await mongoose.connect(mongoUri);
    logger.info('数据库连接成功');
  }

  /**
   * 验证数据统计
   */
  private async validateStatistics(result: ValidationResult): Promise<void> {
    logger.info('验证数据统计...');

    // MongoDB统计
    const mongoUserCount = await mongoose.connection.db.collection('users').countDocuments();
    const mongoQuizCount = await mongoose.connection.db.collection('quizzes').countDocuments();
    const mongoJobCount = await mongoose.connection.db.collection('jobs').countDocuments();

    // Prisma统计
    const prismaUserCount = await this.prisma.user.count();
    const prismaQuizCount = await this.prisma.quiz.count();
    const prismaJobCount = await this.prisma.job.count();

    // 更新统计信息
    result.statistics.users = {
      mongo: mongoUserCount,
      prisma: prismaUserCount,
      match: mongoUserCount === prismaUserCount,
    };

    result.statistics.quizzes = {
      mongo: mongoQuizCount,
      prisma: prismaQuizCount,
      match: mongoQuizCount === prismaQuizCount,
    };

    result.statistics.jobs = {
      mongo: mongoJobCount,
      prisma: prismaJobCount,
      match: mongoJobCount === prismaJobCount,
    };

    // 检查数据量匹配
    if (!result.statistics.users.match) {
      result.errors.push(`用户数据量不匹配: MongoDB(${mongoUserCount}) vs Prisma(${prismaUserCount})`);
    }

    if (!result.statistics.quizzes.match) {
      result.errors.push(`题库数据量不匹配: MongoDB(${mongoQuizCount}) vs Prisma(${prismaQuizCount})`);
    }

    if (!result.statistics.jobs.match) {
      result.warnings.push(`任务数据量不匹配: MongoDB(${mongoJobCount}) vs Prisma(${prismaJobCount})`);
    }

    logger.info('数据统计验证完成', result.statistics);
  }

  /**
   * 验证数据完整性
   */
  private async validateDataIntegrity(result: ValidationResult): Promise<void> {
    logger.info('验证数据完整性...');

    // 验证用户数据完整性
    await this.validateUserIntegrity(result);

    // 验证题库数据完整性
    await this.validateQuizIntegrity(result);

    // 验证任务数据完整性
    await this.validateJobIntegrity(result);
  }

  /**
   * 验证用户数据完整性
   */
  private async validateUserIntegrity(result: ValidationResult): Promise<void> {
    const users = await this.prisma.user.findMany();

    for (const user of users) {
      // 检查必填字段
      if (!user.email) {
        result.errors.push(`用户 ${user.id} 缺少邮箱`);
      }

      if (!user.password) {
        result.errors.push(`用户 ${user.id} 缺少密码`);
      }

      if (!user.name) {
        result.warnings.push(`用户 ${user.id} 缺少姓名`);
      }

      // 检查邮箱格式
      if (user.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
        result.errors.push(`用户 ${user.id} 邮箱格式无效: ${user.email}`);
      }

      // 检查密码哈希
      if (user.password && !user.password.startsWith('$2')) {
        result.warnings.push(`用户 ${user.id} 密码可能未正确哈希`);
      }
    }

    logger.info(`用户数据完整性验证完成，检查了 ${users.length} 个用户`);
  }

  /**
   * 验证题库数据完整性
   */
  private async validateQuizIntegrity(result: ValidationResult): Promise<void> {
    const quizzes = await this.prisma.quiz.findMany();

    for (const quiz of quizzes) {
      // 检查必填字段
      if (!quiz.title) {
        result.errors.push(`题库 ${quiz.id} 缺少标题`);
      }

      if (!quiz.userId) {
        result.errors.push(`题库 ${quiz.id} 缺少用户关联`);
      }

      // 检查状态值
      const validStatuses = ['pending', 'processing', 'completed', 'failed'];
      if (!validStatuses.includes(quiz.status)) {
        result.errors.push(`题库 ${quiz.id} 状态无效: ${quiz.status}`);
      }

      // 检查HTML内容（如果状态为completed）
      if (quiz.status === 'completed' && !quiz.html) {
        result.warnings.push(`题库 ${quiz.id} 状态为completed但缺少HTML内容`);
      }
    }

    logger.info(`题库数据完整性验证完成，检查了 ${quizzes.length} 个题库`);
  }

  /**
   * 验证任务数据完整性
   */
  private async validateJobIntegrity(result: ValidationResult): Promise<void> {
    const jobs = await this.prisma.job.findMany();

    for (const job of jobs) {
      // 检查必填字段
      if (!job.type) {
        result.errors.push(`任务 ${job.id} 缺少类型`);
      }

      if (!job.userId) {
        result.errors.push(`任务 ${job.id} 缺少用户关联`);
      }

      // 检查状态值
      const validStatuses = ['queued', 'processing', 'completed', 'failed'];
      if (!validStatuses.includes(job.status)) {
        result.errors.push(`任务 ${job.id} 状态无效: ${job.status}`);
      }

      // 检查进度值
      if (job.progress < 0 || job.progress > 100) {
        result.errors.push(`任务 ${job.id} 进度值无效: ${job.progress}`);
      }
    }

    logger.info(`任务数据完整性验证完成，检查了 ${jobs.length} 个任务`);
  }

  /**
   * 验证关联关系
   */
  private async validateRelationships(result: ValidationResult): Promise<void> {
    logger.info('验证关联关系...');

    // 验证题库-用户关联
    const orphanQuizzes = await this.prisma.quiz.count({
      where: { user: null }
    });

    if (orphanQuizzes > 0) {
      result.errors.push(`发现 ${orphanQuizzes} 个孤立题库（无用户关联）`);
    }

    // 验证任务-用户关联
    const orphanJobs = await this.prisma.job.count({
      where: { user: null }
    });

    if (orphanJobs > 0) {
      result.errors.push(`发现 ${orphanJobs} 个孤立任务（无用户关联）`);
    }

    // 验证任务-题库关联（可选）
    const jobsWithInvalidQuiz = await this.prisma.job.count({
      where: {
        quizId: { not: null },
        quiz: null
      }
    });

    if (jobsWithInvalidQuiz > 0) {
      result.errors.push(`发现 ${jobsWithInvalidQuiz} 个任务的题库关联无效`);
    }

    logger.info('关联关系验证完成');
  }

  /**
   * 验证业务逻辑
   */
  private async validateBusinessLogic(result: ValidationResult): Promise<void> {
    logger.info('验证业务逻辑...');

    // 验证邮箱唯一性
    const duplicateEmails = await this.prisma.user.groupBy({
      by: ['email'],
      having: {
        email: { _count: { gt: 1 } }
      },
      _count: { email: true }
    });

    if (duplicateEmails.length > 0) {
      result.errors.push(`发现 ${duplicateEmails.length} 个重复邮箱`);
    }

    // 验证用户至少有一个题库或任务
    const usersWithoutData = await this.prisma.user.count({
      where: {
        AND: [
          { quizzes: { none: {} } },
          { jobs: { none: {} } }
        ]
      }
    });

    if (usersWithoutData > 0) {
      result.warnings.push(`发现 ${usersWithoutData} 个用户没有任何题库或任务数据`);
    }

    logger.info('业务逻辑验证完成');
  }

  /**
   * 性能基准测试
   */
  private async performanceBenchmark(result: ValidationResult): Promise<void> {
    logger.info('执行性能基准测试...');

    const startTime = Date.now();

    // 测试常用查询性能
    await Promise.all([
      this.prisma.user.findMany({ take: 100 }),
      this.prisma.quiz.findMany({ 
        take: 100,
        include: { user: true }
      }),
      this.prisma.job.findMany({
        take: 100,
        include: { user: true, quiz: true }
      })
    ]);

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (duration > 5000) { // 超过5秒
      result.warnings.push(`查询性能较慢: ${duration}ms`);
    }

    logger.info(`性能基准测试完成，耗时: ${duration}ms`);
  }

  /**
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    await mongoose.disconnect();
    await this.prisma.$disconnect();
  }
}

// 执行验证
async function runValidation() {
  const validator = new MigrationValidator();
  
  try {
    const result = await validator.validate();
    
    // 输出验证结果
    console.log('\n=== 数据迁移验证结果 ===');
    console.log(`状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
    console.log(`错误数: ${result.errors.length}`);
    console.log(`警告数: ${result.warnings.length}`);
    
    console.log('\n=== 数据统计 ===');
    console.log(`用户: MongoDB(${result.statistics.users.mongo}) vs Prisma(${result.statistics.users.prisma}) - ${result.statistics.users.match ? '✅' : '❌'}`);
    console.log(`题库: MongoDB(${result.statistics.quizzes.mongo}) vs Prisma(${result.statistics.quizzes.prisma}) - ${result.statistics.quizzes.match ? '✅' : '❌'}`);
    console.log(`任务: MongoDB(${result.statistics.jobs.mongo}) vs Prisma(${result.statistics.jobs.prisma}) - ${result.statistics.jobs.match ? '✅' : '❌'}`);
    
    if (result.errors.length > 0) {
      console.log('\n=== 错误列表 ===');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    if (result.warnings.length > 0) {
      console.log('\n=== 警告列表 ===');
      result.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    }
    
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    logger.error('❌ 验证过程失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runValidation();
}

export { MigrationValidator };
