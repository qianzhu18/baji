import { Request, Response, NextFunction } from 'express';
import { IUser } from '@/models/User';
interface AuthRequest extends Request {
    user?: IUser;
}
export declare const validateApiKey: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const parseQuiz: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getParseStatus: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getConvertStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const reparseQuiz: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const convertQuiz: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=aiController.d.ts.map