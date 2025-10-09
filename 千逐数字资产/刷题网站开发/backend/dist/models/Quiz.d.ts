import mongoose, { Document } from 'mongoose';
export interface IQuestion {
    id: string;
    question: string;
    type: 'multiple-choice' | 'short-answer' | 'true-false' | 'fill-blank';
    options?: string[];
    answer: string;
    explanation?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    tags?: string[];
}
export interface IQuiz extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    content: string;
    questions: IQuestion[];
    userId: mongoose.Types.ObjectId;
    isPublic: boolean;
    status: 'draft' | 'processing' | 'completed' | 'failed';
    processingProgress?: number;
    processingError?: string;
    stats: {
        totalQuestions: number;
        questionTypes: {
            multipleChoice: number;
            shortAnswer: number;
            trueFalse: number;
            fillBlank: number;
        };
        averageDifficulty?: 'easy' | 'medium' | 'hard';
        totalPractices: number;
        averageScore?: number;
    };
    metadata: {
        originalFileName?: string;
        fileSize?: number;
        fileType?: string;
        uploadedAt: Date;
        lastPracticedAt?: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const Quiz: mongoose.Model<IQuiz, {}, {}, {}, mongoose.Document<unknown, {}, IQuiz, {}> & IQuiz & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Quiz.d.ts.map