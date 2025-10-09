import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import pdfParse from 'pdf-parse';
import { parse as csvParse } from 'csv-parse';
import { Buffer } from 'buffer';
import { logger } from '../utils/logger';
import { PerformanceMonitor, monitor } from '../utils/performanceMonitor';

export interface ParsedFileContent {
  text: string;
  metadata: {
    fileName: string;
    fileType: string;
    fileSize: number;
    pageCount?: number;
    wordCount: number;
    sheetCount?: number;
    encoding?: string;
    parseTime: number;
  };
  rawData?: any; // 原始解析数据，用于调试
}

export interface ParseOptions {
  maxFileSize?: number;
  encoding?: string;
  csvDelimiter?: string;
  preserveFormatting?: boolean;
  extractImages?: boolean;
}

export class EnhancedFileParserService {
  private static readonly DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly SUPPORTED_EXTENSIONS = [
    '.txt', '.md', '.doc', '.docx', '.xls', '.xlsx', '.pdf', '.csv'
  ];

  /**
   * 解析文件内容 - 主入口方法
   */
  @monitor('文件解析')
  async parseFile(
    fileBuffer: Buffer, 
    fileName: string, 
    mimeType: string,
    options: ParseOptions = {}
  ): Promise<ParsedFileContent> {
    const startTime = Date.now();
    
    try {
      // 验证文件
      this.validateFile(fileBuffer, fileName, options);
      
      const fileExtension = this.getFileExtension(fileName);
      const metadata: any = {
        fileName,
        fileType: fileExtension,
        fileSize: fileBuffer.length,
        wordCount: 0,
        encoding: options.encoding || 'utf-8',
        parseTime: 0,
      };

      let text = '';
      let rawData: any = null;

      // 根据文件类型选择解析方法
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

      // 计算解析时间和字数
      metadata.parseTime = Date.now() - startTime;
      metadata.wordCount = this.countWords(text);

      // 清理和验证文本内容
      text = this.cleanText(text);
      
      if (!text.trim()) {
        throw new Error('文件内容为空或无法解析');
      }

      logger.info('文件解析成功', {
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

    } catch (error) {
      logger.error('文件解析失败', {
        fileName,
        fileSize: fileBuffer.length,
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw new Error(`文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 解析Word文档 (.doc/.docx)
   */
  private async parseWordDocument(buffer: Buffer, options: ParseOptions): Promise<{
    text: string;
    rawData: any;
  }> {
    try {
      const result = await mammoth.extractRawText({
        buffer
      });

      if (result.messages && result.messages.length > 0) {
        logger.warn('Word文档解析警告', { messages: result.messages });
      }

      return {
        text: result.value,
        rawData: {
          messages: result.messages,
          hasImages: false, // 简化处理
        }
      };
    } catch (error) {
      throw new Error(`Word文档解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 解析Excel文件 (.xls/.xlsx)
   */
  private async parseExcelFile(buffer: Buffer, options: ParseOptions): Promise<{
    text: string;
    sheetCount: number;
    rawData: any;
  }> {
    try {
      const workbook = XLSX.read(buffer, { 
        type: 'buffer',
        cellText: true,
        cellDates: true,
      });

      let allText = '';
      const sheets: any[] = [];

      // 遍历所有工作表
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '',
          blankrows: false,
        });
        
        let sheetText = `=== ${sheetName} ===\n`;
        
        // 将每行数据转换为文本
        sheetData.forEach((row: any) => {
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
    } catch (error) {
      throw new Error(`Excel文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 解析PDF文件
   */
  private async parsePdfFile(buffer: Buffer, options: ParseOptions): Promise<{
    text: string;
    pageCount: number;
    rawData: any;
  }> {
    try {
      const data = await pdfParse(buffer, {
        max: 0, // 解析所有页面
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
    } catch (error) {
      throw new Error(`PDF文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 解析CSV文件
   */
  private async parseCsvFile(buffer: Buffer, options: ParseOptions): Promise<{
    text: string;
    rawData: any;
  }> {
    return new Promise((resolve, reject) => {
      const records: any[] = [];
      const csvText = buffer.toString((options.encoding as BufferEncoding) || 'utf-8');
      
      csvParse(csvText, {
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

  /**
   * 解析纯文本文件
   */
  private async parseTextFile(buffer: Buffer, options: ParseOptions): Promise<string> {
    try {
      return buffer.toString((options.encoding as BufferEncoding) || 'utf-8');
    } catch (error) {
      throw new Error(`文本文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 解析Markdown文件
   */
  private async parseMarkdownFile(buffer: Buffer, options: ParseOptions): Promise<string> {
    try {
      const text = buffer.toString((options.encoding as BufferEncoding) || 'utf-8');
      // 可以在这里添加Markdown特殊处理逻辑
      return text;
    } catch (error) {
      throw new Error(`Markdown文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 验证文件
   */
  private validateFile(buffer: Buffer, fileName: string, options: ParseOptions): void {
    const maxSize = options.maxFileSize || EnhancedFileParserService.DEFAULT_MAX_SIZE;
    
    if (buffer.length > maxSize) {
      throw new Error(`文件大小超过限制 (${this.formatFileSize(maxSize)})`);
    }

    if (!this.isSupportedFile(fileName)) {
      throw new Error(`不支持的文件格式: ${this.getFileExtension(fileName)}`);
    }
  }

  /**
   * 检查是否为支持的文件类型
   */
  private isSupportedFile(fileName: string): boolean {
    const extension = this.getFileExtension(fileName).toLowerCase();
    return EnhancedFileParserService.SUPPORTED_EXTENSIONS.includes(extension);
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return '';
    }
    return fileName.substring(lastDotIndex);
  }

  /**
   * 清理文本内容
   */
  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')  // 统一换行符
      .replace(/\r/g, '\n')    // 统一换行符
      .replace(/\n{3,}/g, '\n\n')  // 减少多余空行
      .replace(/[ \t]+/g, ' ')  // 减少多余空格
      .trim();
  }

  /**
   * 统计单词数量
   */
  private countWords(text: string): number {
    if (!text.trim()) return 0;
    
    // 中文字符计数
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    
    // 英文单词计数
    const englishWords = text
      .replace(/[\u4e00-\u9fff]/g, ' ')  // 移除中文字符
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length;
    
    return chineseChars + englishWords;
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 获取支持的文件格式列表
   */
  static getSupportedFormats(): string[] {
    return [...EnhancedFileParserService.SUPPORTED_EXTENSIONS];
  }

  /**
   * 验证文件类型是否支持
   */
  static isSupportedFileType(fileName: string): boolean {
    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    return EnhancedFileParserService.SUPPORTED_EXTENSIONS.includes(extension);
  }
}

export default EnhancedFileParserService;
