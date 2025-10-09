import mongoose, { Document } from 'mongoose';
export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
    password: string;
    avatar?: string;
    isEmailVerified: boolean;
    emailVerificationToken?: string;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    passwordChangedAt?: Date;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    stats: {
        totalQuizzes: number;
        totalQuestions: number;
        correctAnswers: number;
        studyTime: number;
        joinDate: Date;
    };
    comparePassword(candidatePassword: string): Promise<boolean>;
    generatePasswordResetToken(): string;
    generateEmailVerificationToken(): string;
    passwordChangedAfter(JWTTimestamp: number): boolean;
}
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=User.d.ts.map