"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const express_validator_1 = require("express-validator");
const ApiError_1 = require("@/utils/ApiError");
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((error) => {
            if (error.type === 'field') {
                return `${error.path}: ${error.msg}`;
            }
            return error.msg;
        });
        return next(new ApiError_1.ApiError(`验证失败: ${errorMessages.join(', ')}`, 400));
    }
    next();
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=validation.js.map