"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiError = exports.ApiError = void 0;
class ApiError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApiError = ApiError;
const createApiError = (message, statusCode = 500) => {
    return new ApiError(message, statusCode);
};
exports.createApiError = createApiError;
//# sourceMappingURL=ApiError.js.map