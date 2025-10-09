"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedFileParserService = void 0;
const mammoth_1 = __importDefault(require("mammoth"));
const XLSX = __importStar(require("xlsx"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const csv_parse_1 = require("csv-parse");
const buffer_1 = require("buffer");
const logger_1 = require("../utils/logger");
const performanceMonitor_1 = require("../utils/performanceMonitor");
class EnhancedFileParserService {
    async parseFile(fileBuffer, fileName, mimeType, options = {}) {
        const startTime = Date.now();
        try {
            this.validateFile(fileBuffer, fileName, options);
            const fileExtension = this.getFileExtension(fileName);
            const metadata = {
                fileName,
                fileType: fileExtension,
                fileSize: fileBuffer.length,
                wordCount: 0,
                encoding: options.encoding || 'utf-8',
                parseTime: 0,
            };
            let text = '';
            let rawData = null;
            switch (fileExtension.toLowerCase()) {
                case '.docx':
                case '.doc':
                    const docResult = await this.parseWordDocument(fileBuffer, options);
                    text = docResult.text;
                    rawData = docResult.rawData;
                    break;
                case '.xlsx':
                case '.xls':
                    const excelResult = await this.parseExcelFile(fileBuffer, options);
                    text = excelResult.text;
                    metadata.sheetCount = excelResult.sheetCount;
                    rawData = excelResult.rawData;
                    break;
                case '.pdf':
                    const pdfResult = await this.parsePdfFile(fileBuffer, options);
                    text = pdfResult.text;
                    metadata.pageCount = pdfResult.pageCount;
                    rawData = pdfResult.rawData;
                    break;
                case '.csv':
                    const csvResult = await this.parseCsvFile(fileBuffer, options);
                    text = csvResult.text;
                    rawData = csvResult.rawData;
                    break;
                case '.txt':
                    text = await this.parseTextFile(fileBuffer, options);
                    break;
                case '.md':
                    text = await this.parseMarkdownFile(fileBuffer, options);
                    break;
                default:
                    throw new Error(`不支持的文件格式: ${fileExtension}`);
            }
            metadata.parseTime = Date.now() - startTime;
            metadata.wordCount = this.countWords(text);
            text = this.cleanText(text);
            if (!text.trim()) {
                throw new Error('文件内容为空或无法解析');
            }
            logger_1.logger.info('文件解析成功', {
                fileName,
                fileType: fileExtension,
                fileSize: fileBuffer.length,
                wordCount: metadata.wordCount,
                parseTime: metadata.parseTime,
            });
            return {
                text: text.trim(),
                metadata,
                rawData: process.env.NODE_ENV === 'development' ? rawData : undefined,
            };
        }
        catch (error) {
            logger_1.logger.error('文件解析失败', {
                fileName,
                fileSize: fileBuffer.length,
                error: error instanceof Error ? error.message : '未知错误',
            });
            throw new Error(`文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    async parseWordDocument(buffer, options) {
        try {
            const result = await mammoth_1.default.extractRawText({
                buffer
            });
            if (result.messages && result.messages.length > 0) {
                logger_1.logger.warn('Word文档解析警告', { messages: result.messages });
            }
            return {
                text: result.value,
                rawData: {
                    messages: result.messages,
                    hasImages: false,
                }
            };
        }
        catch (error) {
            throw new Error(`Word文档解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    async parseExcelFile(buffer, options) {
        try {
            const workbook = XLSX.read(buffer, {
                type: 'buffer',
                cellText: true,
                cellDates: true,
            });
            let allText = '';
            const sheets = [];
            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const sheetData = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    defval: '',
                    blankrows: false,
                });
                let sheetText = `=== ${sheetName} ===\n`;
                sheetData.forEach((row) => {
                    if (Array.isArray(row) && row.length > 0) {
                        const rowText = row
                            .filter(cell => cell !== null && cell !== undefined && cell !== '')
                            .join(' | ');
                        if (rowText.trim()) {
                            sheetText += rowText + '\n';
                        }
                    }
                });
                sheets.push({
                    name: sheetName,
                    rowCount: sheetData.length,
                    text: sheetText,
                });
                allText += sheetText + '\n';
            });
            return {
                text: allText,
                sheetCount: workbook.SheetNames.length,
                rawData: {
                    sheetNames: workbook.SheetNames,
                    sheets,
                }
            };
        }
        catch (error) {
            throw new Error(`Excel文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    async parsePdfFile(buffer, options) {
        try {
            const data = await (0, pdf_parse_1.default)(buffer, {
                max: 0,
                version: 'v1.10.100',
            });
            return {
                text: data.text,
                pageCount: data.numpages,
                rawData: {
                    info: data.info,
                    metadata: data.metadata,
                    version: data.version,
                }
            };
        }
        catch (error) {
            throw new Error(`PDF文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    async parseCsvFile(buffer, options) {
        return new Promise((resolve, reject) => {
            const records = [];
            const csvText = buffer.toString(options.encoding || 'utf-8');
            (0, csv_parse_1.parse)(csvText, {
                delimiter: options.csvDelimiter || ',',
                skip_empty_lines: true,
                trim: true,
                auto_parse: true,
            }, (err, data) => {
                if (err) {
                    reject(new Error(`CSV文件解析失败: ${err.message}`));
                    return;
                }
                let text = '';
                data.forEach((row, index) => {
                    if (Array.isArray(row) && row.length > 0) {
                        const rowText = row
                            .filter(cell => cell !== null && cell !== undefined && cell !== '')
                            .join(' | ');
                        if (rowText.trim()) {
                            text += `第${index + 1}行: ${rowText}\n`;
                        }
                    }
                });
                resolve({
                    text,
                    rawData: {
                        rowCount: data.length,
                        columnCount: data[0]?.length || 0,
                        delimiter: options.csvDelimiter || ',',
                    }
                });
            });
        });
    }
    async parseTextFile(buffer, options) {
        try {
            return buffer.toString(options.encoding || 'utf-8');
        }
        catch (error) {
            throw new Error(`文本文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    async parseMarkdownFile(buffer, options) {
        try {
            const text = buffer.toString(options.encoding || 'utf-8');
            return text;
        }
        catch (error) {
            throw new Error(`Markdown文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    validateFile(buffer, fileName, options) {
        const maxSize = options.maxFileSize || EnhancedFileParserService.DEFAULT_MAX_SIZE;
        if (buffer.length > maxSize) {
            throw new Error(`文件大小超过限制 (${this.formatFileSize(maxSize)})`);
        }
        if (!this.isSupportedFile(fileName)) {
            throw new Error(`不支持的文件格式: ${this.getFileExtension(fileName)}`);
        }
    }
    isSupportedFile(fileName) {
        const extension = this.getFileExtension(fileName).toLowerCase();
        return EnhancedFileParserService.SUPPORTED_EXTENSIONS.includes(extension);
    }
    getFileExtension(fileName) {
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex === -1) {
            return '';
        }
        return fileName.substring(lastDotIndex);
    }
    cleanText(text) {
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ \t]+/g, ' ')
            .trim();
    }
    countWords(text) {
        if (!text.trim())
            return 0;
        const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
        const englishWords = text
            .replace(/[\u4e00-\u9fff]/g, ' ')
            .trim()
            .split(/\s+/)
            .filter(word => word.length > 0).length;
        return chineseChars + englishWords;
    }
    formatFileSize(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    static getSupportedFormats() {
        return [...EnhancedFileParserService.SUPPORTED_EXTENSIONS];
    }
    static isSupportedFileType(fileName) {
        const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
        return EnhancedFileParserService.SUPPORTED_EXTENSIONS.includes(extension);
    }
}
exports.EnhancedFileParserService = EnhancedFileParserService;
EnhancedFileParserService.DEFAULT_MAX_SIZE = 10 * 1024 * 1024;
EnhancedFileParserService.SUPPORTED_EXTENSIONS = [
    '.txt', '.md', '.doc', '.docx', '.xls', '.xlsx', '.pdf', '.csv'
];
__decorate([
    (0, performanceMonitor_1.monitor)('文件解析'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [buffer_1.Buffer, String, String, Object]),
    __metadata("design:returntype", Promise)
], EnhancedFileParserService.prototype, "parseFile", null);
exports.default = EnhancedFileParserService;
//# sourceMappingURL=enhancedFileParser.js.map