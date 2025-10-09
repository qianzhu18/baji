"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const multer_1 = __importDefault(require("multer"));
const aiController_1 = require("@/controllers/aiController");
const auth_1 = require("@/middleware/auth");
const validation_1 = require("@/middleware/validation");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/plain',
            'text/markdown',
            'application/pdf'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('不支持的文件格式'));
        }
    }
});
const validateApiKeyValidation = [
    (0, express_validator_1.body)('apiKey')
        .notEmpty()
        .withMessage('API密钥不能为空')
        .isLength({ min: 10 })
        .withMessage('API密钥格式无效'),
];
const parseQuizValidation = [
    (0, express_validator_1.body)('quizId')
        .isMongoId()
        .withMessage('无效的题库ID'),
    (0, express_validator_1.body)('apiKey')
        .notEmpty()
        .withMessage('API密钥不能为空')
        .isLength({ min: 10 })
        .withMessage('API密钥格式无效'),
];
const getParseStatusValidation = [
    (0, express_validator_1.param)('taskId')
        .notEmpty()
        .withMessage('任务ID不能为空')
        .isUUID()
        .withMessage('任务ID格式无效'),
];
const reparseQuizValidation = [
    (0, express_validator_1.body)('quizId')
        .isMongoId()
        .withMessage('无效的题库ID'),
    (0, express_validator_1.body)('apiKey')
        .notEmpty()
        .withMessage('API密钥不能为空')
        .isLength({ min: 10 })
        .withMessage('API密钥格式无效'),
];
const convertQuizValidation = [
    (0, express_validator_1.body)('order')
        .isIn(['顺序', '随机'])
        .withMessage('出题顺序必须是"顺序"或"随机"'),
    (0, express_validator_1.body)('apiKey')
        .notEmpty()
        .withMessage('API密钥不能为空')
        .isLength({ min: 10 })
        .withMessage('API密钥格式无效'),
];
router.post('/validate-key', auth_1.protect, validateApiKeyValidation, validation_1.validateRequest, aiController_1.validateApiKey);
router.post('/parse-quiz', auth_1.protect, parseQuizValidation, validation_1.validateRequest, aiController_1.parseQuiz);
router.get('/parse-status/:taskId', auth_1.protect, getParseStatusValidation, validation_1.validateRequest, aiController_1.getParseStatus);
router.post('/reparse-quiz', auth_1.protect, reparseQuizValidation, validation_1.validateRequest, aiController_1.reparseQuiz);
router.post('/convert-quiz', upload.single('file'), convertQuizValidation, validation_1.validateRequest, aiController_1.convertQuiz);
router.get('/convert-status/:taskId', getParseStatusValidation, validation_1.validateRequest, aiController_1.getConvertStatus);
exports.default = router;
//# sourceMappingURL=aiRoutes.js.map