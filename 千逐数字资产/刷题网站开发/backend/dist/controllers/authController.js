"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.verifyEmail = exports.resetPassword = exports.forgotPassword = exports.logout = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const User_1 = require("@/models/User");
const logger_1 = require("@/utils/logger");
const ApiError_1 = require("@/utils/ApiError");
const emailService_1 = require("@/services/emailService");
const signToken = (id) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined');
    }
    return jsonwebtoken_1.default.sign({ id: id }, secret, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};
const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id.toString());
    const cookieOptions = {
        expires: new Date(Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRES_IN || '7') * 24 * 60 * 60 * 1000)),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    };
    res.cookie('jwt', token, cookieOptions);
    user.password = undefined;
    res.status(statusCode).json({
        success: true,
        message: statusCode === 201 ? '注册成功' : '登录成功',
        data: {
            token,
            user
        }
    });
};
const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User_1.User.findOne({ email });
        if (existingUser) {
            return next(new ApiError_1.ApiError('该邮箱已被注册', 400));
        }
        const user = await User_1.User.create({
            name,
            email,
            password,
            stats: {
                totalQuizzes: 0,
                totalQuestions: 0,
                correctAnswers: 0,
                studyTime: 0,
                joinDate: new Date()
            }
        });
        const verifyToken = user.generateEmailVerificationToken();
        await user.save({ validateBeforeSave: false });
        try {
            const verifyURL = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${verifyToken}`;
            await (0, emailService_1.sendEmail)({
                email: user.email,
                subject: '智能题库系统 - 邮箱验证',
                message: `请点击以下链接验证您的邮箱：\n\n${verifyURL}\n\n如果您没有注册账户，请忽略此邮件。`,
                html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="color: #333; text-align: center;">欢迎使用智能题库系统</h2>
            <p>感谢您注册我们的服务！请点击下面的按钮验证您的邮箱地址：</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyURL}" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">验证邮箱</a>
            </div>
            <p style="color: #666; font-size: 14px;">如果按钮无法点击，请复制以下链接到浏览器：</p>
            <p style="color: #666; font-size: 14px; word-break: break-all;">${verifyURL}</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">如果您没有注册账户，请忽略此邮件。</p>
          </div>
        `
            });
            logger_1.logger.info('注册成功，验证邮件已发送', { email: user.email });
        }
        catch (emailError) {
            logger_1.logger.error('发送验证邮件失败', emailError);
        }
        createSendToken(user, 201, res);
    }
    catch (error) {
        logger_1.logger.error('用户注册失败', error);
        next(error);
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new ApiError_1.ApiError('请提供邮箱和密码', 400));
        }
        if (process.env.NODE_ENV === 'development' && email === 'demo@example.com' && password === 'Demo123456') {
            const token = signToken('demo-user-id');
            res.status(200).json({
                success: true,
                message: '登录成功（演示模式）',
                data: {
                    token,
                    user: {
                        id: 'demo-user-id',
                        name: '演示用户',
                        email: 'demo@example.com',
                        role: 'user',
                        avatar: null
                    }
                }
            });
            return;
        }
        const user = await User_1.User.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return next(new ApiError_1.ApiError('邮箱或密码错误', 401));
        }
        user.lastLoginAt = new Date();
        await user.save({ validateBeforeSave: false });
        logger_1.logger.info('用户登录成功', { email: user.email });
        createSendToken(user, 200, res);
    }
    catch (error) {
        logger_1.logger.error('用户登录失败', error);
        next(error);
    }
};
exports.login = login;
const logout = (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.status(200).json({
        success: true,
        message: '登出成功'
    });
};
exports.logout = logout;
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User_1.User.findOne({ email });
        if (!user) {
            return next(new ApiError_1.ApiError('该邮箱未注册', 404));
        }
        const resetToken = user.generatePasswordResetToken();
        await user.save({ validateBeforeSave: false });
        try {
            const resetURL = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
            await (0, emailService_1.sendEmail)({
                email: user.email,
                subject: '智能题库系统 - 密码重置',
                message: `您的密码重置链接：\n\n${resetURL}\n\n此链接将在10分钟后失效。如果您没有请求重置密码，请忽略此邮件。`,
                html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="color: #333; text-align: center;">密码重置</h2>
            <p>您请求重置密码。请点击下面的按钮重置您的密码：</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetURL}" style="background-color: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">重置密码</a>
            </div>
            <p style="color: #666; font-size: 14px;">此链接将在10分钟后失效。</p>
            <p style="color: #666; font-size: 14px;">如果按钮无法点击，请复制以下链接到浏览器：</p>
            <p style="color: #666; font-size: 14px; word-break: break-all;">${resetURL}</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">如果您没有请求重置密码，请忽略此邮件。</p>
          </div>
        `
            });
            res.status(200).json({
                success: true,
                message: '密码重置链接已发送到您的邮箱'
            });
            logger_1.logger.info('密码重置邮件已发送', { email: user.email });
        }
        catch (emailError) {
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });
            logger_1.logger.error('发送密码重置邮件失败', emailError);
            return next(new ApiError_1.ApiError('发送邮件时出错，请稍后重试', 500));
        }
    }
    catch (error) {
        logger_1.logger.error('忘记密码处理失败', error);
        next(error);
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        const hashedToken = crypto_1.default
            .createHash('sha256')
            .update(token)
            .digest('hex');
        const user = await User_1.User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });
        if (!user) {
            return next(new ApiError_1.ApiError('令牌无效或已过期', 400));
        }
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        try {
            await (0, emailService_1.sendEmail)({
                email: user.email,
                subject: '智能题库系统 - 密码重置成功',
                message: '您的密码已成功重置。如果这不是您本人的操作，请立即联系客服。',
                html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="color: #10b981; text-align: center;">密码重置成功</h2>
            <p>您的密码已成功重置。</p>
            <p style="color: #666; font-size: 14px;">重置时间：${new Date().toLocaleString('zh-CN')}</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              如果这不是您本人的操作，请立即联系客服。
            </p>
          </div>
        `
            });
        }
        catch (emailError) {
            logger_1.logger.error('发送密码重置确认邮件失败', emailError);
        }
        logger_1.logger.info('密码重置成功', { email: user.email });
        createSendToken(user, 200, res);
    }
    catch (error) {
        logger_1.logger.error('密码重置失败', error);
        next(error);
    }
};
exports.resetPassword = resetPassword;
const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.params;
        const hashedToken = crypto_1.default
            .createHash('sha256')
            .update(token)
            .digest('hex');
        const user = await User_1.User.findOne({
            emailVerificationToken: hashedToken
        });
        if (!user) {
            return next(new ApiError_1.ApiError('验证令牌无效', 400));
        }
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        await user.save({ validateBeforeSave: false });
        logger_1.logger.info('邮箱验证成功', { email: user.email });
        res.status(200).json({
            success: true,
            message: '邮箱验证成功'
        });
    }
    catch (error) {
        logger_1.logger.error('邮箱验证失败', error);
        next(error);
    }
};
exports.verifyEmail = verifyEmail;
const getMe = async (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            user: req.user
        }
    });
};
exports.getMe = getMe;
//# sourceMappingURL=authController.js.map