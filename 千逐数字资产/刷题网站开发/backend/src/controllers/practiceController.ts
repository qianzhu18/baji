import { Request, Response, NextFunction } from 'express';
import { PracticeSession, IPracticeSession } from '@/models/PracticeSession';
import { Quiz } from '@/models/Quiz';
import { User, IUser } from '@/models/User';
import { logger } from '@/utils/logger';
import { ApiError } from '@/utils/ApiError';

interface AuthRequest extends Request {
  user?: IUser;
}

/**
 * @desc    创建练习会话
 * @route   POST /api/practice/sessions
 * @access  Private
 */
export const createPracticeSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { quizId, mode = 'sequential' } = req.body;
    const userId = req.user!._id;

    // 演示模式：如果是演示用户，返回演示练习会话
    if (process.env.NODE_ENV === 'development' && userId.toString() === 'demo-user-id') {
      const demoSession = {
        _id: 'demo-session-' + Date.now(),
        userId: 'demo-user-id',
        quizId: quizId,
        mode: mode,
        status: 'active',
        currentQuestionIndex: 0,
        answers: {},
        startTime: new Date(),
        questions: [
          {
            id: 'demo-q1',
            type: 'multiple_choice',
            question: '什么是人工智能？',
            options: ['计算机科学的一个分支', '一种编程语言', '一种硬件设备', '一种网络协议'],
            answer: '计算机科学的一个分支'
          },
          {
            id: 'demo-q2',
            type: 'short_answer',
            question: 'JavaScript是什么类型的语言？',
            answer: '解释型语言'
          }
        ]
      };

      res.status(201).json({
        success: true,
        message: '练习会话创建成功（演示模式）',
        data: {
          sessionId: demoSession._id,
          session: demoSession
        }
      });
      return;
    }

    // 验证题库存在且属于用户
    const quiz = await Quiz.findOne({
      _id: quizId,
      userId,
      status: 'completed'
    });

    if (!quiz) {
      return next(new ApiError('题库不存在、未完成解析或您没有访问权限', 404));
    }

    if (quiz.questions.length === 0) {
      return next(new ApiError('题库中没有题目，无法开始练习', 400));
    }

    // 检查是否有未完成的练习会话
    const existingSession = await PracticeSession.findOne({
      userId,
      quizId,
      status: { $in: ['active', 'paused'] }
    });

    if (existingSession) {
      return next(new ApiError('您有未完成的练习会话，请先完成或放弃当前会话', 400));
    }

    // 生成题目顺序
    let questionOrder = quiz.questions.map(q => q.id);
    if (mode === 'random') {
      questionOrder = shuffleArray([...questionOrder]);
    }

    // 获取客户端信息
    const metadata = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress,
      deviceInfo: req.get('X-Device-Info')
    };

    // 创建练习会话
    const session = await PracticeSession.create({
      userId,
      quizId,
      mode,
      questionOrder,
      status: 'active',
      currentQuestionIndex: 0,
      answers: [],
      startedAt: new Date(),
      totalTimeSpent: 0,
      pausedTime: 0,
      score: {
        totalQuestions: quiz.questions.length,
        answeredQuestions: 0,
        correctAnswers: 0,
        accuracy: 0,
        averageTimePerQuestion: 0
      },
      metadata
    });

    logger.info('练习会话创建成功', { 
      sessionId: session._id,
      userId,
      quizId,
      mode,
      totalQuestions: quiz.questions.length
    });

    res.status(201).json({
      success: true,
      message: '练习会话创建成功',
      data: {
        session: {
          _id: session._id,
          quizId: session.quizId,
          mode: session.mode,
          questionOrder: session.questionOrder,
          currentQuestionIndex: session.currentQuestionIndex,
          score: session.score,
          startedAt: session.startedAt,
          status: session.status
        }
      }
    });
  } catch (error) {
    logger.error('创建练习会话失败', error);
    next(error);
  }
};

/**
 * @desc    更新练习进度
 * @route   PUT /api/practice/sessions/:id
 * @access  Private
 */
export const updatePracticeSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      currentQuestionIndex, 
      answer, 
      timeSpent,
      totalTimeSpent,
      pausedTime 
    } = req.body;
    const userId = req.user!._id;

    const session = await PracticeSession.findOne({ 
      _id: id, 
      userId,
      status: { $in: ['active', 'paused'] }
    });

    if (!session) {
      return next(new ApiError('练习会话不存在或已结束', 404));
    }

    // 更新当前题目索引
    if (currentQuestionIndex !== undefined) {
      session.currentQuestionIndex = Math.max(0, Math.min(currentQuestionIndex, session.score.totalQuestions - 1));
    }

    // 添加答案记录
    if (answer) {
      const { questionId, userAnswer, isCorrect, attempts = 1 } = answer;
      
      // 检查是否已经回答过这个题目
      const existingAnswerIndex = session.answers.findIndex(a => a.questionId === questionId);
      
      if (existingAnswerIndex >= 0) {
        // 更新现有答案
        session.answers[existingAnswerIndex] = {
          questionId,
          userAnswer,
          isCorrect,
          timeSpent: timeSpent || session.answers[existingAnswerIndex].timeSpent,
          attempts: session.answers[existingAnswerIndex].attempts + 1
        };
      } else {
        // 添加新答案
        session.answers.push({
          questionId,
          userAnswer,
          isCorrect,
          timeSpent: timeSpent || 0,
          attempts
        });
      }
    }

    // 更新时间统计
    if (totalTimeSpent !== undefined) {
      session.totalTimeSpent = totalTimeSpent;
    }
    if (pausedTime !== undefined) {
      session.pausedTime = pausedTime;
    }

    await session.save();

    logger.info('练习进度更新成功', { 
      sessionId: session._id,
      userId,
      currentQuestionIndex: session.currentQuestionIndex,
      answeredQuestions: session.score.answeredQuestions
    });

    res.status(200).json({
      success: true,
      message: '练习进度更新成功',
      data: {
        session: {
          _id: session._id,
          currentQuestionIndex: session.currentQuestionIndex,
          score: session.score,
          totalTimeSpent: session.totalTimeSpent,
          status: session.status
        }
      }
    });
  } catch (error) {
    logger.error('更新练习进度失败', error);
    next(error);
  }
};

/**
 * @desc    完成练习
 * @route   POST /api/practice/sessions/:id/complete
 * @access  Private
 */
export const completePracticeSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { totalTimeSpent, finalAnswers } = req.body;
    const userId = req.user!._id;

    const session = await PracticeSession.findOne({ 
      _id: id, 
      userId,
      status: { $in: ['active', 'paused'] }
    }).populate('quizId', 'title');

    if (!session) {
      return next(new ApiError('练习会话不存在或已结束', 404));
    }

    // 更新最终答案（如果提供）
    if (finalAnswers && Array.isArray(finalAnswers)) {
      session.answers = finalAnswers;
    }

    // 更新总用时
    if (totalTimeSpent !== undefined) {
      session.totalTimeSpent = totalTimeSpent;
    }

    // 完成练习
    session.status = 'completed';
    session.completedAt = new Date();
    await session.save();

    // 更新用户统计
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'stats.totalQuestions': session.score.answeredQuestions,
        'stats.correctAnswers': session.score.correctAnswers,
        'stats.studyTime': session.totalTimeSpent
      }
    });

    // 更新题库统计
    await Quiz.findByIdAndUpdate(session.quizId, {
      $inc: { 'stats.totalPractices': 1 },
      $set: { 'metadata.lastPracticedAt': new Date() }
    });

    logger.info('练习完成', { 
      sessionId: session._id,
      userId,
      quizId: session.quizId,
      score: session.score,
      totalTimeSpent: session.totalTimeSpent
    });

    res.status(200).json({
      success: true,
      message: '练习完成',
      data: {
        session: {
          _id: session._id,
          quizId: session.quizId,
          score: session.score,
          totalTimeSpent: session.totalTimeSpent,
          completedAt: session.completedAt,
          answers: session.answers
        }
      }
    });
  } catch (error) {
    logger.error('完成练习失败', error);
    next(error);
  }
};

/**
 * @desc    获取练习历史
 * @route   GET /api/practice/history
 * @access  Private
 */
export const getPracticeHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { 
      page = 1, 
      limit = 10, 
      quizId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // 构建查询条件
    const query: any = { userId };
    
    if (quizId) {
      query.quizId = quizId;
    }
    
    if (status) {
      query.status = status;
    }

    // 分页参数
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // 排序
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // 查询练习历史
    const [sessions, total] = await Promise.all([
      PracticeSession.find(query)
        .populate('quizId', 'title description')
        .select('-answers -metadata') // 不返回详细答案和元数据
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      PracticeSession.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    logger.info('获取练习历史成功', { 
      userId, 
      total, 
      page: pageNum,
      limit: limitNum 
    });

    res.status(200).json({
      success: true,
      data: {
        sessions,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    logger.error('获取练习历史失败', error);
    next(error);
  }
};

// 工具函数：数组随机排序
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
