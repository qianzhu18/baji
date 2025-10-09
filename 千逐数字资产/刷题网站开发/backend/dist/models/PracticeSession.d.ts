import mongoose, { Document } from 'mongoose';
export interface IAnswer {
    questionId: string;
    userAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
    attempts: number;
}
export interface IPracticeSession extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    quizId: mongoose.Types.ObjectId;
    mode: 'sequential' | 'random';
    questionOrder: string[];
    status: 'active' | 'paused' | 'completed' | 'abandoned';
    currentQuestionIndex: number;
    answers: IAnswer[];
    startedAt: Date;
    completedAt?: Date;
    totalTimeSpent: number;
    pausedTime: number;
    score: {
        totalQuestions: number;
        answeredQuestions: number;
        correctAnswers: number;
        accuracy: number;
        averageTimePerQuestion: number;
    };
    metadata: {
        deviceInfo?: string;
        userAgent?: string;
        ipAddress?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const PracticeSession: mongoose.Model<IPracticeSession, {}, {}, {}, mongoose.Document<unknown, {}, IPracticeSession, {}> & IPracticeSession & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=PracticeSession.d.ts.map