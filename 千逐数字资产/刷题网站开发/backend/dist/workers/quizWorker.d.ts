import { Worker } from 'bullmq';
interface QuizJobData {
    quizId: string;
    filePath?: string;
    fileContent?: string;
    orderMode: '顺序' | '随机';
    userId: string;
}
export declare const quizWorker: Worker<QuizJobData, any, string>;
export declare const closeWorker: () => Promise<void>;
export {};
//# sourceMappingURL=quizWorker.d.ts.map