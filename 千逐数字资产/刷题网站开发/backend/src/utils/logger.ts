import fs from 'fs';
import path from 'path';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
}

class Logger {
  private logLevel: LogLevel;
  private logFile?: string;

  constructor() {
    this.logLevel = this.getLogLevel();
    this.logFile = process.env.LOG_FILE;
    this.ensureLogDirectory();
  }

  private getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toLowerCase() || 'info';
    switch (level) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private ensureLogDirectory(): void {
    if (this.logFile) {
      const logDir = path.dirname(this.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(data && { data })
    };
    return JSON.stringify(logEntry);
  }

  private writeLog(level: string, message: string, data?: any): void {
    const formattedMessage = this.formatMessage(level, message, data);
    
    // 控制台输出
    if (process.env.NODE_ENV !== 'test') {
      const colorCode = this.getColorCode(level);
      console.log(`${colorCode}[${level.toUpperCase()}]${this.getColorCode('reset')} ${message}`, data || '');
    }

    // 文件输出
    if (this.logFile) {
      fs.appendFileSync(this.logFile, formattedMessage + '\n');
    }
  }

  private getColorCode(level: string): string {
    const colors: Record<string, string> = {
      error: '\x1b[31m',   // 红色
      warn: '\x1b[33m',    // 黄色
      info: '\x1b[36m',    // 青色
      debug: '\x1b[35m',   // 紫色
      reset: '\x1b[0m'     // 重置
    };
    return colors[level] || colors.reset;
  }

  error(message: string, data?: any): void {
    if (this.logLevel >= LogLevel.ERROR) {
      this.writeLog('error', message, data);
    }
  }

  warn(message: string, data?: any): void {
    if (this.logLevel >= LogLevel.WARN) {
      this.writeLog('warn', message, data);
    }
  }

  info(message: string, data?: any): void {
    if (this.logLevel >= LogLevel.INFO) {
      this.writeLog('info', message, data);
    }
  }

  debug(message: string, data?: any): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      this.writeLog('debug', message, data);
    }
  }
}

export const logger = new Logger();
