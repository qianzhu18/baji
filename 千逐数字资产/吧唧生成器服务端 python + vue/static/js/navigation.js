// navigation.js - 统一导航组件
// 提供统一的导航栏功能，包括主菜单和用户菜单

class NavigationComponent {
    constructor() {
        this.isOpen = false;
        this.userMenuOpen = false;
        this.userStateManager = window.UserStateManager;
        this.init();
    }

    init() {
        console.log('🧭 统一导航组件初始化');
        this.setupEventListeners();
    }

    // 获取导航栏CSS样式
    getNavigationCSS() {
        return `
            <style>
                .user-menu-dropdown {
                    transition: all 0.2s ease-out;
                    transform-origin: top right;
                }
                
                .menu-open {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                    visibility: visible;
                }
                
                .menu-closed {
                    opacity: 0;
                    transform: translateY(-10px) scale(0.95);
                    visibility: hidden;
                }
                
                .user-menu-btn {
                    transition: all 0.2s ease-out;
                }
                
                .user-menu-btn:hover {
                    transform: translateY(-1px);
                }
                
                .user-menu-dropdown a,
                .user-menu-dropdown button {
                    transition: all 0.15s ease-out;
                }
                
                .user-menu-dropdown a:hover,
                .user-menu-dropdown button:hover {
                    transform: translateX(2px);
                    background-color: rgba(59, 130, 246, 0.05);
                }
            </style>
        `;
    }

    // 获取导航栏HTML模板（不包含Vue指令）
    getNavigationTemplate() {
        return `
            <!-- 导航栏 -->
            <nav class="navbar bg-white shadow-sm border-b border-gray-200">
                <div class="container mx-auto px-4">
                    <div class="flex items-center justify-between h-16">
                        <!-- Logo和标题 -->
                        <div class="flex items-center space-x-4">
                            <a href="/" class="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors">
                                <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                                </svg>
                                <span class="text-xl font-bold">吧唧生成器</span>
                            </a>
                        </div>

                        <!-- 导航菜单 -->
                        <div class="hidden md:flex items-center space-x-6">
                            <a href="/" class="nav-link text-gray-600 hover:text-blue-600 transition-colors">
                                首页
                            </a>
                            <a href="/gallery" class="nav-link text-gray-600 hover:text-blue-600 transition-colors">
                                作品画廊
                            </a>
                            <a href="/design" class="nav-link text-gray-600 hover:text-blue-600 transition-colors">
                                开始设计
                            </a>
                            <a href="/history" class="nav-link text-gray-600 hover:text-blue-600 transition-colors">
                                制作历史
                            </a>
                            <a href="/orders" class="nav-link text-gray-600 hover:text-blue-600 transition-colors">
                                我的订单
                            </a>
                        </div>

                        <!-- 用户菜单 -->
                        <div class="flex items-center space-x-2">
                            <div class="relative">
                                <button @click="toggleUserMenu" class="user-menu-btn flex items-center space-x-2 p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition-colors">
                                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                        </svg>
                                    </div>
                                    <span class="hidden md:block text-sm font-medium">我的账户</span>
                                    <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': userMenuOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                    </svg>
                                </button>

                                <!-- 用户菜单下拉 -->
                                <div v-show="userMenuOpen" class="user-menu-dropdown absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50" :class="{ 'menu-open': userMenuOpen, 'menu-closed': !userMenuOpen }">
                                    <!-- 用户信息 -->
                                    <div class="px-4 py-3 border-b border-gray-100">
                                        <div class="flex items-center space-x-3">
                                            <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                                </svg>
                                            </div>
                                            <div>
                                                <p class="text-sm font-medium text-gray-900">访客用户</p>
                                                <p class="text-xs text-gray-500">基于订单号的身份管理</p>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 快速操作 -->
                                    <div class="px-2 py-2">
                                        <a href="/" class="flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                                            <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"></path>
                                            </svg>
                                            首页
                                        </a>
                                        <a href="/gallery" class="flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                                            <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                            </svg>
                                            作品画廊
                                        </a>
                                        <a href="/design" class="flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                                            <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                            </svg>
                                            开始设计
                                        </a>
                                        <a href="/orders" class="flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                                            <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                                            </svg>
                                            我的订单
                                        </a>
                                        <a href="/history" class="flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                                            <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            设计历史
                                        </a>
                                        <a href="/delivery" class="flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                                            <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                                            </svg>
                                            配送管理
                                        </a>
                                    </div>
 
                                    <!-- 分隔线 -->
                                    <div class="border-t border-gray-100 my-2"></div>

                                    <!-- 帮助和关于 -->
                                    <div class="px-2 py-2">
                                        <button @click="showHelp" class="flex items-center w-full px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                                            <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            帮助中心
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        `;
    }

    setupEventListeners() {
        // 点击外部关闭菜单
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu-btn') && !e.target.closest('.user-menu-dropdown')) {
                this.userMenuOpen = false;
            }
        });

        // ESC键关闭菜单
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.userMenuOpen = false;
            }
        });
    }

    // Vue.js 方法
    toggleUserMenu() {
        this.userMenuOpen = !this.userMenuOpen;
    }
 
 
 
    showHelp() {
        this.userMenuOpen = false;
        alert('帮助中心功能开发中...');
    }

    // 获取Vue组件数据
    getVueData() {
        return {
            userMenuOpen: false  // 默认关闭
        };
    }

    // 获取Vue方法
    getVueMethods() {
        return {
            toggleUserMenu() {
                this.userMenuOpen = !this.userMenuOpen;
            },  
            showHelp() {
                this.userMenuOpen = false;
                alert('帮助中心功能开发中...');
            },
            // resetUserData() {
            //     this.userMenuOpen = false;
            //     if (window.UserStateManager) {
            //         window.UserStateManager.resetAllData();
            //     }
            // }
        };
    }
}

// 全局实例
window.NavigationComponent = NavigationComponent;

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationComponent;
}

