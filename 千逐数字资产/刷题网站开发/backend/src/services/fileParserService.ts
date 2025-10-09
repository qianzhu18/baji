import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import pdfParse from 'pdf-parse';
import { parse as csvParse } from 'csv-parse';
import { Buffer } from 'buffer';

export interface ParsedFileContent {
  text: string;
  metadata?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    pageCount?: number;
    wordCount?: number;
  };
}

export class FileParserService {
  /**
   * 解析文件内容
   */
  async parseFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<ParsedFileContent> {
    const fileExtension = this.getFileExtension(fileName);
    
    try {
      let text = '';
      let metadata: any = {
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
    } catch (error) {
      throw new Error(`文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 解析Word文档
   */
  private async parseWordDocument(buffer: Buffer): Promise<{ text: string }> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value };
    } catch (error) {
      throw new Error('Word文档解析失败');
    }
  }

  /**
   * 解析Excel文件
   */
  private async parseExcelFile(buffer: Buffer): Promise<string> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let allText = '';

      // 遍历所有工作表
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // 将每行数据转换为文本
        sheetData.forEach((row: any) => {
          if (Array.isArray(row)) {
            const rowText = row.filter(cell => cell !== null && cell !== undefined).join(' ');
            if (rowText.trim()) {
              allText += rowText + '\n';
            }
          }
        });
      });

      return allText;
    } catch (error) {
      throw new Error('Excel文件解析失败');
    }
  }

  /**
   * 解析PDF文件
   */
  private async parsePdfFile(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
    try {
      const data = await pdfParse(buffer);
      return {
        text: data.text,
        pageCount: data.numpages
      };
    } catch (error) {
      throw new Error('PDF文件解析失败');
    }
  }

  /**
   * 解析CSV文件
   */
  private async parseCsvFile(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const csvText = buffer.toString('utf-8');

      csvParse(csvText, {
        delimiter: ',',
        skip_empty_lines: true,
        trim: true,
      }, (err, data) => {
        if (err) {
          reject(new Error('CSV文件解析失败'));
          return;
        }

        let text = '';
        data.forEach((row: any[], index: number) => {
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

  /**
   * 获取文件扩展名
   */
  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return '';
    }
    return fileName.substring(lastDotIndex + 1);
  }

  /**
   * 统计单词数量
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * 验证文件类型是否支持
   */
  static isSupportedFileType(fileName: string, mimeType: string): boolean {
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

  /**
   * 获取文件大小限制（字节）
   */
  static getMaxFileSize(): number {
    return 10 * 1024 * 1024; // 10MB
  }

  /**
   * 验证文件大小
   */
  static validateFileSize(fileSize: number): boolean {
    return fileSize <= this.getMaxFileSize();
  }

  /**
   * 格式化文件大小显示
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default FileParserService;
