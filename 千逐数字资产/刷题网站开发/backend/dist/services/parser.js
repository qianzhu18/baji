"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFileToJSON = parseFileToJSON;
const fileParserService_1 = require("./fileParserService");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const fileParser = new fileParserService_1.FileParserService();
async function parseFileToJSON(content, filePath) {
    try {
        let text;
        if (filePath) {
            const fileBuffer = await promises_1.default.readFile(filePath);
            const fileName = path_1.default.basename(filePath);
            const mimeType = getMimeType(fileName);
            const parsed = await fileParser.parseFile(fileBuffer, fileName, mimeType);
            text = parsed.text;
            logger_1.logger.info('文件解析成功', {
                filePath,
                fileName,
                textLength: text.length,
                metadata: parsed.metadata,
            });
        }
        else {
            text = content;
            logger_1.logger.info('文本内容处理成功', {
                textLength: text.length,
            });
        }
        return text;
    }
    catch (error) {
        logger_1.logger.error('文件解析失败:', error);
        throw new Error(`文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
}
function getMimeType(fileName) {
    const ext = path_1.default.extname(fileName).toLowerCase();
    const mimeTypes = {
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.pdf': 'application/pdf',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return mimeTypes[ext] || 'application/octet-stream';
}
//# sourceMappingURL=parser.js.map