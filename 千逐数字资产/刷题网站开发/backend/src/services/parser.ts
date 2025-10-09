import { FileParserService } from './fileParserService';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';

const fileParser = new FileParserService();

/**
 * 解析文件内容为JSON格式
 * @param content 文件内容或文件路径
 * @param filePath 可选的文件路径
 * @returns 解析后的文本内容
 */
export async function parseFileToJSON(content: string, filePath?: string): Promise<string> {
  try {
    let text: string;

    if (filePath) {
      // 从文件路径读取并解析
      const fileBuffer = await fs.readFile(filePath);
      const fileName = path.basename(filePath);
      const mimeType = getMimeType(fileName);
      
      const parsed = await fileParser.parseFile(fileBuffer, fileName, mimeType);
      text = parsed.text;

      logger.info('文件解析成功', {
        filePath,
        fileName,
        textLength: text.length,
        metadata: parsed.metadata,
      });
    } else {
      // 直接使用提供的文本内容
      text = content;
      
      logger.info('文本内容处理成功', {
        textLength: text.length,
      });
    }

    return text;
  } catch (error) {
    logger.error('文件解析失败:', error);
    throw new Error(`文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 根据文件名获取MIME类型
 */
function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  
  const mimeTypes: Record<string, string> = {
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
