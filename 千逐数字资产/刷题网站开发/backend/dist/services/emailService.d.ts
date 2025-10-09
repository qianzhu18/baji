interface EmailOptions {
    email: string;
    subject: string;
    message: string;
    html?: string;
}
declare class EmailService {
    private transporter;
    constructor();
    private createTransporter;
    sendEmail(options: EmailOptions): Promise<void>;
    sendWelcomeEmail(email: string, name: string): Promise<void>;
    sendPasswordResetConfirmation(email: string, name: string): Promise<void>;
}
export declare const emailService: EmailService;
export declare const sendEmail: (options: EmailOptions) => Promise<void>;
export {};
//# sourceMappingURL=emailService.d.ts.map