export interface PerformanceMetrics {
    operation: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    memoryUsage?: NodeJS.MemoryUsage;
    metadata?: Record<string, any>;
}
export declare class PerformanceMonitor {
    private static metrics;
    static start(operationId: string, operation: string, metadata?: Record<string, any>): void;
    static end(operationId: string, additionalMetadata?: Record<string, any>): PerformanceMetrics | null;
    private static logPerformance;
    private static calculateMemoryDelta;
    private static formatMemoryUsage;
    private static formatBytes;
    static getActiveMetrics(): PerformanceMetrics[];
    static clear(): void;
    static getSystemStats(): Record<string, any>;
}
export declare function monitor(operation?: string): (target: any, propertyName: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function measurePerformance<T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T>;
export default PerformanceMonitor;
//# sourceMappingURL=performanceMonitor.d.ts.map