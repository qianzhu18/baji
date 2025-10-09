import { Request, Response, NextFunction } from 'express';
import { IUser } from '@/models/User';
interface AuthRequest extends Request {
    user?: IUser;
}
export declare const createQuiz: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getQuizzes: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getQuiz: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const updateQuiz: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteQuiz: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=quizController.d.ts.map