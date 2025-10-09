"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPracticeHistory = exports.completePracticeSession = exports.updatePracticeSession = exports.createPracticeSession = void 0;
const PracticeSession_1 = require("@/models/PracticeSession");
const Quiz_1 = require("@/models/Quiz");
const User_1 = require("@/models/User");
const logger_1 = require("@/utils/logger");
const ApiError_1 = require("@/utils/ApiError");
const createPracticeSession = async (req, res, next) => {
    try {
        const { quizId, mode = 'sequential' } = req.body;
        const userId = req.user._id;
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
        const quiz = await Quiz_1.Quiz.findOne({
            _id: quizId,
            userId,
            status: 'completed'
        });
        if (!quiz) {
            return next(new ApiError_1.ApiError('题库不存在、未完成解析或您没有访问权限', 404));
        }
        if (quiz.questions.length === 0) {
            return next(new ApiError_1.ApiError('题库中没有题目，无法开始练习', 400));
        }
        const existingSession = await PracticeSession_1.PracticeSession.findOne({
            userId,
            quizId,
            status: { $in: ['active', 'paused'] }
        });
        if (existingSession) {
            return next(new ApiError_1.ApiError('您有未完成的练习会话，请先完成或放弃当前会话', 400));
        }
        let questionOrder = quiz.questions.map(q => q.id);
        if (mode === 'random') {
            questionOrder = shuffleArray([...questionOrder]);
        }
        const metadata = {
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip || req.connection.remoteAddress,
            deviceInfo: req.get('X-Device-Info')
        };
        const session = await PracticeSession_1.PracticeSession.create({
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
        logger_1.logger.info('练习会话创建成功', {
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
    }
    catch (error) {
        logger_1.logger.error('创建练习会话失败', error);
        next(error);
    }
};
exports.createPracticeSession = createPracticeSession;
const updatePracticeSession = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { currentQuestionIndex, answer, timeSpent, totalTimeSpent, pausedTime } = req.body;
        const userId = req.user._id;
        const session = await PracticeSession_1.PracticeSession.findOne({
            _id: id,
            userId,
            status: { $in: ['active', 'paused'] }
        });
        if (!session) {
            return next(new ApiError_1.ApiError('练习会话不存在或已结束', 404));
        }
        if (currentQuestionIndex !== undefined) {
            session.currentQuestionIndex = Math.max(0, Math.min(currentQuestionIndex, session.score.totalQuestions - 1));
        }
        if (answer) {
            const { questionId, userAnswer, isCorrect, attempts = 1 } = answer;
            const existingAnswerIndex = session.answers.findIndex(a => a.questionId === questionId);
            if (existingAnswerIndex >= 0) {
                session.answers[existingAnswerIndex] = {
                    questionId,
                    userAnswer,
                    isCorrect,
                    timeSpent: timeSpent || session.answers[existingAnswerIndex].timeSpent,
                    attempts: session.answers[existingAnswerIndex].attempts + 1
                };
            }
            else {
                session.answers.push({
                    questionId,
                    userAnswer,
                    isCorrect,
                    timeSpent: timeSpent || 0,
                    attempts
                });
            }
        }
        if (totalTimeSpent !== undefined) {
            session.totalTimeSpent = totalTimeSpent;
        }
        if (pausedTime !== undefined) {
            session.pausedTime = pausedTime;
        }
        await session.save();
        logger_1.logger.info('练习进度更新成功', {
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
    }
    catch (error) {
        logger_1.logger.error('更新练习进度失败', error);
        next(error);
    }
};
exports.updatePracticeSession = updatePracticeSession;
const completePracticeSession = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { totalTimeSpent, finalAnswers } = req.body;
        const userId = req.user._id;
        const session = await PracticeSession_1.PracticeSession.findOne({
            _id: id,
            userId,
            status: { $in: ['active', 'paused'] }
        }).populate('quizId', 'title');
        if (!session) {
            return next(new ApiError_1.ApiError('练习会话不存在或已结束', 404));
        }
        if (finalAnswers && Array.isArray(finalAnswers)) {
            session.answers = finalAnswers;
        }
        if (totalTimeSpent !== undefined) {
            session.totalTimeSpent = totalTimeSpent;
        }
        session.status = 'completed';
        session.completedAt = new Date();
        await session.save();
        await User_1.User.findByIdAndUpdate(userId, {
            $inc: {
                'stats.totalQuestions': session.score.answeredQuestions,
                'stats.correctAnswers': session.score.correctAnswers,
                'stats.studyTime': session.totalTimeSpent
            }
        });
        await Quiz_1.Quiz.findByIdAndUpdate(session.quizId, {
            $inc: { 'stats.totalPractices': 1 },
            $set: { 'metadata.lastPracticedAt': new Date() }
        });
        logger_1.logger.info('练习完成', {
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
    }
    catch (error) {
        logger_1.logger.error('完成练习失败', error);
        next(error);
    }
};
exports.completePracticeSession = completePracticeSession;
const getPracticeHistory = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10, quizId, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const query = { userId };
        if (quizId) {
            query.quizId = quizId;
        }
        if (status) {
            query.status = status;
        }
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        const [sessions, total] = await Promise.all([
            PracticeSession_1.PracticeSession.find(query)
                .populate('quizId', 'title description')
                .select('-answers -metadata')
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            PracticeSession_1.PracticeSession.countDocuments(query)
        ]);
        const totalPages = Math.ceil(total / limitNum);
        logger_1.logger.info('获取练习历史成功', {
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
    }
    catch (error) {
        logger_1.logger.error('获取练习历史失败', error);
        next(error);
    }
};
exports.getPracticeHistory = getPracticeHistory;
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
//# sourceMappingURL=practiceController.js.map