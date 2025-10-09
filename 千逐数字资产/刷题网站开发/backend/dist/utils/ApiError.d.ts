export declare class ApiError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string, statusCode?: number);
}
export declare const createApiError: (message: string, statusCode?: number) => ApiError;
//# sourceMappingURL=ApiError.d.ts.map