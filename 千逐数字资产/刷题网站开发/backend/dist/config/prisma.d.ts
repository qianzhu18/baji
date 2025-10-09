import { PrismaClient } from '../generated/prisma';
export declare const prisma: PrismaClient<{
    log: ({
        emit: "event";
        level: "query";
    } | {
        emit: "event";
        level: "error";
    } | {
        emit: "event";
        level: "info";
    } | {
        emit: "event";
        level: "warn";
    })[];
}, "info" | "error" | "warn" | "query", import("@/generated/prisma/runtime/library").DefaultArgs>;
export declare const initPrisma: () => Promise<void>;
export declare const disconnectPrisma: () => Promise<void>;
export declare const checkDatabaseHealth: () => Promise<boolean>;
export type { User, Quiz, Job } from '../generated/prisma';
//# sourceMappingURL=prisma.d.ts.map