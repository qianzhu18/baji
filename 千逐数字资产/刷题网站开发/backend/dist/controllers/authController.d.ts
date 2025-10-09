import { Request, Response, NextFunction } from 'express';
import { IUser } from '@/models/User';
interface AuthRequest extends Request {
    user?: IUser;
}
export declare const register: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const login: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const logout: (req: Request, res: Response) => void;
export declare const forgotPassword: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const resetPassword: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const verifyEmail: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getMe: (req: AuthRequest, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=authController.d.ts.map