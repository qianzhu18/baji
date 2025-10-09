import { logger } from './logger';

export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private static metrics: Map<string, PerformanceMetrics> = new Map();

  /**
   * 开始性能监控
   */
  static start(operationId: string, operation: string, metadata?: Record<string, any>): void {
    const startTime = Date.now();
    const memoryUsage = process.memoryUsage();

    this.metrics.set(operationId, {
      operation,
      startTime,
      memoryUsage,
      metadata,
    });

    logger.debug('性能监控开始', {
      operationId,
      operation,
      startTime,
      memoryUsage: this.formatMemoryUsage(memoryUsage),
      metadata,
    });
  }

  /**
   * 结束性能监控
   */
  static end(operationId: string, additionalMetadata?: Record<string, any>): PerformanceMetrics | null {
    const metric = this.metrics.get(operationId);
    if (!metric) {
      logger.warn('性能监控未找到对应的开始记录', { operationId });
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - metric.startTime;
    const endMemoryUsage = process.memoryUsage();

    const completedMetric: PerformanceMetrics = {
      ...metric,
      endTime,
      duration,
      metadata: {
        ...metric.metadata,
        ...additionalMetadata,
        memoryDelta: this.calculateMemoryDelta(metric.memoryUsage!, endMemoryUsage),
      },
    };

    // 记录性能日志
    this.logPerformance(completedMetric, endMemoryUsage);

    // 清理已完成的监控记录
    this.metrics.delete(operationId);

    return completedMetric;
  }

  /**
   * 记录性能日志
   */
  private static logPerformance(metric: PerformanceMetrics, endMemoryUsage: NodeJS.MemoryUsage): void {
    const logData = {
      operation: metric.operation,
      duration: `${metric.duration}ms`,
      startMemory: this.formatMemoryUsage(metric.memoryUsage!),
      endMemory: this.formatMemoryUsage(endMemoryUsage),
      memoryDelta: metric.metadata?.memoryDelta,
      metadata: metric.metadata,
    };

    // 根据性能表现选择日志级别
    if (metric.duration! > 10000) { // 超过10秒
      logger.warn('性能监控 - 操作耗时较长', logData);
    } else if (metric.duration! > 5000) { // 超过5秒
      logger.info('性能监控 - 操作完成', logData);
    } else {
      logger.debug('性能监控 - 操作完成', logData);
    }
  }

  /**
   * 计算内存使用差值
   */
  private static calculateMemoryDelta(
    startMemory: NodeJS.MemoryUsage,
    endMemory: NodeJS.MemoryUsage
  ): Record<string, string> {
    return {
      rss: this.formatBytes(endMemory.rss - startMemory.rss),
      heapUsed: this.formatBytes(endMemory.heapUsed - startMemory.heapUsed),
      heapTotal: this.formatBytes(endMemory.heapTotal - startMemory.heapTotal),
      external: this.formatBytes(endMemory.external - startMemory.external),
    };
  }

  /**
   * 格式化内存使用信息
   */
  private static formatMemoryUsage(memoryUsage: NodeJS.MemoryUsage): Record<string, string> {
    return {
      rss: this.formatBytes(memoryUsage.rss),
      heapUsed: this.formatBytes(memoryUsage.heapUsed),
      heapTotal: this.formatBytes(memoryUsage.heapTotal),
      external: this.formatBytes(memoryUsage.external),
    };
  }

  /**
   * 格式化字节数
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    const sign = bytes < 0 ? '-' : '';
    
    return sign + parseFloat((Math.abs(bytes) / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 获取当前活跃的监控记录
   */
  static getActiveMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * 清理所有监控记录
   */
  static clear(): void {
    this.metrics.clear();
  }

  /**
   * 获取系统性能统计
   */
  static getSystemStats(): Record<string, any> {
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

/**
 * 性能监控装饰器
 */
export function monitor(operation?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const operationName = operation || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
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
      } catch (error) {
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

/**
 * 简化的性能监控函数
 */
export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const operationId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  PerformanceMonitor.start(operationId, operation, metadata);

  try {
    const result = await fn();
    PerformanceMonitor.end(operationId, { success: true });
    return result;
  } catch (error) {
    PerformanceMonitor.end(operationId, { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
}

export default PerformanceMonitor;
