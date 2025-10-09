import { Buffer } from 'buffer';
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
    rawData?: any;
}
export interface ParseOptions {
    maxFileSize?: number;
    encoding?: string;
    csvDelimiter?: string;
    preserveFormatting?: boolean;
    extractImages?: boolean;
}
export declare class EnhancedFileParserService {
    private static readonly DEFAULT_MAX_SIZE;
    private static readonly SUPPORTED_EXTENSIONS;
    parseFile(fileBuffer: Buffer, fileName: string, mimeType: string, options?: ParseOptions): Promise<ParsedFileContent>;
    private parseWordDocument;
    private parseExcelFile;
    private parsePdfFile;
    private parseCsvFile;
    private parseTextFile;
    private parseMarkdownFile;
    private validateFile;
    private isSupportedFile;
    private getFileExtension;
    private cleanText;
    private countWords;
    private formatFileSize;
    static getSupportedFormats(): string[];
    static isSupportedFileType(fileName: string): boolean;
}
export default EnhancedFileParserService;
//# sourceMappingURL=enhancedFileParser.d.ts.map