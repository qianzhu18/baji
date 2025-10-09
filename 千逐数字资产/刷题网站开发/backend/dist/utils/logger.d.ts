export declare enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3
}
declare class Logger {
    private logLevel;
    private logFile?;
    constructor();
    private getLogLevel;
    private ensureLogDirectory;
    private formatMessage;
    private writeLog;
    private getColorCode;
    error(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    info(message: string, data?: any): void;
    debug(message: string, data?: any): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map