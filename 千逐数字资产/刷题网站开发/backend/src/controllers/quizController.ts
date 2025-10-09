import { Request, Response, NextFunction } from 'express';
import { Quiz, IQuiz } from '@/models/Quiz';
import { User, IUser } from '@/models/User';
import { logger } from '@/utils/logger';
import { ApiError } from '@/utils/ApiError';

interface AuthRequest extends Request {
  user?: IUser;
}

/**
 * @desc    创建题库
 * @route   POST /api/quizzes
 * @access  Private
 */
export const createQuiz = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, content } = req.body;
    const userId = req.user!._id;

    // 验证必需字段
    if (!title || !content) {
      return next(new ApiError('题库标题和内容是必需的', 400));
    }

    // 检查标题是否重复（同一用户）
    const existingQuiz = await Quiz.findOne({ 
      userId, 
      title: title.trim() 
    });

    if (existingQuiz) {
      return next(new ApiError('您已有同名的题库，请使用不同的标题', 400));
    }

    // 创建题库
    const quiz = await Quiz.create({
      title: title.trim(),
      description: description?.trim(),
      content: content.trim(),
      userId,
      status: 'draft',
      questions: [], // 初始为空，等待AI解析
      stats: {
        totalQuestions: 0,
        questionTypes: {
          multipleChoice: 0,
          shortAnswer: 0,
          trueFalse: 0,
          fillBlank: 0
        },
        totalPractices: 0
      },
      metadata: {
        uploadedAt: new Date()
      }
    });

    logger.info('题库创建成功', { 
      quizId: quiz._id, 
      userId, 
      title: quiz.title 
    });

    res.status(201).json({
      success: true,
      message: '题库创建成功',
      data: {
        quiz: {
          _id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          status: quiz.status,
          stats: quiz.stats,
          createdAt: quiz.createdAt,
          updatedAt: quiz.updatedAt
        }
      }
    });
  } catch (error) {
    logger.error('创建题库失败', error);
    next(error);
  }
};

/**
 * @desc    获取用户题库列表
 * @route   GET /api/quizzes
 * @access  Private
 */
export const getQuizzes = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { 
      page = 1, 
      limit = 10, 
      status, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // 构建查询条件
    const query: any = { userId };
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // 分页参数
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // 排序
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // 查询题库
    const [quizzes, total] = await Promise.all([
      Quiz.find(query)
        .select('-content -questions') // 不返回大字段
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Quiz.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    logger.info('获取题库列表成功', { 
      userId, 
      total, 
      page: pageNum,
      limit: limitNum 
    });

    res.status(200).json({
      success: true,
      data: {
        quizzes,
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
    logger.error('获取题库列表失败', error);
    next(error);
  }
};

/**
 * @desc    获取特定题库详情
 * @route   GET /api/quizzes/:id
 * @access  Private
 */
export const getQuiz = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

    const quiz = await Quiz.findOne({ 
      _id: id, 
      userId 
    });

    if (!quiz) {
      return next(new ApiError('题库不存在或您没有访问权限', 404));
    }

    logger.info('获取题库详情成功', { 
      quizId: quiz._id, 
      userId 
    });

    res.status(200).json({
      success: true,
      data: {
        quiz
      }
    });
  } catch (error) {
    logger.error('获取题库详情失败', error);
    next(error);
  }
};

/**
 * @desc    更新题库信息
 * @route   PUT /api/quizzes/:id
 * @access  Private
 */
export const updateQuiz = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, isPublic } = req.body;
    const userId = req.user!._id;

    const quiz = await Quiz.findOne({ 
      _id: id, 
      userId 
    });

    if (!quiz) {
      return next(new ApiError('题库不存在或您没有访问权限', 404));
    }

    // 如果更新标题，检查是否重复
    if (title && title.trim() !== quiz.title) {
      const existingQuiz = await Quiz.findOne({ 
        userId, 
        title: title.trim(),
        _id: { $ne: id }
      });

      if (existingQuiz) {
        return next(new ApiError('您已有同名的题库，请使用不同的标题', 400));
      }
    }

    // 更新字段
    if (title) quiz.title = title.trim();
    if (description !== undefined) quiz.description = description?.trim();
    if (isPublic !== undefined) quiz.isPublic = isPublic;

    await quiz.save();

    logger.info('题库更新成功', { 
      quizId: quiz._id, 
      userId 
    });

    res.status(200).json({
      success: true,
      message: '题库更新成功',
      data: {
        quiz: {
          _id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          isPublic: quiz.isPublic,
          status: quiz.status,
          stats: quiz.stats,
          updatedAt: quiz.updatedAt
        }
      }
    });
  } catch (error) {
    logger.error('更新题库失败', error);
    next(error);
  }
};

/**
 * @desc    删除题库
 * @route   DELETE /api/quizzes/:id
 * @access  Private
 */
export const deleteQuiz = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

    const quiz = await Quiz.findOne({
      _id: id,
      userId
    });

    if (!quiz) {
      return next(new ApiError('题库不存在或您没有访问权限', 404));
    }

    // 删除题库
    await Quiz.findByIdAndDelete(id);

    // 更新用户统计（减少题库数量）
    await User.findByIdAndUpdate(userId, {
      $inc: { 'stats.totalQuizzes': -1 }
    });

    logger.info('题库删除成功', {
      quizId: id,
      userId,
      title: quiz.title
    });

    res.status(200).json({
      success: true,
      message: '题库删除成功'
    });
  } catch (error) {
    logger.error('删除题库失败', error);
    next(error);
  }
};
