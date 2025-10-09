import { Request, Response, NextFunction } from 'express';
import { IUser } from '@/models/User';
interface AuthRequest extends Request {
    user?: IUser;
}
export declare const createPracticeSession: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const updatePracticeSession: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const completePracticeSession: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getPracticeHistory: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=practiceController.d.ts.map