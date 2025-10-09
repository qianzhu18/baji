import { Request, Response, NextFunction } from 'express';
import { IUser } from '@/models/User';
interface AuthRequest extends Request {
    user?: IUser;
}
export declare const protect: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const restrictTo: (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const optionalAuth: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireEmailVerification: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const checkOwnership: (resourceField?: string) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=auth.d.ts.map