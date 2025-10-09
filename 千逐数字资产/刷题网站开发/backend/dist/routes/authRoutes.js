"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const router = express_1.default.Router();
const registerValidation = [
    (0, express_validator_1.body)('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('用户名长度必须在2-50个字符之间')
        .matches(/^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/)
        .withMessage('用户名只能包含字母、数字、中文、下划线和连字符'),
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('请输入有效的邮箱地址')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .isLength({ min: 6, max: 128 })
        .withMessage('密码长度必须在6-128个字符之间')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('密码必须包含至少一个小写字母、一个大写字母和一个数字'),
];
const loginValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('请输入有效的邮箱地址')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('密码不能为空'),
];
const forgotPasswordValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('请输入有效的邮箱地址')
        .normalizeEmail(),
];
const resetPasswordValidation = [
    (0, express_validator_1.body)('password')
        .isLength({ min: 6, max: 128 })
        .withMessage('密码长度必须在6-128个字符之间')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('密码必须包含至少一个小写字母、一个大写字母和一个数字'),
];
router.post('/register', registerValidation, validation_1.validateRequest, authController_1.register);
router.post('/login', loginValidation, validation_1.validateRequest, authController_1.login);
router.post('/forgot-password', forgotPasswordValidation, validation_1.validateRequest, authController_1.forgotPassword);
router.patch('/reset-password/:token', resetPasswordValidation, validation_1.validateRequest, authController_1.resetPassword);
router.get('/verify-email/:token', authController_1.verifyEmail);
router.post('/logout', authController_1.logout);
router.get('/me', auth_1.protect, authController_1.getMe);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map