import { IQuestion } from '@/models/Quiz';
interface ParseResult {
    success: boolean;
    questions: IQuestion[];
    error?: string;
    totalQuestions: number;
}
interface AIParseOptions {
    content: string;
    apiKey: string;
    progressCallback?: (progress: number) => void;
}
interface QuizGenerationOptions {
    content: string;
    apiKey: string;
    questionOrder: '顺序' | '随机';
    progressCallback?: (progress: number) => void;
}
interface QuizGenerationResult {
    success: boolean;
    html?: string;
    error?: string;
}
declare class AIService {
    private genAI;
    private initializeAI;
    validateApiKey(apiKey: string): Promise<boolean>;
    parseQuizContent(options: AIParseOptions): Promise<ParseResult>;
    generateQuizHTML(options: QuizGenerationOptions): Promise<QuizGenerationResult>;
    private loadPromptTemplate;
    private buildQuizGenerationPrompt;
    private buildParsePrompt;
    private parseAIResponse;
    private validateQuestionType;
    private validateDifficulty;
    parseLargeContent(options: AIParseOptions): Promise<ParseResult>;
    private splitContent;
}
export declare const aiService: AIService;
export {};
//# sourceMappingURL=aiService.d.ts.map