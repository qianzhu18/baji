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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileParserService = void 0;
const mammoth_1 = __importDefault(require("mammoth"));
const XLSX = __importStar(require("xlsx"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const csv_parse_1 = require("csv-parse");
class FileParserService {
    async parseFile(fileBuffer, fileName, mimeType) {
        const fileExtension = this.getFileExtension(fileName);
        try {
            let text = '';
            let metadata = {
                fileName,
                fileType: fileExtension,
                fileSize: fileBuffer.length
            };
            switch (fileExtension.toLowerCase()) {
                case 'docx':
                case 'doc':
                    const docResult = await this.parseWordDocument(fileBuffer);
                    text = docResult.text;
                    metadata.wordCount = this.countWords(text);
                    break;
                case 'xlsx':
                case 'xls':
                    text = await this.parseExcelFile(fileBuffer);
                    metadata.wordCount = this.countWords(text);
                    break;
                case 'pdf':
                    const pdfResult = await this.parsePdfFile(fileBuffer);
                    text = pdfResult.text;
                    metadata.pageCount = pdfResult.pageCount;
                    metadata.wordCount = this.countWords(text);
                    break;
                case 'txt':
                    text = fileBuffer.toString('utf-8');
                    metadata.wordCount = this.countWords(text);
                    break;
                case 'md':
                    text = fileBuffer.toString('utf-8');
                    metadata.wordCount = this.countWords(text);
                    break;
                case 'csv':
                    text = await this.parseCsvFile(fileBuffer);
                    metadata.wordCount = this.countWords(text);
                    break;
                default:
                    throw new Error(`不支持的文件格式: ${fileExtension}`);
            }
            return {
                text: text.trim(),
                metadata
            };
        }
        catch (error) {
            throw new Error(`文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    async parseWordDocument(buffer) {
        try {
            const result = await mammoth_1.default.extractRawText({ buffer });
            return { text: result.value };
        }
        catch (error) {
            throw new Error('Word文档解析失败');
        }
    }
    async parseExcelFile(buffer) {
        try {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            let allText = '';
            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                sheetData.forEach((row) => {
                    if (Array.isArray(row)) {
                        const rowText = row.filter(cell => cell !== null && cell !== undefined).join(' ');
                        if (rowText.trim()) {
                            allText += rowText + '\n';
                        }
                    }
                });
            });
            return allText;
        }
        catch (error) {
            throw new Error('Excel文件解析失败');
        }
    }
    async parsePdfFile(buffer) {
        try {
            const data = await (0, pdf_parse_1.default)(buffer);
            return {
                text: data.text,
                pageCount: data.numpages
            };
        }
        catch (error) {
            throw new Error('PDF文件解析失败');
        }
    }
    async parseCsvFile(buffer) {
        return new Promise((resolve, reject) => {
            const csvText = buffer.toString('utf-8');
            (0, csv_parse_1.parse)(csvText, {
                delimiter: ',',
                skip_empty_lines: true,
                trim: true,
            }, (err, data) => {
                if (err) {
                    reject(new Error('CSV文件解析失败'));
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
                resolve(text);
            });
        });
    }
    getFileExtension(fileName) {
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex === -1) {
            return '';
        }
        return fileName.substring(lastDotIndex + 1);
    }
    countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
    static isSupportedFileType(fileName, mimeType) {
        const supportedExtensions = ['docx', 'doc', 'xlsx', 'xls', 'pdf', 'txt', 'md', 'csv'];
        const supportedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/pdf',
            'text/plain',
            'text/markdown',
            'text/csv',
            'application/csv'
        ];
        const extension = fileName.split('.').pop()?.toLowerCase();
        return supportedExtensions.includes(extension || '') || supportedMimeTypes.includes(mimeType);
    }
    static getMaxFileSize() {
        return 10 * 1024 * 1024;
    }
    static validateFileSize(fileSize) {
        return fileSize <= this.getMaxFileSize();
    }
    static formatFileSize(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
exports.FileParserService = FileParserService;
exports.default = FileParserService;
//# sourceMappingURL=fileParserService.js.map