"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteQuiz = exports.updateQuiz = exports.getQuiz = exports.getQuizzes = exports.createQuiz = void 0;
const Quiz_1 = require("@/models/Quiz");
const User_1 = require("@/models/User");
const logger_1 = require("@/utils/logger");
const ApiError_1 = require("@/utils/ApiError");
const createQuiz = async (req, res, next) => {
    try {
        const { title, description, content } = req.body;
        const userId = req.user._id;
        if (!title || !content) {
            return next(new ApiError_1.ApiError('题库标题和内容是必需的', 400));
        }
        const existingQuiz = await Quiz_1.Quiz.findOne({
            userId,
            title: title.trim()
        });
        if (existingQuiz) {
            return next(new ApiError_1.ApiError('您已有同名的题库，请使用不同的标题', 400));
        }
        const quiz = await Quiz_1.Quiz.create({
            title: title.trim(),
            description: description?.trim(),
            content: content.trim(),
            userId,
            status: 'draft',
            questions: [],
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
        logger_1.logger.info('题库创建成功', {
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
    }
    catch (error) {
        logger_1.logger.error('创建题库失败', error);
        next(error);
    }
};
exports.createQuiz = createQuiz;
const getQuizzes = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const query = { userId };
        if (status) {
            query.status = status;
        }
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        const [quizzes, total] = await Promise.all([
            Quiz_1.Quiz.find(query)
                .select('-content -questions')
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Quiz_1.Quiz.countDocuments(query)
        ]);
        const totalPages = Math.ceil(total / limitNum);
        logger_1.logger.info('获取题库列表成功', {
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
    }
    catch (error) {
        logger_1.logger.error('获取题库列表失败', error);
        next(error);
    }
};
exports.getQuizzes = getQuizzes;
const getQuiz = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const quiz = await Quiz_1.Quiz.findOne({
            _id: id,
            userId
        });
        if (!quiz) {
            return next(new ApiError_1.ApiError('题库不存在或您没有访问权限', 404));
        }
        logger_1.logger.info('获取题库详情成功', {
            quizId: quiz._id,
            userId
        });
        res.status(200).json({
            success: true,
            data: {
                quiz
            }
        });
    }
    catch (error) {
        logger_1.logger.error('获取题库详情失败', error);
        next(error);
    }
};
exports.getQuiz = getQuiz;
const updateQuiz = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, isPublic } = req.body;
        const userId = req.user._id;
        const quiz = await Quiz_1.Quiz.findOne({
            _id: id,
            userId
        });
        if (!quiz) {
            return next(new ApiError_1.ApiError('题库不存在或您没有访问权限', 404));
        }
        if (title && title.trim() !== quiz.title) {
            const existingQuiz = await Quiz_1.Quiz.findOne({
                userId,
                title: title.trim(),
                _id: { $ne: id }
            });
            if (existingQuiz) {
                return next(new ApiError_1.ApiError('您已有同名的题库，请使用不同的标题', 400));
            }
        }
        if (title)
            quiz.title = title.trim();
        if (description !== undefined)
            quiz.description = description?.trim();
        if (isPublic !== undefined)
            quiz.isPublic = isPublic;
        await quiz.save();
        logger_1.logger.info('题库更新成功', {
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
    }
    catch (error) {
        logger_1.logger.error('更新题库失败', error);
        next(error);
    }
};
exports.updateQuiz = updateQuiz;
const deleteQuiz = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const quiz = await Quiz_1.Quiz.findOne({
            _id: id,
            userId
        });
        if (!quiz) {
            return next(new ApiError_1.ApiError('题库不存在或您没有访问权限', 404));
        }
        await Quiz_1.Quiz.findByIdAndDelete(id);
        await User_1.User.findByIdAndUpdate(userId, {
            $inc: { 'stats.totalQuizzes': -1 }
        });
        logger_1.logger.info('题库删除成功', {
            quizId: id,
            userId,
            title: quiz.title
        });
        res.status(200).json({
            success: true,
            message: '题库删除成功'
        });
    }
    catch (error) {
        logger_1.logger.error('删除题库失败', error);
        next(error);
    }
};
exports.deleteQuiz = deleteQuiz;
//# sourceMappingURL=quizController.js.map