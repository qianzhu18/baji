"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const quizController_1 = require("@/controllers/quizController");
const auth_1 = require("@/middleware/auth");
const validation_1 = require("@/middleware/validation");
const router = express_1.default.Router();
router.use(auth_1.protect);
const createQuizValidation = [
    (0, express_validator_1.body)('title')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('题库标题长度必须在1-200个字符之间'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('题库描述不能超过1000个字符'),
    (0, express_validator_1.body)('content')
        .trim()
        .isLength({ min: 10 })
        .withMessage('题库内容至少需要10个字符'),
];
const updateQuizValidation = [
    (0, express_validator_1.param)('id')
        .isMongoId()
        .withMessage('无效的题库ID'),
    (0, express_validator_1.body)('title')
        .optional()
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('题库标题长度必须在1-200个字符之间'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('题库描述不能超过1000个字符'),
    (0, express_validator_1.body)('isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic必须是布尔值'),
];
const getQuizValidation = [
    (0, express_validator_1.param)('id')
        .isMongoId()
        .withMessage('无效的题库ID'),
];
const deleteQuizValidation = [
    (0, express_validator_1.param)('id')
        .isMongoId()
        .withMessage('无效的题库ID'),
];
const getQuizzesValidation = [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('页码必须是大于0的整数'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('每页数量必须在1-100之间'),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['draft', 'processing', 'completed', 'failed'])
        .withMessage('状态值无效'),
    (0, express_validator_1.query)('sortBy')
        .optional()
        .isIn(['createdAt', 'updatedAt', 'title', 'stats.totalQuestions'])
        .withMessage('排序字段无效'),
    (0, express_validator_1.query)('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('排序方向必须是asc或desc'),
];
router.route('/')
    .post(createQuizValidation, validation_1.validateRequest, quizController_1.createQuiz)
    .get(getQuizzesValidation, validation_1.validateRequest, quizController_1.getQuizzes);
router.route('/:id')
    .get(getQuizValidation, validation_1.validateRequest, quizController_1.getQuiz)
    .put(updateQuizValidation, validation_1.validateRequest, quizController_1.updateQuiz)
    .delete(deleteQuizValidation, validation_1.validateRequest, quizController_1.deleteQuiz);
exports.default = router;
//# sourceMappingURL=quizRoutes.js.map