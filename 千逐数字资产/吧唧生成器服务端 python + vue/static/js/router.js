// static/js/router.js - Vue Router配置
// 注意：这是一个简化的路由配置，实际项目中可能需要根据具体需求调整

class SimpleRouter {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.init();
    }

    init() {
        // 定义路由
        this.defineRoutes();
        
        // 监听路由变化
        window.addEventListener('popstate', () => {
            this.handleRouteChange();
        });
        
        // 处理初始路由
        this.handleRouteChange();
    }

    defineRoutes() {
        // 用户端路由
        this.addRoute('/', 'Home', () => this.loadPage('index.html'));
        this.addRoute('/design', 'Design', () => this.loadPage('design.html'));
        this.addRoute('/order/:orderNo', 'Order', (params) => this.loadPage('order.html', params));
        this.addRoute('/orders', 'Orders', () => this.loadPage('orders.html'));
        this.addRoute('/invoice/:orderNo', 'Invoice', (params) => this.loadPage('invoice.html', params));
        this.addRoute('/delivery', 'Delivery', () => this.loadPage('delivery.html'));
        this.addRoute('/view/:bajiId', 'View', (params) => this.loadPage('view.html', params));
        this.addRoute('/gallery', 'Gallery', () => this.loadPage('gallery.html'));
        this.addRoute('/error', 'Error', () => this.loadPage('error.html'));
        this.addRoute('/payment', 'Payment', () => this.loadPage('payment.html'));

        // 管理端路由
        this.addRoute('/admin/login', 'AdminLogin', () => this.loadPage('admin/login.html'));
        this.addRoute('/admin/dashboard', 'AdminDashboard', () => this.loadPage('admin/dashboard.html'));
        this.addRoute('/admin/orders', 'AdminOrders', () => this.loadPage('admin/orders.html'));
        this.addRoute('/admin/coupons', 'AdminCoupons', () => this.loadPage('admin/coupons.html'));
        this.addRoute('/admin/print', 'AdminPrint', () => this.loadPage('admin/print.html'));
        this.addRoute('/admin/delivery', 'AdminDelivery', () => this.loadPage('admin/delivery.html'));
    }

    addRoute(path, name, handler) {
        this.routes.set(path, { name, handler });
    }

    navigate(path, params = {}) {
        // 更新URL
        window.history.pushState({ path, params }, '', path);
        
        // 处理路由变化
        this.handleRouteChange();
    }

    handleRouteChange() {
        const path = window.location.pathname;
        const route = this.findRoute(path);
        
        if (route) {
            this.currentRoute = route;
            const params = this.extractParams(path, route.path);
            route.handler(params);
        } else {
            // 404处理
            this.navigate('/error?code=404&message=页面未找到');
        }
    }

    findRoute(path) {
        for (const [routePath, route] of this.routes) {
            if (this.matchRoute(path, routePath)) {
                return { path: routePath, ...route };
            }
        }
        return null;
    }

    matchRoute(path, routePath) {
        const pathSegments = path.split('/').filter(segment => segment);
        const routeSegments = routePath.split('/').filter(segment => segment);
        
        if (pathSegments.length !== routeSegments.length) {
            return false;
        }
        
        for (let i = 0; i < pathSegments.length; i++) {
            const routeSegment = routeSegments[i];
            const pathSegment = pathSegments[i];
            
            if (routeSegment.startsWith(':')) {
                // 参数匹配
                continue;
            } else if (routeSegment !== pathSegment) {
                return false;
            }
        }
        
        return true;
    }

    extractParams(path, routePath) {
        const params = {};
        const pathSegments = path.split('/').filter(segment => segment);
        const routeSegments = routePath.split('/').filter(segment => segment);
        
        for (let i = 0; i < pathSegments.length; i++) {
            const routeSegment = routeSegments[i];
            const pathSegment = pathSegments[i];
            
            if (routeSegment.startsWith(':')) {
                const paramName = routeSegment.substring(1);
                params[paramName] = pathSegment;
            }
        }
        
        return params;
    }

    loadPage(templatePath, params = {}) {
        // 这里可以实现页面加载逻辑
        // 由于这是一个Flask应用，页面通常由服务器端渲染
        // 这个方法主要用于路由匹配和参数提取
        
        console.log(`Loading page: ${templatePath}`, params);
        
        // 可以在这里添加页面加载前的逻辑
        this.beforeRouteEnter(templatePath, params);
    }

    beforeRouteEnter(templatePath, params) {
        // 路由进入前的钩子
        // 可以在这里进行权限检查、数据预加载等
        
        if (templatePath.startsWith('admin/')) {
            this.checkAdminAuth();
        }
    }

    async checkAdminAuth() {
        try {
            const response = await fetch('/api/v1/admin/check');
            const data = await response.json();
            
            if (!data.logged_in) {
                this.navigate('/admin/login');
            }
        } catch (error) {
            console.error('检查管理员认证失败:', error);
            this.navigate('/admin/login');
        }
    }

    // 获取当前路由信息
    getCurrentRoute() {
        return this.currentRoute;
    }

    // 获取当前路径
    getCurrentPath() {
        return window.location.pathname;
    }

    // 获取查询参数
    getQueryParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    }

    // 设置查询参数
    setQueryParams(params) {
        const url = new URL(window.location);
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.set(key, params[key]);
            } else {
                url.searchParams.delete(key);
            }
        });
        window.history.replaceState({}, '', url);
    }
}

// 创建全局路由实例
window.router = new SimpleRouter();

// 路由工具函数
class RouterUtils {
    // 导航到指定路径
    static navigate(path, params = {}) {
        window.router.navigate(path, params);
    }

    // 返回上一页
    static back() {
        window.history.back();
    }

    // 刷新当前页面
    static reload() {
        window.location.reload();
    }

    // 替换当前路由
    static replace(path, params = {}) {
        window.history.replaceState({ path, params }, '', path);
        window.router.handleRouteChange();
    }

    // 获取当前路由参数
    static getParams() {
        const route = window.router.getCurrentRoute();
        if (route) {
            return window.router.extractParams(
                window.location.pathname, 
                route.path
            );
        }
        return {};
    }

    // 获取查询参数
    static getQuery() {
        return window.router.getQueryParams();
    }

    // 设置查询参数
    static setQuery(params) {
        window.router.setQueryParams(params);
    }

    // 检查当前路径是否匹配
    static isActive(path) {
        return window.location.pathname === path;
    }

    // 检查当前路径是否匹配（支持参数）
    static matches(path) {
        return window.router.matchRoute(window.location.pathname, path);
    }
}

// 将路由工具函数添加到全局
window.RouterUtils = RouterUtils;

// 页面导航助手
class NavigationHelper {
    // 导航到首页
    static goHome() {
        RouterUtils.navigate('/');
    }

    // 导航到设计页面
    static goToDesign() {
        RouterUtils.navigate('/design');
    }

    // 导航到订单页面
    static goToOrder(orderNo) {
        RouterUtils.navigate(`/order/${orderNo}`);
    }

    // 导航到订单列表
    static goToOrders() {
        RouterUtils.navigate('/orders');
    }

    // 导航到发票页面
    static goToInvoice(orderNo) {
        RouterUtils.navigate(`/invoice/${orderNo}`);
    }

    // 导航到配送页面
    static goToDelivery() {
        RouterUtils.navigate('/delivery');
    }

    // 导航到作品查看页面
    static goToView(bajiId) {
        RouterUtils.navigate(`/view/${bajiId}`);
    }

    // 导航到作品展示页面
    static goToGallery() {
        RouterUtils.navigate('/gallery');
    }

    // 导航到错误页面
    static goToError(code, message) {
        const params = { code, message };
        RouterUtils.navigate('/error', params);
    }

    // 导航到支付页面
    static goToPayment() {
        RouterUtils.navigate('/payment');
    }

    // 导航到管理员登录页面
    static goToAdminLogin() {
        RouterUtils.navigate('/admin/login');
    }

    // 导航到管理员仪表盘
    static goToAdminDashboard() {
        RouterUtils.navigate('/admin/dashboard');
    }

    // 导航到管理员订单管理页面
    static goToAdminOrders() {
        RouterUtils.navigate('/admin/orders');
    }

    // 导航到管理员券码管理页面
    static goToAdminCoupons() {
        RouterUtils.navigate('/admin/coupons');
    }

    // 导航到管理员打印管理页面
    static goToAdminPrint() {
        RouterUtils.navigate('/admin/print');
    }

    // 导航到管理员配送管理页面
    static goToAdminDelivery() {
        RouterUtils.navigate('/admin/delivery');
    }
}

// 将导航助手添加到全局
window.NavigationHelper = NavigationHelper;
