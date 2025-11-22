// static/js/api.js - API客户端配置
class ApiClient {
    constructor() {
        this.baseURL = '/api/v1';
        this.adminBaseURL = '/api/v1/admin';
    }
    
    // 通用请求方法
    async request(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        // 添加设备ID头
        if (window.DeviceManager && window.DeviceManager.getDeviceId()) {
            defaultOptions.headers['X-Device-ID'] = window.DeviceManager.getDeviceId();
        }
        
        const config = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    }
    
    // 图片处理API
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const headers = {};
        // 添加设备ID头
        if (window.DeviceManager && window.DeviceManager.getDeviceId()) {
            headers['X-Device-ID'] = window.DeviceManager.getDeviceId();
        }
        
        const response = await fetch(`${this.baseURL}/upload`, {
            method: 'POST',
            headers: headers,
            body: formData
        });
        
        return response.json();
    }
    
    async generatePreview(imagePath, scale = 1.0, rotation = 0) {
        return this.request(`${this.baseURL}/preview`, {
            method: 'POST',
            body: JSON.stringify({
                image_path: imagePath,
                scale: scale,
                rotation: rotation
            })
        });
    }
    
    getImageURL(filename) {
        return `${this.baseURL}/image/${filename}`;
    }
    
    async deleteImage(filename) {
        return this.request(`${this.baseURL}/image/${filename}`, {
            method: 'DELETE'
        });
    }
    
    // 订单管理API
    async createOrder(orderData) {
        return this.request(`${this.baseURL}/orders`, {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    }
    
    async getOrder(orderNo) {
        return this.request(`${this.baseURL}/orders/${orderNo}`);
    }
    
    async getOrderStatus(orderNo) {
        return this.request(`${this.baseURL}/orders/${orderNo}/status`);
    }
    
    async updateOrder(orderNo, data) {
        return this.request(`${this.baseURL}/orders/${orderNo}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async deleteOrder(orderNo) {
        return this.request(`${this.baseURL}/orders/${orderNo}`, {
            method: 'DELETE'
        });
    }
    
    // 支付处理API
    async processPayment(paymentData) {
        return this.request(`${this.baseURL}/payment`, {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    }
    
    async getPaymentStatus(orderNo) {
        return this.request(`${this.baseURL}/payment/${orderNo}/status`);
    }
    
    async requestRefund(orderNo, reason) {
        return this.request(`${this.baseURL}/payment/${orderNo}/refund`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
    }
    
    // 发票管理API
    getInvoiceURL(orderNo) {
        return `${this.baseURL}/invoice/${orderNo}`;
    }
    
    getInvoiceQRURL(orderNo) {
        return `${this.baseURL}/invoice/${orderNo}/qr`;
    }
    
    async downloadInvoice(orderNo) {
        return this.request(`${this.baseURL}/invoice/${orderNo}/download`, {
            method: 'POST'
        });
    }
    
    // 配送管理API
    async createDelivery(deliveryData) {
        return this.request(`${this.baseURL}/delivery`, {
            method: 'POST',
            body: JSON.stringify(deliveryData)
        });
    }
    
    async getDelivery(deliveryId) {
        return this.request(`${this.baseURL}/delivery/${deliveryId}`);
    }
    
    async updateDelivery(deliveryId, data) {
        return this.request(`${this.baseURL}/delivery/${deliveryId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async getDeliveryTracking(deliveryId) {
        return this.request(`${this.baseURL}/delivery/${deliveryId}/tracking`);
    }
    
    // 作品管理API
    async getGallery(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`${this.baseURL}/gallery?${queryString}`);
    }
    
    async getBajiDetail(bajiId) {
        return this.request(`${this.baseURL}/gallery/${bajiId}`);
    }
    
    async likeBaji(bajiId) {
        return this.request(`${this.baseURL}/gallery/${bajiId}/like`, {
            method: 'POST'
        });
    }
    
    async makeSameBaji(bajiId) {
        return this.request(`${this.baseURL}/gallery/${bajiId}/make`, {
            method: 'POST'
        });
    }
    
    // 管理端API
    async adminLogin(password) {
        return this.request(`${this.adminBaseURL}/login`, {
            method: 'POST',
            body: JSON.stringify({ password })
        });
    }
    
    async adminLogout() {
        return this.request(`${this.adminBaseURL}/logout`, {
            method: 'POST'
        });
    }
    
    async checkAdminLogin() {
        return this.request(`${this.adminBaseURL}/check`);
    }
    
    async getAdminOrders(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`${this.adminBaseURL}/orders?${queryString}`);
    }
    
    async getAdminOrderDetail(orderId) {
        return this.request(`${this.adminBaseURL}/orders/${orderId}`);
    }
    
    async updateOrderStatus(orderId, status) {
        return this.request(`${this.adminBaseURL}/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }
    
    async updateOrder(orderId, data) {
        return this.request(`${this.adminBaseURL}/orders/${orderId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async deleteOrder(orderId) {
        return this.request(`${this.adminBaseURL}/orders/${orderId}`, {
            method: 'DELETE'
        });
    }
    
    async batchOrders(action, orderIds, data = {}) {
        return this.request(`${this.adminBaseURL}/orders/batch`, {
            method: 'POST',
            body: JSON.stringify({
                action,
                order_ids: orderIds,
                ...data
            })
        });
    }
    
    // 券码管理API
    async generateCoupons(couponData) {
        return this.request(`${this.adminBaseURL}/coupons`, {
            method: 'POST',
            body: JSON.stringify(couponData)
        });
    }
    
    async getCoupons(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`${this.adminBaseURL}/coupons?${queryString}`);
    }
    
    async getCouponDetail(couponId) {
        return this.request(`${this.adminBaseURL}/coupons/${couponId}`);
    }
    
    async updateCoupon(couponId, data) {
        return this.request(`${this.adminBaseURL}/coupons/${couponId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async deleteCoupon(couponId) {
        return this.request(`${this.adminBaseURL}/coupons/${couponId}`, {
            method: 'DELETE'
        });
    }
    
    async getCouponStats() {
        return this.request(`${this.adminBaseURL}/coupons/stats`);
    }
    
    // 打印管理API
    async exportPDF(exportData) {
        return this.request(`${this.adminBaseURL}/export/pdf`, {
            method: 'POST',
            body: JSON.stringify(exportData)
        });
    }
    
    async previewExport(exportData) {
        return this.request(`${this.adminBaseURL}/export/preview`, {
            method: 'POST',
            body: JSON.stringify(exportData)
        });
    }
    
    async getExportHistory(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`${this.adminBaseURL}/export/history?${queryString}`);
    }
    
    getDownloadURL(filename) {
        return `${this.adminBaseURL}/download/${filename}`;
    }
    
    // 配送管理API
    async getDeliveryList(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`${this.adminBaseURL}/delivery?${queryString}`);
    }
    
    async getDeliveryDetail(deliveryId) {
        return this.request(`${this.adminBaseURL}/delivery/${deliveryId}`);
    }
    
    async updateDeliveryStatus(deliveryId, data) {
        return this.request(`${this.adminBaseURL}/delivery/${deliveryId}/status`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async printDeliveryLabel(deliveryId) {
        return this.request(`${this.adminBaseURL}/delivery/${deliveryId}/label`, {
            method: 'POST'
        });
    }
    
    async getDeliveryStats() {
        return this.request(`${this.adminBaseURL}/delivery/stats`);
    }
    
    // 系统管理API
    async getDashboardStats() {
        return this.request(`${this.adminBaseURL}/dashboard/stats`);
    }
    
    async getLogs(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`${this.adminBaseURL}/logs?${queryString}`);
    }
    
    async getConfig() {
        return this.request(`${this.adminBaseURL}/config`);
    }
    
    async updateConfig(configs) {
        return this.request(`${this.adminBaseURL}/config`, {
            method: 'PUT',
            body: JSON.stringify({ configs })
        });
    }
}

// 创建全局API客户端实例
window.apiClient = new ApiClient();

// 工具函数
class ApiUtils {
    // 格式化日期
    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN');
    }
    
    // 格式化价格
    static formatPrice(price) {
        return `¥${parseFloat(price).toFixed(2)}`;
    }
    
    // 获取状态文本
    static getStatusText(status) {
        const statusMap = {
            'pending': '待支付',
            'processing': '处理中',
            'completed': '已完成',
            'cancelled': '已取消',
            'refund_requested': '退款申请中',
            'paid': '已支付',
            'failed': '支付失败',
            'refunded': '已退款'
        };
        return statusMap[status] || status;
    }
    
    // 获取状态样式类
    static getStatusClass(status) {
        const classMap = {
            'pending': 'status-pending',
            'processing': 'status-processing',
            'completed': 'status-completed',
            'cancelled': 'status-cancelled',
            'refund_requested': 'status-refund-requested',
            'paid': 'status-paid',
            'failed': 'status-failed',
            'refunded': 'status-refunded'
        };
        return classMap[status] || 'status-default';
    }
    
    // 显示消息
    static showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            if (document.body.contains(messageDiv)) {
                document.body.removeChild(messageDiv);
            }
        }, 3000);
    }
    
    // 显示错误
    static showError(message) {
        this.showMessage(message, 'error');
    }
    
    // 显示成功
    static showSuccess(message) {
        this.showMessage(message, 'success');
    }
    
    // 确认对话框
    static confirm(message) {
        return window.confirm(message);
    }
    
    // 下载文件
    static downloadFile(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // 复制到剪贴板
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showSuccess('已复制到剪贴板');
        } catch (error) {
            console.error('复制失败:', error);
            this.showError('复制失败');
        }
    }
    
    // 防抖函数
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // 节流函数
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// 将工具函数添加到全局
window.ApiUtils = ApiUtils;
