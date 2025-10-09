import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

// MongoDB模型定义
const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  avatar: String,
  role: String,
  createdAt: Date,
  updatedAt: Date,
});

const QuizSchema = new mongoose.Schema({
  title: String,
  description: String,
  html: String,
  status: String,
  userId: mongoose.Schema.Types.ObjectId,
  createdAt: Date,
  updatedAt: Date,
  errorMsg: String,
});

const JobSchema = new mongoose.Schema({
  type: String,
  status: String,
  progress: Number,
  data: mongoose.Schema.Types.Mixed,
  result: mongoose.Schema.Types.Mixed,
  error: String,
  userId: mongoose.Schema.Types.ObjectId,
  quizId: mongoose.Schema.Types.ObjectId,
  createdAt: Date,
  updatedAt: Date,
});

const MongoUser = mongoose.model('User', UserSchema);
const MongoQuiz = mongoose.model('Quiz', QuizSchema);
const MongoJob = mongoose.model('Job', JobSchema);

// ID映射表
interface IdMapping {
  mongoId: string;
  prismaId: string;
}

class DataMigrator {
  private prisma: PrismaClient;
  private userIdMap: Map<string, string> = new Map();
  private quizIdMap: Map<string, string> = new Map();
  private jobIdMap: Map<string, string> = new Map();

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * 执行完整的数据迁移
   */
  async migrate(): Promise<void> {
    try {
      logger.info('开始数据迁移...');

      // 1. 连接MongoDB
      await this.connectMongoDB();

      // 2. 验证源数据
      await this.validateSourceData();

      // 3. 清理目标数据库（可选）
      await this.cleanTargetDatabase();

      // 4. 迁移用户数据
      await this.migrateUsers();

      // 5. 迁移题库数据
      await this.migrateQuizzes();

      // 6. 迁移任务数据
      await this.migrateJobs();

      // 7. 验证迁移结果
      await this.validateMigration();

      logger.info('数据迁移完成！');

    } catch (error) {
      logger.error('数据迁移失败:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 连接MongoDB
   */
  private async connectMongoDB(): Promise<void> {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz-system';
    await mongoose.connect(mongoUri);
    logger.info('MongoDB连接成功');
  }

  /**
   * 验证源数据
   */
  private async validateSourceData(): Promise<void> {
    const userCount = await MongoUser.countDocuments();
    const quizCount = await MongoQuiz.countDocuments();
    const jobCount = await MongoJob.countDocuments();

    logger.info('源数据统计:', {
      users: userCount,
      quizzes: quizCount,
      jobs: jobCount,
    });

    if (userCount === 0) {
      logger.warn('未找到用户数据，跳过迁移');
      return;
    }
  }

  /**
   * 清理目标数据库
   */
  private async cleanTargetDatabase(): Promise<void> {
    logger.info('清理目标数据库...');
    
    await this.prisma.job.deleteMany();
    await this.prisma.quiz.deleteMany();
    await this.prisma.user.deleteMany();

    logger.info('目标数据库清理完成');
  }

  /**
   * 迁移用户数据
   */
  private async migrateUsers(): Promise<void> {
    logger.info('开始迁移用户数据...');

    const mongoUsers = await MongoUser.find().lean();
    let migratedCount = 0;

    for (const mongoUser of mongoUsers) {
      try {
        const prismaUserId = uuidv4();
        
        // 创建Prisma用户记录
        await this.prisma.user.create({
          data: {
            id: prismaUserId,
            email: mongoUser.email,
            password: mongoUser.password, // 密码已经是哈希值
            name: mongoUser.name || 'Unknown User',
            avatar: mongoUser.avatar || null,
            isActive: true,
            createdAt: mongoUser.createdAt || new Date(),
            updatedAt: mongoUser.updatedAt || new Date(),
          },
        });

        // 记录ID映射
        this.userIdMap.set(mongoUser._id.toString(), prismaUserId);
        migratedCount++;

        if (migratedCount % 100 === 0) {
          logger.info(`已迁移 ${migratedCount} 个用户`);
        }

      } catch (error) {
        logger.error(`用户迁移失败: ${mongoUser._id}`, error);
      }
    }

    logger.info(`用户数据迁移完成，共迁移 ${migratedCount} 个用户`);
  }

  /**
   * 迁移题库数据
   */
  private async migrateQuizzes(): Promise<void> {
    logger.info('开始迁移题库数据...');

    const mongoQuizzes = await MongoQuiz.find().lean();
    let migratedCount = 0;

    for (const mongoQuiz of mongoQuizzes) {
      try {
        const prismaQuizId = uuidv4();
        const prismaUserId = this.userIdMap.get(mongoQuiz.userId?.toString());

        if (!prismaUserId) {
          logger.warn(`题库 ${mongoQuiz._id} 的用户ID映射失败，跳过`);
          continue;
        }

        // 创建Prisma题库记录
        await this.prisma.quiz.create({
          data: {
            id: prismaQuizId,
            title: mongoQuiz.title || 'Untitled Quiz',
            description: mongoQuiz.description || null,
            html: mongoQuiz.html || null,
            status: this.mapQuizStatus(mongoQuiz.status),
            errorMsg: mongoQuiz.errorMsg || null,
            userId: prismaUserId,
            createdAt: mongoQuiz.createdAt || new Date(),
            updatedAt: mongoQuiz.updatedAt || new Date(),
          },
        });

        // 记录ID映射
        this.quizIdMap.set(mongoQuiz._id.toString(), prismaQuizId);
        migratedCount++;

        if (migratedCount % 50 === 0) {
          logger.info(`已迁移 ${migratedCount} 个题库`);
        }

      } catch (error) {
        logger.error(`题库迁移失败: ${mongoQuiz._id}`, error);
      }
    }

    logger.info(`题库数据迁移完成，共迁移 ${migratedCount} 个题库`);
  }

  /**
   * 迁移任务数据
   */
  private async migrateJobs(): Promise<void> {
    logger.info('开始迁移任务数据...');

    const mongoJobs = await MongoJob.find().lean();
    let migratedCount = 0;

    for (const mongoJob of mongoJobs) {
      try {
        const prismaJobId = uuidv4();
        const prismaUserId = this.userIdMap.get(mongoJob.userId?.toString());
        const prismaQuizId = mongoJob.quizId ? this.quizIdMap.get(mongoJob.quizId.toString()) : null;

        if (!prismaUserId) {
          logger.warn(`任务 ${mongoJob._id} 的用户ID映射失败，跳过`);
          continue;
        }

        // 创建Prisma任务记录
        await this.prisma.job.create({
          data: {
            id: prismaJobId,
            type: mongoJob.type || 'parse',
            status: this.mapJobStatus(mongoJob.status),
            progress: mongoJob.progress || 0,
            data: mongoJob.data || {},
            result: mongoJob.result || null,
            error: mongoJob.error || null,
            userId: prismaUserId,
            quizId: prismaQuizId,
            createdAt: mongoJob.createdAt || new Date(),
            updatedAt: mongoJob.updatedAt || new Date(),
          },
        });

        // 记录ID映射
        this.jobIdMap.set(mongoJob._id.toString(), prismaJobId);
        migratedCount++;

        if (migratedCount % 100 === 0) {
          logger.info(`已迁移 ${migratedCount} 个任务`);
        }

      } catch (error) {
        logger.error(`任务迁移失败: ${mongoJob._id}`, error);
      }
    }

    logger.info(`任务数据迁移完成，共迁移 ${migratedCount} 个任务`);
  }

  /**
   * 验证迁移结果
   */
  private async validateMigration(): Promise<void> {
    logger.info('验证迁移结果...');

    // 统计Prisma数据
    const prismaUserCount = await this.prisma.user.count();
    const prismaQuizCount = await this.prisma.quiz.count();
    const prismaJobCount = await this.prisma.job.count();

    // 统计MongoDB数据
    const mongoUserCount = await MongoUser.countDocuments();
    const mongoQuizCount = await MongoQuiz.countDocuments();
    const mongoJobCount = await MongoJob.countDocuments();

    logger.info('迁移结果对比:', {
      users: { mongo: mongoUserCount, prisma: prismaUserCount },
      quizzes: { mongo: mongoQuizCount, prisma: prismaQuizCount },
      jobs: { mongo: mongoJobCount, prisma: prismaJobCount },
    });

    // 验证关联关系
    await this.validateRelationships();
  }

  /**
   * 验证关联关系
   */
  private async validateRelationships(): Promise<void> {
    logger.info('验证关联关系...');

    // 验证题库-用户关联
    const orphanQuizzes = await this.prisma.quiz.count({
      where: { user: null }
    });

    // 验证任务-用户关联
    const orphanJobs = await this.prisma.job.count({
      where: { user: null }
    });

    if (orphanQuizzes > 0) {
      logger.warn(`发现 ${orphanQuizzes} 个孤立题库`);
    }

    if (orphanJobs > 0) {
      logger.warn(`发现 ${orphanJobs} 个孤立任务`);
    }

    logger.info('关联关系验证完成');
  }

  /**
   * 映射题库状态
   */
  private mapQuizStatus(mongoStatus: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'pending',
      'processing': 'processing',
      'completed': 'completed',
      'failed': 'failed',
    };

    return statusMap[mongoStatus] || 'pending';
  }

  /**
   * 映射任务状态
   */
  private mapJobStatus(mongoStatus: string): string {
    const statusMap: Record<string, string> = {
      'waiting': 'queued',
      'active': 'processing',
      'completed': 'completed',
      'failed': 'failed',
    };

    return statusMap[mongoStatus] || 'queued';
  }

  /**
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    await mongoose.disconnect();
    await this.prisma.$disconnect();
    logger.info('资源清理完成');
  }

  /**
   * 导出ID映射表
   */
  async exportIdMappings(): Promise<void> {
    const mappings = {
      users: Array.from(this.userIdMap.entries()).map(([mongoId, prismaId]) => ({ mongoId, prismaId })),
      quizzes: Array.from(this.quizIdMap.entries()).map(([mongoId, prismaId]) => ({ mongoId, prismaId })),
      jobs: Array.from(this.jobIdMap.entries()).map(([mongoId, prismaId]) => ({ mongoId, prismaId })),
    };

    const fs = await import('fs/promises');
    await fs.writeFile(
      './migration-mappings.json',
      JSON.stringify(mappings, null, 2)
    );

    logger.info('ID映射表已导出到 migration-mappings.json');
  }
}

// 执行迁移
async function runMigration() {
  const migrator = new DataMigrator();
  
  try {
    await migrator.migrate();
    await migrator.exportIdMappings();
    
    logger.info('🎉 数据迁移成功完成！');
    process.exit(0);
  } catch (error) {
    logger.error('❌ 数据迁移失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runMigration();
}

export { DataMigrator };
