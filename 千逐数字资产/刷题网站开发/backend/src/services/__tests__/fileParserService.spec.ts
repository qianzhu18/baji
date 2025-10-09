import { EnhancedFileParser } from '../enhancedFileParser';
import fs from 'fs';
import path from 'path';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('EnhancedFileParser', () => {
  let parser: EnhancedFileParser;

  beforeEach(() => {
    parser = new EnhancedFileParser();
    jest.clearAllMocks();
  });

  describe('parseTextFile', () => {
    it('should parse simple text quiz format', async () => {
      const content = `1. 什么是JavaScript？
A. 编程语言
B. 标记语言
C. 样式语言
答案：A

2. HTML的全称是什么？
A. HyperText Markup Language
B. High Tech Modern Language
答案：A`;

      mockFs.readFileSync.mockReturnValue(content);

      const result = await parser.parseFile('/mock/path/quiz.txt');

      expect(result.success).toBe(true);
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0]).toMatchObject({
        question: '什么是JavaScript？',
        options: ['编程语言', '标记语言', '样式语言'],
        correctAnswer: 'A'
      });
    });

    it('should handle markdown format', async () => {
      const content = `# 前端开发题库

## 1. JavaScript基础

### 题目1
什么是闭包？

- A. 函数内部的函数
- B. 变量作用域
- C. 函数及其词法环境的组合

**答案：C**`;

      mockFs.readFileSync.mockReturnValue(content);

      const result = await parser.parseFile('/mock/path/quiz.md');

      expect(result.success).toBe(true);
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].question).toContain('闭包');
    });

    it('should handle CSV format', async () => {
      const content = `题目,选项A,选项B,选项C,正确答案
什么是React？,JavaScript库,CSS框架,HTML标签,A
什么是Vue？,后端框架,前端框架,数据库,B`;

      mockFs.readFileSync.mockReturnValue(content);

      const result = await parser.parseFile('/mock/path/quiz.csv');

      expect(result.success).toBe(true);
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0]).toMatchObject({
        question: '什么是React？',
        options: ['JavaScript库', 'CSS框架', 'HTML标签'],
        correctAnswer: 'A'
      });
    });
  });

  describe('parseDocxFile', () => {
    it('should handle DOCX parsing', async () => {
      // Mock mammoth for DOCX parsing
      const mockMammoth = {
        extractRawText: jest.fn().mockResolvedValue({
          value: `1. 什么是Node.js？
A. 前端框架
B. JavaScript运行时
C. 数据库
答案：B`
        })
      };

      // Mock the mammoth import
      jest.doMock('mammoth', () => mockMammoth);

      const result = await parser.parseFile('/mock/path/quiz.docx');

      expect(result.success).toBe(true);
      expect(result.questions).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should handle file read errors', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = await parser.parseFile('/nonexistent/file.txt');

      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
    });

    it('should handle unsupported file formats', async () => {
      const result = await parser.parseFile('/mock/path/file.xyz');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file format');
    });

    it('should handle malformed content', async () => {
      const malformedContent = `This is not a valid quiz format
Just random text without structure`;

      mockFs.readFileSync.mockReturnValue(malformedContent);

      const result = await parser.parseFile('/mock/path/malformed.txt');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid questions found');
    });
  });

  describe('question validation', () => {
    it('should validate question structure', () => {
      const validQuestion = {
        question: '什么是TypeScript？',
        options: ['JavaScript超集', 'CSS预处理器', 'HTML模板'],
        correctAnswer: 'A'
      };

      const isValid = parser.validateQuestion(validQuestion);
      expect(isValid).toBe(true);
    });

    it('should reject invalid questions', () => {
      const invalidQuestion = {
        question: '',
        options: ['选项A'],
        correctAnswer: 'A'
      };

      const isValid = parser.validateQuestion(invalidQuestion);
      expect(isValid).toBe(false);
    });

    it('should reject questions with insufficient options', () => {
      const invalidQuestion = {
        question: '测试题目？',
        options: ['只有一个选项'],
        correctAnswer: 'A'
      };

      const isValid = parser.validateQuestion(invalidQuestion);
      expect(isValid).toBe(false);
    });
  });

  describe('content cleaning', () => {
    it('should clean and normalize text', () => {
      const dirtyText = '  什么是  JavaScript？  \n\n  ';
      const cleaned = parser.cleanText(dirtyText);
      
      expect(cleaned).toBe('什么是JavaScript？');
    });

    it('should remove special characters', () => {
      const textWithSpecialChars = '1. 什么是React？【重要】';
      const cleaned = parser.cleanText(textWithSpecialChars);
      
      expect(cleaned).toBe('1. 什么是React？');
    });
  });

  describe('format detection', () => {
    it('should detect file format by extension', () => {
      expect(parser.detectFormat('/path/file.txt')).toBe('txt');
      expect(parser.detectFormat('/path/file.md')).toBe('md');
      expect(parser.detectFormat('/path/file.csv')).toBe('csv');
      expect(parser.detectFormat('/path/file.docx')).toBe('docx');
    });

    it('should handle files without extension', () => {
      expect(parser.detectFormat('/path/filename')).toBe('txt');
    });
  });

  describe('statistics', () => {
    it('should provide parsing statistics', async () => {
      const content = `1. 题目1？
A. 选项A
B. 选项B
答案：A

2. 题目2？
A. 选项A
B. 选项B
答案：B`;

      mockFs.readFileSync.mockReturnValue(content);

      const result = await parser.parseFile('/mock/path/quiz.txt');

      expect(result.statistics).toMatchObject({
        totalQuestions: 2,
        validQuestions: 2,
        invalidQuestions: 0,
        processingTime: expect.any(Number)
      });
    });
  });
});
