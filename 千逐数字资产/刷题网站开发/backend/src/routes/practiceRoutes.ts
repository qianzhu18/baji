/**
 * v1 API Routes (DEPRECATED)
 * 
 * ⚠️ 这些路由已被弃用，将在 2025-12-31 移除
 * 请迁移到 v2 API
 */
import express from 'express';
import { deprecateV1Api } from '../middleware/deprecation';
import { body, param, query } from 'express-validator';
import { deprecateV1Api } from '../middleware/deprecation';
import {
  createPracticeSession,
  updatePracticeSession,
  completePracticeSession,
  getPracticeHistory
} from '@/controllers/practiceController';
import { protect } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';

const router = express.Router();

// ⚠️ v1 API 已弃用 - 请迁移到 v2
router.use(deprecateV1Api);

// 所有路由都需要认证
router.use(protect);

// 验证规则
const createSessionValidation = [
  body('quizId')
    .isMongoId()
    .withMessage('无效的题库ID'),
  
  body('mode')
    .optional()
    .isIn(['sequential', 'random'])
    .withMessage('练习模式必须是sequential或random'),
];

const updateSessionValidation = [
  param('id')
    .isMongoId()
    .withMessage('无效的会话ID'),
  
  body('currentQuestionIndex')
    .optional()
    .isInt({ min: 0 })
    .withMessage('当前题目索引必须是非负整数'),
  
  body('answer')
    .optional()
    .isObject()
    .withMessage('答案必须是对象'),
  
  body('answer.questionId')
    .if(body('answer').exists())
    .notEmpty()
    .withMessage('题目ID不能为空'),
  
  body('answer.userAnswer')
    .if(body('answer').exists())
    .notEmpty()
    .withMessage('用户答案不能为空'),
  
  body('answer.isCorrect')
    .if(body('answer').exists())
    .isBoolean()
    .withMessage('答案正确性必须是布尔值'),
  
  body('timeSpent')
    .optional()
    .isInt({ min: 0 })
    .withMessage('答题时间必须是非负整数'),
  
  body('totalTimeSpent')
    .optional()
    .isInt({ min: 0 })
    .withMessage('总用时必须是非负整数'),
  
  body('pausedTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('暂停时间必须是非负整数'),
];

const completeSessionValidation = [
  param('id')
    .isMongoId()
    .withMessage('无效的会话ID'),
  
  body('totalTimeSpent')
    .optional()
    .isInt({ min: 0 })
    .withMessage('总用时必须是非负整数'),
  
  body('finalAnswers')
    .optional()
    .isArray()
    .withMessage('最终答案必须是数组'),
  
  body('finalAnswers.*.questionId')
    .if(body('finalAnswers').exists())
    .notEmpty()
    .withMessage('题目ID不能为空'),
  
  body('finalAnswers.*.userAnswer')
    .if(body('finalAnswers').exists())
    .notEmpty()
    .withMessage('用户答案不能为空'),
  
  body('finalAnswers.*.isCorrect')
    .if(body('finalAnswers').exists())
    .isBoolean()
    .withMessage('答案正确性必须是布尔值'),
  
  body('finalAnswers.*.timeSpent')
    .if(body('finalAnswers').exists())
    .isInt({ min: 0 })
    .withMessage('答题时间必须是非负整数'),
];

const getHistoryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是大于0的整数'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间'),
  
  query('quizId')
    .optional()
    .isMongoId()
    .withMessage('无效的题库ID'),
  
  query('status')
    .optional()
    .isIn(['active', 'paused', 'completed', 'abandoned'])
    .withMessage('状态值无效'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'completedAt', 'score.accuracy', 'totalTimeSpent'])
    .withMessage('排序字段无效'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('排序方向必须是asc或desc'),
];

// 路由定义
router.post('/sessions', createSessionValidation, validateRequest, createPracticeSession);
router.put('/sessions/:id', updateSessionValidation, validateRequest, updatePracticeSession);
router.post('/sessions/:id/complete', completeSessionValidation, validateRequest, completePracticeSession);
router.get('/history', getHistoryValidation, validateRequest, getPracticeHistory);

export default router;
