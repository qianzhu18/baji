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
export declare class FileParserService {
    parseFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<ParsedFileContent>;
    private parseWordDocument;
    private parseExcelFile;
    private parsePdfFile;
    private parseCsvFile;
    private getFileExtension;
    private countWords;
    static isSupportedFileType(fileName: string, mimeType: string): boolean;
    static getMaxFileSize(): number;
    static validateFileSize(fileSize: number): boolean;
    static formatFileSize(bytes: number): string;
}
export default FileParserService;
//# sourceMappingURL=fileParserService.d.ts.map