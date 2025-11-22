// user-menu.js - 用户菜单组件
// 提供统一的用户菜单功能，包括用户状态、设置、历史记录等

class UserMenu {
    constructor() {
        this.isOpen = false;
        this.userStateManager = window.UserStateManager;
        this.init();
    }

    init() {
        console.log('👤 用户菜单组件初始化');
        this.createMenuHTML();
        this.setupEventListeners();
    }

    createMenuHTML() {
        // 创建用户菜单的HTML结构
        const menuHTML = `
            <!-- 用户菜单按钮 -->
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
                <div v-if="userMenuOpen" class="user-menu-dropdown absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
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
                        <!--
                        <button @click="resetUserData" class="flex items-center w-full px-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md">
                            <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                            </svg>
                            重置数据
                        </button>
                        -->
                    </div>
                </div>
            </div>
        `;
        
        return menuHTML;
    }

    setupEventListeners() {
        // 点击外部关闭菜单
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu-btn') && !e.target.closest('.user-menu-dropdown')) {
                this.isOpen = false;
            }
        });

        // ESC键关闭菜单
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.isOpen = false;
            }
        });
    }

    // Vue.js 方法
    toggleUserMenu() {
        this.isOpen = !this.isOpen;
    }
 
 
 

    showHelp() {
        this.isOpen = false;
        // 显示帮助信息
        alert('帮助中心功能开发中...');
    }

    // resetUserData() {
    //     this.isOpen = false;
    //     if (this.userStateManager) {
    //         this.userStateManager.resetAllData();
    //     }
    // }

    showSettingsModal() {
        // 创建设置模态框
        const modalHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">用户设置</h3>
                        <button @click="closeSettingsModal" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">默认数量</label>
                            <input type="number" v-model="settings.defaultQuantity" min="1" max="100" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">默认支付方式</label>
                            <select v-model="settings.defaultPaymentMethod" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="coupon">优惠券</option>
                                <option value="alipay">支付宝</option>
                                <option value="wechat">微信支付</option>
                            </select>
                        </div>
                        
                        <div class="flex items-center">
                            <input type="checkbox" v-model="settings.autoSave" class="mr-2">
                            <label class="text-sm text-gray-700">自动保存</label>
                        </div>
                        
                        <div class="flex items-center">
                            <input type="checkbox" v-model="settings.magicEffects" class="mr-2">
                            <label class="text-sm text-gray-700">魔法效果</label>
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-3 mt-6">
                        <button @click="closeSettingsModal" class="px-4 py-2 text-gray-600 hover:text-gray-800">取消</button>
                        <button @click="saveSettings" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button>
                    </div>
                </div>
            </div>
        `;
        
        // 这里需要集成到Vue组件中
        console.log('显示用户设置模态框');
    }

    showStatsModal(stats) {
        const modalHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">使用统计</h3>
                        <button @click="closeStatsModal" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="space-y-3">
                        <div class="flex justify-between">
                            <span class="text-gray-600">总订单数:</span>
                            <span class="font-medium">${stats.totalOrders}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">最近订单:</span>
                            <span class="font-medium">${stats.recentOrdersCount}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">搜索历史:</span>
                            <span class="font-medium">${stats.searchHistoryCount}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">收藏数量:</span>
                            <span class="font-medium">${stats.favoritesCount}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">编辑历史:</span>
                            <span class="font-medium">${stats.editHistoryCount}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">最后更新:</span>
                            <span class="font-medium text-sm">${stats.lastUpdated}</span>
                        </div>
                    </div>
                    
                    <div class="flex justify-end mt-6">
                        <button @click="closeStatsModal" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">关闭</button>
                    </div>
                </div>
            </div>
        `;
        
        console.log('显示使用统计模态框', stats);
    }
}

// 全局实例
window.UserMenu = UserMenu;

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserMenu;
}

