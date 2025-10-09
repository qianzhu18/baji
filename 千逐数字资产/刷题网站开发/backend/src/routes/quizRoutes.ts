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
  createQuiz,
  getQuizzes,
  getQuiz,
  updateQuiz,
  deleteQuiz
} from '@/controllers/quizController';
import { protect } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';

const router = express.Router();

// ⚠️ v1 API 已弃用 - 请迁移到 v2
router.use(deprecateV1Api);

// 所有路由都需要认证
router.use(protect);

// 验证规则
const createQuizValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('题库标题长度必须在1-200个字符之间'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('题库描述不能超过1000个字符'),
  
  body('content')
    .trim()
    .isLength({ min: 10 })
    .withMessage('题库内容至少需要10个字符'),
];

const updateQuizValidation = [
  param('id')
    .isMongoId()
    .withMessage('无效的题库ID'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('题库标题长度必须在1-200个字符之间'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('题库描述不能超过1000个字符'),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic必须是布尔值'),
];

const getQuizValidation = [
  param('id')
    .isMongoId()
    .withMessage('无效的题库ID'),
];

const deleteQuizValidation = [
  param('id')
    .isMongoId()
    .withMessage('无效的题库ID'),
];

const getQuizzesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是大于0的整数'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间'),
  
  query('status')
    .optional()
    .isIn(['draft', 'processing', 'completed', 'failed'])
    .withMessage('状态值无效'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'title', 'stats.totalQuestions'])
    .withMessage('排序字段无效'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('排序方向必须是asc或desc'),
];

// 路由定义
router.route('/')
  .post(createQuizValidation, validateRequest, createQuiz)
  .get(getQuizzesValidation, validateRequest, getQuizzes);

router.route('/:id')
  .get(getQuizValidation, validateRequest, getQuiz)
  .put(updateQuizValidation, validateRequest, updateQuiz)
  .delete(deleteQuizValidation, validateRequest, deleteQuiz);

export default router;
