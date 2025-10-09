"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = void 0;
exports.monitor = monitor;
exports.measurePerformance = measurePerformance;
const logger_1 = require("./logger");
class PerformanceMonitor {
    static start(operationId, operation, metadata) {
        const startTime = Date.now();
        const memoryUsage = process.memoryUsage();
        this.metrics.set(operationId, {
            operation,
            startTime,
            memoryUsage,
            metadata,
        });
        logger_1.logger.debug('性能监控开始', {
            operationId,
            operation,
            startTime,
            memoryUsage: this.formatMemoryUsage(memoryUsage),
            metadata,
        });
    }
    static end(operationId, additionalMetadata) {
        const metric = this.metrics.get(operationId);
        if (!metric) {
            logger_1.logger.warn('性能监控未找到对应的开始记录', { operationId });
            return null;
        }
        const endTime = Date.now();
        const duration = endTime - metric.startTime;
        const endMemoryUsage = process.memoryUsage();
        const completedMetric = {
            ...metric,
            endTime,
            duration,
            metadata: {
                ...metric.metadata,
                ...additionalMetadata,
                memoryDelta: this.calculateMemoryDelta(metric.memoryUsage, endMemoryUsage),
            },
        };
        this.logPerformance(completedMetric, endMemoryUsage);
        this.metrics.delete(operationId);
        return completedMetric;
    }
    static logPerformance(metric, endMemoryUsage) {
        const logData = {
            operation: metric.operation,
            duration: `${metric.duration}ms`,
            startMemory: this.formatMemoryUsage(metric.memoryUsage),
            endMemory: this.formatMemoryUsage(endMemoryUsage),
            memoryDelta: metric.metadata?.memoryDelta,
            metadata: metric.metadata,
        };
        if (metric.duration > 10000) {
            logger_1.logger.warn('性能监控 - 操作耗时较长', logData);
        }
        else if (metric.duration > 5000) {
            logger_1.logger.info('性能监控 - 操作完成', logData);
        }
        else {
            logger_1.logger.debug('性能监控 - 操作完成', logData);
        }
    }
    static calculateMemoryDelta(startMemory, endMemory) {
        return {
            rss: this.formatBytes(endMemory.rss - startMemory.rss),
            heapUsed: this.formatBytes(endMemory.heapUsed - startMemory.heapUsed),
            heapTotal: this.formatBytes(endMemory.heapTotal - startMemory.heapTotal),
            external: this.formatBytes(endMemory.external - startMemory.external),
        };
    }
    static formatMemoryUsage(memoryUsage) {
        return {
            rss: this.formatBytes(memoryUsage.rss),
            heapUsed: this.formatBytes(memoryUsage.heapUsed),
            heapTotal: this.formatBytes(memoryUsage.heapTotal),
            external: this.formatBytes(memoryUsage.external),
        };
    }
    static formatBytes(bytes) {
        if (bytes === 0)
            return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
        const sign = bytes < 0 ? '-' : '';
        return sign + parseFloat((Math.abs(bytes) / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    static getActiveMetrics() {
        return Array.from(this.metrics.values());
    }
    static clear() {
        this.metrics.clear();
    }
    static getSystemStats() {
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        return {
            memory: this.formatMemoryUsage(memoryUsage),
            cpu: {
                user: `${(cpuUsage.user / 1000).toFixed(2)}ms`,
                system: `${(cpuUsage.system / 1000).toFixed(2)}ms`,
            },
            uptime: `${(process.uptime() / 60).toFixed(2)} minutes`,
            activeMonitors: this.metrics.size,
        };
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
PerformanceMonitor.metrics = new Map();
function monitor(operation) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        const operationName = operation || `${target.constructor.name}.${propertyName}`;
        descriptor.value = async function (...args) {
            const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            PerformanceMonitor.start(operationId, operationName, {
                args: args.length,
                className: target.constructor.name,
                methodName: propertyName,
            });
            try {
                const result = await method.apply(this, args);
                PerformanceMonitor.end(operationId, {
                    success: true,
                    resultType: typeof result,
                });
                return result;
            }
            catch (error) {
                PerformanceMonitor.end(operationId, {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
                throw error;
            }
        };
        return descriptor;
    };
}
async function measurePerformance(operation, fn, metadata) {
    const operationId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    PerformanceMonitor.start(operationId, operation, metadata);
    try {
        const result = await fn();
        PerformanceMonitor.end(operationId, { success: true });
        return result;
    }
    catch (error) {
        PerformanceMonitor.end(operationId, {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}
exports.default = PerformanceMonitor;
//# sourceMappingURL=performanceMonitor.js.map