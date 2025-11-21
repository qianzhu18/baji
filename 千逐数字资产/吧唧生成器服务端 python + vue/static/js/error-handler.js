// error-handler.js - 错误处理和用户体验优化
class ErrorHandler {
    constructor() {
        this.errorTypes = {
            NETWORK_ERROR: 'network_error',
            VALIDATION_ERROR: 'validation_error',
            UPLOAD_ERROR: 'upload_error',
            PROCESSING_ERROR: 'processing_error',
            PAYMENT_ERROR: 'payment_error',
            AUTH_ERROR: 'auth_error',
            IMAGE_REQUIRED_ERROR: 'image_required_error',
            UNKNOWN_ERROR: 'unknown_error'
        };
        
        this.errorMessages = {
            [this.errorTypes.NETWORK_ERROR]: '网络连接失败，请检查网络设置',
            [this.errorTypes.VALIDATION_ERROR]: '输入信息有误，请检查后重试',
            [this.errorTypes.UPLOAD_ERROR]: '文件上传失败，请重试',
            [this.errorTypes.PROCESSING_ERROR]: '图片处理失败，请重试',
            [this.errorTypes.PAYMENT_ERROR]: '支付处理失败，请重试',
            [this.errorTypes.AUTH_ERROR]: '认证失败，请重新登录',
            [this.errorTypes.IMAGE_REQUIRED_ERROR]: '请先上传图片',
            [this.errorTypes.UNKNOWN_ERROR]: '发生未知错误，请重试'
        };
        
        this.retryAttempts = new Map();
        this.maxRetryAttempts = 3;
        this.retryDelay = 1000; // 1秒
        
        this.init();
    }

    init() {
        // 设置全局错误处理
        this.setupGlobalErrorHandling();
        
        // 设置网络状态监听
        this.setupNetworkStatusListener();
        
        // 设置性能监控
        this.setupPerformanceMonitoring();
        
        // 设置用户行为分析
        this.setupUserBehaviorTracking();
    }

    setupGlobalErrorHandling() {
        // 捕获未处理的JavaScript错误
        window.addEventListener('error', (event) => {
            this.handleError({
                type: this.errorTypes.UNKNOWN_ERROR,
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });

        // 捕获未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: this.errorTypes.UNKNOWN_ERROR,
                message: event.reason?.message || 'Promise rejected',
                error: event.reason
            });
        });

        // 捕获资源加载错误
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.handleError({
                    type: this.errorTypes.NETWORK_ERROR,
                    message: `资源加载失败: ${event.target.src || event.target.href}`,
                    element: event.target
                });
            }
        }, true);
    }

    setupNetworkStatusListener() {
        // 监听网络状态变化
        if ('onLine' in navigator) {
            window.addEventListener('online', () => {
                this.showNetworkStatus('网络已连接', 'success');
                this.retryFailedRequests();
            });

            window.addEventListener('offline', () => {
                this.showNetworkStatus('网络已断开', 'error');
            });
        }
    }

    setupPerformanceMonitoring() {
        // 监控页面性能
        if ('performance' in window) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    if (perfData) {
                        this.logPerformance({
                            loadTime: perfData.loadEventEnd - perfData.loadEventStart,
                            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                            firstPaint: this.getFirstPaint(),
                            firstContentfulPaint: this.getFirstContentfulPaint()
                        });
                    }
                }, 0);
            });
        }
    }

    setupUserBehaviorTracking() {
        // 跟踪用户行为，用于优化用户体验
        this.trackUserInteractions();
        this.trackPageVisibility();
        this.trackScrollBehavior();
    }

    trackUserInteractions() {
        // 跟踪点击事件
        document.addEventListener('click', (event) => {
            this.logUserAction('click', {
                target: event.target.tagName,
                className: event.target.className,
                id: event.target.id,
                timestamp: Date.now()
            });
        });

        // 跟踪表单提交
        document.addEventListener('submit', (event) => {
            this.logUserAction('form_submit', {
                formId: event.target.id,
                formClass: event.target.className,
                timestamp: Date.now()
            });
        });
    }

    trackPageVisibility() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.logUserAction('page_hidden', { timestamp: Date.now() });
            } else {
                this.logUserAction('page_visible', { timestamp: Date.now() });
            }
        });
    }

    trackScrollBehavior() {
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.logUserAction('scroll', {
                    scrollY: window.scrollY,
                    scrollX: window.scrollX,
                    timestamp: Date.now()
                });
            }, 100);
        });
    }

    // 错误处理方法
    handleError(errorInfo) {
        console.error('Error handled:', errorInfo);
        
        // 记录错误
        this.logError(errorInfo);
        
        // 显示用户友好的错误消息
        this.showUserFriendlyError(errorInfo);
        
        // 尝试自动恢复
        this.attemptAutoRecovery(errorInfo);
        
        // 发送错误报告（可选）
        this.sendErrorReport(errorInfo);
    }

    logError(errorInfo) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            ...errorInfo
        };
        
        // 存储到localStorage
        const errorLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
        errorLogs.push(errorLog);
        
        // 只保留最近100条错误日志
        if (errorLogs.length > 100) {
            errorLogs.splice(0, errorLogs.length - 100);
        }
        
        localStorage.setItem('errorLogs', JSON.stringify(errorLogs));
    }

    showUserFriendlyError(errorInfo) {
        // 优先使用传入的具体消息，如果没有则使用错误类型对应的通用消息
        const message = errorInfo.message || this.getErrorMessage(errorInfo.type);
        
        if (window.MagicExperience) {
            window.MagicExperience.showMagicNotification(message, 'error', 5000);
        } else {
            this.showToast(message, 'error');
        }
        
        // 显示错误详情（开发环境）
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
            console.error('Error details:', errorInfo);
        } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // 本地开发环境
            console.error('Error details:', errorInfo);
        }
    }

    getErrorMessage(errorType) {
        return this.errorMessages[errorType] || this.errorMessages[this.errorTypes.UNKNOWN_ERROR];
    }

    attemptAutoRecovery(errorInfo) {
        // 根据错误类型尝试自动恢复
        switch (errorInfo.type) {
            case this.errorTypes.NETWORK_ERROR:
                this.retryNetworkRequest(errorInfo);
                break;
            case this.errorTypes.UPLOAD_ERROR:
                this.retryUpload(errorInfo);
                break;
            case this.errorTypes.PROCESSING_ERROR:
                this.retryProcessing(errorInfo);
                break;
        }
    }

    retryNetworkRequest(errorInfo) {
        const retryKey = `network_${errorInfo.url || 'unknown'}`;
        const attempts = this.retryAttempts.get(retryKey) || 0;
        
        if (attempts < this.maxRetryAttempts) {
            this.retryAttempts.set(retryKey, attempts + 1);
            
            setTimeout(() => {
                this.showToast(`正在重试... (${attempts + 1}/${this.maxRetryAttempts})`, 'info');
                // 这里可以重新发送请求
            }, this.retryDelay * (attempts + 1));
        }
    }

    retryUpload(errorInfo) {
        const retryKey = `upload_${errorInfo.fileName || 'unknown'}`;
        const attempts = this.retryAttempts.get(retryKey) || 0;
        
        if (attempts < this.maxRetryAttempts) {
            this.retryAttempts.set(retryKey, attempts + 1);
            
            setTimeout(() => {
                this.showToast(`正在重新上传... (${attempts + 1}/${this.maxRetryAttempts})`, 'info');
                // 这里可以重新上传文件
            }, this.retryDelay * (attempts + 1));
        }
    }

    retryProcessing(errorInfo) {
        const retryKey = `processing_${errorInfo.imageId || 'unknown'}`;
        const attempts = this.retryAttempts.get(retryKey) || 0;
        
        if (attempts < this.maxRetryAttempts) {
            this.retryAttempts.set(retryKey, attempts + 1);
            
            setTimeout(() => {
                this.showToast(`正在重新处理... (${attempts + 1}/${this.maxRetryAttempts})`, 'info');
                // 这里可以重新处理图片
            }, this.retryDelay * (attempts + 1));
        }
    }

    retryFailedRequests() {
        // 重试所有失败的请求
        this.retryAttempts.forEach((attempts, key) => {
            if (attempts < this.maxRetryAttempts) {
                this.showToast('网络已恢复，正在重试失败的请求...', 'info');
                // 这里可以重新发送失败的请求
            }
        });
        
        // 清空重试记录
        this.retryAttempts.clear();
    }

    sendErrorReport(errorInfo) {
        // 发送错误报告到服务器（可选）
        if (window.location.hostname !== 'localhost') {
            fetch('/api/v1/errors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: errorInfo,
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                })
            }).catch(() => {
                // 忽略发送错误报告失败的情况
            });
        }
    }

    // 用户友好的通知方法
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `error-toast error-toast-${type}`;
        toast.textContent = message;
        
        // 样式
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getToastColor(type)};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(toast);
        
        // 动画显示
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // 自动隐藏
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }

    showNetworkStatus(message, type) {
        const status = document.createElement('div');
        status.className = `network-status network-status-${type}`;
        status.textContent = message;
        
        // 样式
        status.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: ${this.getToastColor(type)};
            color: white;
            padding: 12px;
            text-align: center;
            font-size: 14px;
            font-weight: 500;
            z-index: 10001;
            transform: translateY(-100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(status);
        
        // 动画显示
        setTimeout(() => {
            status.style.transform = 'translateY(0)';
        }, 100);
        
        // 自动隐藏
        setTimeout(() => {
            status.style.transform = 'translateY(-100%)';
            setTimeout(() => {
                if (document.body.contains(status)) {
                    document.body.removeChild(status);
                }
            }, 300);
        }, 3000);
    }

    getToastColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }

    // 性能监控方法
    logPerformance(perfData) {
        console.log('Performance data:', perfData);
        
        // 存储性能数据
        const perfLogs = JSON.parse(localStorage.getItem('perfLogs') || '[]');
        perfLogs.push({
            timestamp: new Date().toISOString(),
            ...perfData
        });
        
        // 只保留最近50条性能日志
        if (perfLogs.length > 50) {
            perfLogs.splice(0, perfLogs.length - 50);
        }
        
        localStorage.setItem('perfLogs', JSON.stringify(perfLogs));
    }

    getFirstPaint() {
        const paintEntries = performance.getEntriesByType('paint');
        const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
        return firstPaint ? firstPaint.startTime : 0;
    }

    getFirstContentfulPaint() {
        const paintEntries = performance.getEntriesByType('paint');
        const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        return firstContentfulPaint ? firstContentfulPaint.startTime : 0;
    }

    // 用户行为分析方法
    logUserAction(action, data) {
        const actionLog = {
            timestamp: new Date().toISOString(),
            action,
            ...data
        };
        
        // 存储用户行为数据
        const actionLogs = JSON.parse(localStorage.getItem('actionLogs') || '[]');
        actionLogs.push(actionLog);
        
        // 只保留最近200条行为日志
        if (actionLogs.length > 200) {
            actionLogs.splice(0, actionLogs.length - 200);
        }
        
        localStorage.setItem('actionLogs', JSON.stringify(actionLogs));
    }

    // 获取错误统计
    getErrorStats() {
        const errorLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
        const stats = {};
        
        errorLogs.forEach(log => {
            stats[log.type] = (stats[log.type] || 0) + 1;
        });
        
        return stats;
    }

    // 获取性能统计
    getPerformanceStats() {
        const perfLogs = JSON.parse(localStorage.getItem('perfLogs') || '[]');
        
        if (perfLogs.length === 0) return null;
        
        const avgLoadTime = perfLogs.reduce((sum, log) => sum + log.loadTime, 0) / perfLogs.length;
        const avgDomContentLoaded = perfLogs.reduce((sum, log) => sum + log.domContentLoaded, 0) / perfLogs.length;
        
        return {
            averageLoadTime: avgLoadTime,
            averageDomContentLoaded: avgDomContentLoaded,
            totalSessions: perfLogs.length
        };
    }

    // 清理旧数据
    cleanup() {
        // 清理超过7天的数据
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        // 清理错误日志
        const errorLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
        const recentErrorLogs = errorLogs.filter(log => new Date(log.timestamp) > sevenDaysAgo);
        localStorage.setItem('errorLogs', JSON.stringify(recentErrorLogs));
        
        // 清理性能日志
        const perfLogs = JSON.parse(localStorage.getItem('perfLogs') || '[]');
        const recentPerfLogs = perfLogs.filter(log => new Date(log.timestamp) > sevenDaysAgo);
        localStorage.setItem('perfLogs', JSON.stringify(recentPerfLogs));
        
        // 清理行为日志
        const actionLogs = JSON.parse(localStorage.getItem('actionLogs') || '[]');
        const recentActionLogs = actionLogs.filter(log => new Date(log.timestamp) > sevenDaysAgo);
        localStorage.setItem('actionLogs', JSON.stringify(recentActionLogs));
    }

    // 手动报告错误
    reportError(type, message, details = {}) {
        this.handleError({
            type,
            message,
            ...details
        });
    }

    // 验证输入
    validateInput(input, rules) {
        const errors = [];
        
        if (rules.required && (!input || input.trim() === '')) {
            errors.push('此字段为必填项');
        }
        
        if (rules.minLength && input.length < rules.minLength) {
            errors.push(`最少需要${rules.minLength}个字符`);
        }
        
        if (rules.maxLength && input.length > rules.maxLength) {
            errors.push(`最多允许${rules.maxLength}个字符`);
        }
        
        if (rules.pattern && !rules.pattern.test(input)) {
            errors.push('格式不正确');
        }
        
        if (rules.email && !this.isValidEmail(input)) {
            errors.push('邮箱格式不正确');
        }
        
        if (rules.phone && !this.isValidPhone(input)) {
            errors.push('手机号格式不正确');
        }
        
        if (errors.length > 0) {
            this.reportError(this.errorTypes.VALIDATION_ERROR, errors.join(', '), {
                input,
                rules,
                errors
            });
        }
        
        return errors;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPhone(phone) {
        const phoneRegex = /^1[3-9]\d{9}$/;
        return phoneRegex.test(phone);
    }
}

// 初始化错误处理器
window.ErrorHandler = ErrorHandler;

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    window.errorHandler = new ErrorHandler();
    
    // 定期清理旧数据
    setInterval(() => {
        window.errorHandler.cleanup();
    }, 24 * 60 * 60 * 1000); // 每24小时清理一次
});
