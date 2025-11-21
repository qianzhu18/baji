// mobile-optimizer.js - 移动端体验优化
class MobileOptimizer {
    constructor() {
        this.isMobile = this.detectMobile();
        this.touchHandler = null;
        this.gestureHandler = null;
        this.init();
    }

    init() {
        if (this.isMobile) {
            this.setupMobileOptimizations();
            this.setupTouchGestures();
            this.setupGestureHandling();
            this.optimizeForMobile();
        }
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    setupMobileOptimizations() {
        // 添加移动端特定的CSS类
        document.body.classList.add('mobile-device');
        
        // 设置视口元标签
        this.setupViewport();
        
        // 优化触摸目标大小
        this.optimizeTouchTargets();
        
        // 设置移动端特定的样式
        this.addMobileStyles();
    }

    setupViewport() {
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    }

    optimizeTouchTargets() {
        // 确保所有可点击元素至少有44px的触摸目标
        const clickableElements = document.querySelectorAll('button, a, input[type="button"], input[type="submit"], .clickable');
        
        clickableElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            if (rect.width < 44 || rect.height < 44) {
                element.style.minWidth = '44px';
                element.style.minHeight = '44px';
                element.style.padding = '12px 16px';
            }
        });
    }

    addMobileStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .mobile-device {
                -webkit-tap-highlight-color: transparent;
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                user-select: none;
            }
            
            .mobile-device .baji-preview-professional {
                transform: scale(0.8);
                transform-origin: center;
            }
            
            .mobile-device .controls-section {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                padding: 1rem;
                border-top: 1px solid #e5e7eb;
                z-index: 1000;
            }
            
            .mobile-device .action-buttons {
                display: flex;
                gap: 0.5rem;
                flex-wrap: wrap;
            }
            
            .mobile-device .action-buttons button {
                flex: 1;
                min-width: 0;
                font-size: 0.9rem;
                padding: 12px 8px;
            }
            
            .mobile-device .magic-button {
                font-size: 1rem;
                padding: 16px 24px;
                border-radius: 12px;
            }
            
            .mobile-device .magic-input {
                font-size: 16px; /* 防止iOS缩放 */
                padding: 12px 16px;
                border-radius: 8px;
            }
            
            .mobile-device .magic-card {
                margin: 0rem;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            
            /* 移动端特定的动画 */
            .mobile-device .magic-button:active {
                transform: scale(0.95);
                transition: transform 0.1s ease;
            }
            
            .mobile-device .magic-card:active {
                transform: scale(0.98);
                transition: transform 0.1s ease;
            }
        `;
        document.head.appendChild(style);
    }

    setupTouchGestures() {
        this.touchHandler = new MobileTouchHandler();
        this.touchHandler.init();
    }

    setupGestureHandling() {
        this.gestureHandler = new GestureHandler();
        this.gestureHandler.init();
    }

    optimizeForMobile() {
        // 优化图片加载
        this.optimizeImageLoading();
        
        // 优化滚动性能
        this.optimizeScrolling();
        
        // 优化内存使用
        this.optimizeMemoryUsage();
        
        // 设置移动端特定的交互
        this.setupMobileInteractions();
    }

    optimizeImageLoading() {
        // 延迟加载非关键图片
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }

    optimizeScrolling() {
        // 使用passive事件监听器提高滚动性能
        document.addEventListener('touchstart', () => {}, { passive: true });
        document.addEventListener('touchmove', () => {}, { passive: true });
        document.addEventListener('touchend', () => {}, { passive: true });
    }

    optimizeMemoryUsage() {
        // 清理不需要的事件监听器
        window.addEventListener('beforeunload', () => {
            if (this.touchHandler) {
                this.touchHandler.cleanup();
            }
            if (this.gestureHandler) {
                this.gestureHandler.cleanup();
            }
        });
    }

    setupMobileInteractions() {
        // 添加移动端特定的交互反馈
        document.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('magic-button') || 
                e.target.classList.contains('magic-card')) {
                e.target.style.transform = 'scale(0.95)';
            }
        });
        
        document.addEventListener('touchend', (e) => {
            if (e.target.classList.contains('magic-button') || 
                e.target.classList.contains('magic-card')) {
                setTimeout(() => {
                    e.target.style.transform = '';
                }, 100);
            }
        });
    }

    // 移动端特定的工具方法
    vibrate(pattern = [100]) {
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }

    showMobileToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `mobile-toast mobile-toast-${type}`;
        toast.textContent = message;
        
        // 移动端特定的样式
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 16px;
            border-radius: 12px;
            text-align: center;
            font-size: 16px;
            font-weight: 500;
            z-index: 10000;
            transform: translateY(-100px);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // 动画显示
        setTimeout(() => {
            toast.style.transform = 'translateY(0)';
        }, 100);
        
        // 自动隐藏
        setTimeout(() => {
            toast.style.transform = 'translateY(-100px)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // 移动端特定的Magic Experience集成
    integrateWithMagicExperience() {
        if (window.MagicExperience) {
            // 重写通知方法以使用移动端优化的toast
            const originalShowNotification = window.MagicExperience.showMagicNotification;
            window.MagicExperience.showMagicNotification = (message, type, duration) => {
                if (this.isMobile) {
                    this.showMobileToast(message, type);
                } else {
                    originalShowNotification.call(window.MagicExperience, message, type, duration);
                }
            };
            
            // 添加触觉反馈
            const originalCelebrateSuccess = window.MagicExperience.showSuccessCelebration;
            window.MagicExperience.showSuccessCelebration = (emoji) => {
                this.vibrate([100, 50, 100]);
                originalCelebrateSuccess.call(window.MagicExperience, emoji);
            };
        }
    }
}

// 触摸处理器类
class MobileTouchHandler {
    constructor() {
        this.touches = new Map();
        this.gestures = new Map();
    }

    init() {
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    }

    handleTouchStart(e) {
        Array.from(e.touches).forEach(touch => {
            this.touches.set(touch.identifier, {
                startX: touch.clientX,
                startY: touch.clientY,
                startTime: Date.now(),
                element: touch.target
            });
        });
    }

    handleTouchMove(e) {
        Array.from(e.touches).forEach(touch => {
            const touchData = this.touches.get(touch.identifier);
            if (touchData) {
                const deltaX = touch.clientX - touchData.startX;
                const deltaY = touch.clientY - touchData.startY;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                // 检测滑动方向
                if (distance > 10) {
                    if (Math.abs(deltaX) > Math.abs(deltaY)) {
                        touchData.direction = deltaX > 0 ? 'right' : 'left';
                    } else {
                        touchData.direction = deltaY > 0 ? 'down' : 'up';
                    }
                }
            }
        });
    }

    handleTouchEnd(e) {
        Array.from(e.changedTouches).forEach(touch => {
            const touchData = this.touches.get(touch.identifier);
            if (touchData) {
                const duration = Date.now() - touchData.startTime;
                const deltaX = touch.clientX - touchData.startX;
                const deltaY = touch.clientY - touchData.startY;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                // 检测手势类型
                if (duration < 300 && distance < 10) {
                    this.handleTap(touchData.element, touch.clientX, touch.clientY);
                } else if (distance > 50) {
                    this.handleSwipe(touchData.element, touchData.direction, distance);
                }
                
                this.touches.delete(touch.identifier);
            }
        });
    }

    handleTap(element, x, y) {
        // 处理点击事件
        if (element.classList.contains('magic-button')) {
            this.vibrate([50]);
        }
    }

    handleSwipe(element, direction, distance) {
        // 处理滑动手势
        console.log(`Swipe ${direction} detected on ${element.tagName}`);
        
        // 可以根据滑动方向执行特定操作
        switch (direction) {
            case 'left':
                // 左滑操作
                break;
            case 'right':
                // 右滑操作
                break;
            case 'up':
                // 上滑操作
                break;
            case 'down':
                // 下滑操作
                break;
        }
    }

    vibrate(pattern) {
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }

    cleanup() {
        document.removeEventListener('touchstart', this.handleTouchStart);
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
    }
}

// 手势处理器类
class GestureHandler {
    constructor() {
        this.pinchDistance = 0;
        this.rotation = 0;
    }

    init() {
        // 处理双指手势
        document.addEventListener('touchstart', this.handleGestureStart.bind(this));
        document.addEventListener('touchmove', this.handleGestureMove.bind(this));
        document.addEventListener('touchend', this.handleGestureEnd.bind(this));
    }

    handleGestureStart(e) {
        if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            this.pinchDistance = this.getDistance(touch1, touch2);
            this.rotation = this.getAngle(touch1, touch2);
        }
    }

    handleGestureMove(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = this.getDistance(touch1, touch2);
            const currentRotation = this.getAngle(touch1, touch2);
            
            const scale = currentDistance / this.pinchDistance;
            const rotationDelta = currentRotation - this.rotation;
            
            // 处理缩放和旋转
            this.handlePinchZoom(scale);
            this.handleRotation(rotationDelta);
        }
    }

    handleGestureEnd(e) {
        this.pinchDistance = 0;
        this.rotation = 0;
    }

    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getAngle(touch1, touch2) {
        return Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX);
    }

    handlePinchZoom(scale) {
        // 处理缩放手势
        const previewElement = document.querySelector('.baji-preview-professional');
        if (previewElement) {
            const currentScale = parseFloat(previewElement.style.transform.match(/scale\(([^)]+)\)/) || [0, 1])[1];
            const newScale = Math.max(0.5, Math.min(2, currentScale * scale));
            previewElement.style.transform = `scale(${newScale})`;
        }
    }

    handleRotation(rotationDelta) {
        // 处理旋转手势
        const previewElement = document.querySelector('.baji-preview-professional');
        if (previewElement) {
            const currentRotation = parseFloat(previewElement.style.transform.match(/rotate\(([^)]+)deg\)/) || [0, 0])[1];
            const newRotation = currentRotation + rotationDelta * 180 / Math.PI;
            previewElement.style.transform += ` rotate(${newRotation}deg)`;
        }
    }

    cleanup() {
        document.removeEventListener('touchstart', this.handleGestureStart);
        document.removeEventListener('touchmove', this.handleGestureMove);
        document.removeEventListener('touchend', this.handleGestureEnd);
    }
}

// 初始化移动端优化器
window.MobileOptimizer = MobileOptimizer;

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    window.mobileOptimizer = new MobileOptimizer();
    
    // 集成Magic Experience
    if (window.mobileOptimizer) {
        window.mobileOptimizer.integrateWithMagicExperience();
    }
});
