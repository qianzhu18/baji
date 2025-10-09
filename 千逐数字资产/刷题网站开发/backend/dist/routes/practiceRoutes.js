"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const practiceController_1 = require("@/controllers/practiceController");
const auth_1 = require("@/middleware/auth");
const validation_1 = require("@/middleware/validation");
const router = express_1.default.Router();
router.use(auth_1.protect);
const createSessionValidation = [
    (0, express_validator_1.body)('quizId')
        .isMongoId()
        .withMessage('无效的题库ID'),
    (0, express_validator_1.body)('mode')
        .optional()
        .isIn(['sequential', 'random'])
        .withMessage('练习模式必须是sequential或random'),
];
const updateSessionValidation = [
    (0, express_validator_1.param)('id')
        .isMongoId()
        .withMessage('无效的会话ID'),
    (0, express_validator_1.body)('currentQuestionIndex')
        .optional()
        .isInt({ min: 0 })
        .withMessage('当前题目索引必须是非负整数'),
    (0, express_validator_1.body)('answer')
        .optional()
        .isObject()
        .withMessage('答案必须是对象'),
    (0, express_validator_1.body)('answer.questionId')
        .if((0, express_validator_1.body)('answer').exists())
        .notEmpty()
        .withMessage('题目ID不能为空'),
    (0, express_validator_1.body)('answer.userAnswer')
        .if((0, express_validator_1.body)('answer').exists())
        .notEmpty()
        .withMessage('用户答案不能为空'),
    (0, express_validator_1.body)('answer.isCorrect')
        .if((0, express_validator_1.body)('answer').exists())
        .isBoolean()
        .withMessage('答案正确性必须是布尔值'),
    (0, express_validator_1.body)('timeSpent')
        .optional()
        .isInt({ min: 0 })
        .withMessage('答题时间必须是非负整数'),
    (0, express_validator_1.body)('totalTimeSpent')
        .optional()
        .isInt({ min: 0 })
        .withMessage('总用时必须是非负整数'),
    (0, express_validator_1.body)('pausedTime')
        .optional()
        .isInt({ min: 0 })
        .withMessage('暂停时间必须是非负整数'),
];
const completeSessionValidation = [
    (0, express_validator_1.param)('id')
        .isMongoId()
        .withMessage('无效的会话ID'),
    (0, express_validator_1.body)('totalTimeSpent')
        .optional()
        .isInt({ min: 0 })
        .withMessage('总用时必须是非负整数'),
    (0, express_validator_1.body)('finalAnswers')
        .optional()
        .isArray()
        .withMessage('最终答案必须是数组'),
    (0, express_validator_1.body)('finalAnswers.*.questionId')
        .if((0, express_validator_1.body)('finalAnswers').exists())
        .notEmpty()
        .withMessage('题目ID不能为空'),
    (0, express_validator_1.body)('finalAnswers.*.userAnswer')
        .if((0, express_validator_1.body)('finalAnswers').exists())
        .notEmpty()
        .withMessage('用户答案不能为空'),
    (0, express_validator_1.body)('finalAnswers.*.isCorrect')
        .if((0, express_validator_1.body)('finalAnswers').exists())
        .isBoolean()
        .withMessage('答案正确性必须是布尔值'),
    (0, express_validator_1.body)('finalAnswers.*.timeSpent')
        .if((0, express_validator_1.body)('finalAnswers').exists())
        .isInt({ min: 0 })
        .withMessage('答题时间必须是非负整数'),
];
const getHistoryValidation = [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('页码必须是大于0的整数'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('每页数量必须在1-100之间'),
    (0, express_validator_1.query)('quizId')
        .optional()
        .isMongoId()
        .withMessage('无效的题库ID'),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['active', 'paused', 'completed', 'abandoned'])
        .withMessage('状态值无效'),
    (0, express_validator_1.query)('sortBy')
        .optional()
        .isIn(['createdAt', 'completedAt', 'score.accuracy', 'totalTimeSpent'])
        .withMessage('排序字段无效'),
    (0, express_validator_1.query)('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('排序方向必须是asc或desc'),
];
router.post('/sessions', createSessionValidation, validation_1.validateRequest, practiceController_1.createPracticeSession);
router.put('/sessions/:id', updateSessionValidation, validation_1.validateRequest, practiceController_1.updatePracticeSession);
router.post('/sessions/:id/complete', completeSessionValidation, validation_1.validateRequest, practiceController_1.completePracticeSession);
router.get('/history', getHistoryValidation, validation_1.validateRequest, practiceController_1.getPracticeHistory);
exports.default = router;
//# sourceMappingURL=practiceRoutes.js.map