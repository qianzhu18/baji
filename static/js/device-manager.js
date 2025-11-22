// static/js/device-manager.js
/**
 * 设备ID管理器
 * 负责设备ID的生成、存储和管理
 */

class DeviceManager {
    constructor() {
        this.storageKey = 'baji-device-id';
        this.deviceId = null;
        this.init();
    }

    init() {
        console.log('🔧 设备管理器初始化');
        this.loadDeviceId();
        this.setupEventListeners();
    }

    /**
     * 加载或生成设备ID
     */
    loadDeviceId() {
        try {
            // 尝试从localStorage加载设备ID
            this.deviceId = localStorage.getItem(this.storageKey);
            
            if (!this.deviceId || !this.validateDeviceId(this.deviceId)) {
                // 生成新的设备ID
                this.deviceId = this.generateDeviceId();
                localStorage.setItem(this.storageKey, this.deviceId);
                console.log('🆕 生成新设备ID:', this.deviceId);
            } else {
                console.log('📱 加载现有设备ID:', this.deviceId);
            }
        } catch (error) {
            console.error('❌ 设备ID加载失败:', error);
            // 生成临时设备ID
            this.deviceId = this.generateDeviceId();
        }
    }

    /**
     * 生成设备ID
     * 格式：DEV + 13位时间戳 + 9位随机字符
     */
    generateDeviceId() {
        const timestamp = Date.now().toString();
        const randomPart = Math.random().toString(36).substr(2, 9).toUpperCase();
        return `DEV${timestamp}${randomPart}`;
    }

    /**
     * 验证设备ID格式
     */
    validateDeviceId(deviceId) {
        if (!deviceId || typeof deviceId !== 'string') {
            return false;
        }

        // 检查格式：DEV + 13位数字 + 9位字符
        const pattern = /^DEV\d{13}[A-Z0-9]{9}$/;
        return pattern.test(deviceId);
    }

    /**
     * 获取当前设备ID
     */
    getDeviceId() {
        return this.deviceId;
    }

    /**
     * 重置设备ID
     */
    resetDeviceId() {
        try {
            localStorage.removeItem(this.storageKey);
            this.deviceId = this.generateDeviceId();
            localStorage.setItem(this.storageKey, this.deviceId);
            console.log('🔄 设备ID已重置:', this.deviceId);
            return this.deviceId;
        } catch (error) {
            console.error('❌ 设备ID重置失败:', error);
            return null;
        }
    }

    /**
     * 获取设备信息
     */
    getDeviceInfo() {
        return {
            deviceId: this.deviceId,
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 页面卸载时保存设备ID
        window.addEventListener('beforeunload', () => {
            this.saveDeviceId();
        });

        // 定期保存设备ID（每5分钟）
        setInterval(() => {
            this.saveDeviceId();
        }, 5 * 60 * 1000);
    }

    /**
     * 保存设备ID
     */
    saveDeviceId() {
        try {
            if (this.deviceId) {
                localStorage.setItem(this.storageKey, this.deviceId);
            }
        } catch (error) {
            console.error('❌ 设备ID保存失败:', error);
        }
    }

    /**
     * 检查设备ID是否有效
     */
    isDeviceIdValid() {
        return this.deviceId && this.validateDeviceId(this.deviceId);
    }

    /**
     * 获取设备ID用于API请求头
     */
    getApiHeaders() {
        return {
            'X-Device-ID': this.deviceId,
            'Content-Type': 'application/json'
        };
    }

    /**
     * 获取设备ID用于FormData请求
     */
    getFormDataHeaders() {
        return {
            'X-Device-ID': this.deviceId
        };
    }
}

// 创建全局设备管理器实例
window.DeviceManager = new DeviceManager();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeviceManager;
}

console.log('🔧 设备管理器已加载');
