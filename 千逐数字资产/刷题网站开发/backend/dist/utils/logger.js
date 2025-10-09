"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor() {
        this.logLevel = this.getLogLevel();
        this.logFile = process.env.LOG_FILE;
        this.ensureLogDirectory();
    }
    getLogLevel() {
        const level = process.env.LOG_LEVEL?.toLowerCase() || 'info';
        switch (level) {
            case 'error': return LogLevel.ERROR;
            case 'warn': return LogLevel.WARN;
            case 'info': return LogLevel.INFO;
            case 'debug': return LogLevel.DEBUG;
            default: return LogLevel.INFO;
        }
    }
    ensureLogDirectory() {
        if (this.logFile) {
            const logDir = path_1.default.dirname(this.logFile);
            if (!fs_1.default.existsSync(logDir)) {
                fs_1.default.mkdirSync(logDir, { recursive: true });
            }
        }
    }
    formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            ...(data && { data })
        };
        return JSON.stringify(logEntry);
    }
    writeLog(level, message, data) {
        const formattedMessage = this.formatMessage(level, message, data);
        if (process.env.NODE_ENV !== 'test') {
            const colorCode = this.getColorCode(level);
            console.log(`${colorCode}[${level.toUpperCase()}]${this.getColorCode('reset')} ${message}`, data || '');
        }
        if (this.logFile) {
            fs_1.default.appendFileSync(this.logFile, formattedMessage + '\n');
        }
    }
    getColorCode(level) {
        const colors = {
            error: '\x1b[31m',
            warn: '\x1b[33m',
            info: '\x1b[36m',
            debug: '\x1b[35m',
            reset: '\x1b[0m'
        };
        return colors[level] || colors.reset;
    }
    error(message, data) {
        if (this.logLevel >= LogLevel.ERROR) {
            this.writeLog('error', message, data);
        }
    }
    warn(message, data) {
        if (this.logLevel >= LogLevel.WARN) {
            this.writeLog('warn', message, data);
        }
    }
    info(message, data) {
        if (this.logLevel >= LogLevel.INFO) {
            this.writeLog('info', message, data);
        }
    }
    debug(message, data) {
        if (this.logLevel >= LogLevel.DEBUG) {
            this.writeLog('debug', message, data);
        }
    }
}
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map