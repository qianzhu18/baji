// user-state-manager.js - 用户状态管理系统
// 实现无注册用户体验，基于localStorage和订单号的身份管理

class UserStateManager {
  constructor() {
    this.storageKey = 'baji-user-state';
    this.defaultState = this.getDefaultState();
    this.state = this.loadState();
    this.init();
  }

  init() {
    console.log('👤 用户状态管理系统初始化');
    this.setupEventListeners();
    this.cleanupExpiredData();
  }

  getDefaultState() {
    return {
      version: '1.0.0',
      userPreferences: {
        defaultQuantity: 1,
        defaultPaymentMethod: 'coupon',
        recentOrders: [],
        settings: {
          autoSave: true,
          tutorial: true,
          theme: 'light',
          magicEffects: true,
          soundEffects: true,
          particleEffects: true
        },
        magicSettings: {
          particleDensity: 'medium',
          soundVolume: 0.3,
          celebrationEffects: true,
          dragEffects: true
        },
        professionalSettings: {
          defaultScale: 1.0,
          defaultRotation: 0,
          showGrid: false,
          showDimensions: true,
          previewQuality: 'high'
        }
      },
      orderHistory: {
        orders: [],
        searchHistory: [],
        favorites: []
      },
      tempData: {
        currentImage: null,
        editHistory: [],
        lastSaved: null,
        magicState: null,
        professionalState: null
      },
      lastUpdated: Date.now()
    };
  }

  loadState() {
    try {
      const savedState = localStorage.getItem(this.storageKey);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        // 合并默认状态和保存的状态
        return this.mergeStates(this.defaultState, parsedState);
      }
    } catch (error) {
      console.warn('加载用户状态失败:', error);
    }
    return { ...this.defaultState };
  }

  mergeStates(defaultState, savedState) {
    const merged = { ...defaultState };
    
    // 递归合并对象
    const deepMerge = (target, source) => {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          target[key] = target[key] || {};
          deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    };
    
    deepMerge(merged, savedState);
    return merged;
  }

  saveState() {
    try {
      this.state.lastUpdated = Date.now();
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
      console.log('💾 用户状态已保存');
    } catch (error) {
      console.error('保存用户状态失败:', error);
    }
  }

  // 用户偏好设置管理
  updateUserPreferences(preferences) {
    this.state.userPreferences = { ...this.state.userPreferences, ...preferences };
    this.saveState();
  }

  getPreference(key, defaultValue = null) {
    const keys = key.split('.');
    let value = this.state.userPreferences;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }
    
    return value !== undefined ? value : defaultValue;
  }

  setPreference(key, value) {
    const keys = key.split('.');
    let target = this.state.userPreferences;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) {
        target[keys[i]] = {};
      }
      target = target[keys[i]];
    }
    
    target[keys[keys.length - 1]] = value;
    this.saveState();
  }

  // 魔法设置管理
  updateMagicSettings(settings) {
    this.state.userPreferences.magicSettings = { 
      ...this.state.userPreferences.magicSettings, 
      ...settings 
    };
    this.saveState();
    
    // 同步到Magic Experience系统
    if (window.MagicExperience) {
      window.MagicExperience.updateSettings(settings);
    }
  }

  // 专业设置管理
  updateProfessionalSettings(settings) {
    this.state.userPreferences.professionalSettings = { 
      ...this.state.userPreferences.professionalSettings, 
      ...settings 
    };
    this.saveState();
  }

  // 订单历史管理
  addOrderHistory(orderData) {
    const order = {
      orderNo: orderData.order_no,
      status: orderData.status,
      paymentStatus: orderData.payment_status,
      totalPrice: orderData.total_price,
      createdAt: orderData.created_at,
      imagePath: orderData.processed_image_path,
      timestamp: Date.now()
    };
    
    // 添加到订单历史
    this.state.orderHistory.orders.unshift(order);
    
    // 限制历史记录数量
    if (this.state.orderHistory.orders.length > 50) {
      this.state.orderHistory.orders = this.state.orderHistory.orders.slice(0, 50);
    }
    
    // 添加到最近订单
    this.state.userPreferences.recentOrders.unshift(order);
    if (this.state.userPreferences.recentOrders.length > 10) {
      this.state.userPreferences.recentOrders = this.state.userPreferences.recentOrders.slice(0, 10);
    }
    
    this.saveState();
  }

  getOrderHistory() {
    return this.state.orderHistory.orders;
  }

  getRecentOrders() {
    return this.state.userPreferences.recentOrders;
  }

  // 搜索历史管理
  addSearchHistory(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') return;
    
    const trimmedTerm = searchTerm.trim();
    
    // 移除重复项
    this.state.orderHistory.searchHistory = this.state.orderHistory.searchHistory.filter(
      term => term !== trimmedTerm
    );
    
    // 添加到开头
    this.state.orderHistory.searchHistory.unshift(trimmedTerm);
    
    // 限制搜索历史数量
    if (this.state.orderHistory.searchHistory.length > 20) {
      this.state.orderHistory.searchHistory = this.state.orderHistory.searchHistory.slice(0, 20);
    }
    
    this.saveState();
  }

  getSearchHistory() {
    return this.state.orderHistory.searchHistory;
  }

  clearSearchHistory() {
    this.state.orderHistory.searchHistory = [];
    this.saveState();
  }

  // 收藏管理
  addFavorite(orderNo) {
    if (!this.state.orderHistory.favorites.includes(orderNo)) {
      this.state.orderHistory.favorites.push(orderNo);
      this.saveState();
    }
  }

  removeFavorite(orderNo) {
    this.state.orderHistory.favorites = this.state.orderHistory.favorites.filter(
      no => no !== orderNo
    );
    this.saveState();
  }

  isFavorite(orderNo) {
    return this.state.orderHistory.favorites.includes(orderNo);
  }

  getFavorites() {
    return this.state.orderHistory.favorites;
  }

  // 临时数据管理
  saveTempData(data) {
    this.state.tempData = { ...this.state.tempData, ...data };
    this.state.tempData.lastSaved = Date.now();
    this.saveState();
  }

  getTempData() {
    return this.state.tempData;
  }

  clearTempData() {
    this.state.tempData = {
      currentImage: null,
      editHistory: [],
      lastSaved: null,
      magicState: null,
      professionalState: null
    };
    this.saveState();
  }

  // 编辑历史管理
  addEditHistory(editData) {
    const editRecord = {
      ...editData,
      timestamp: Date.now()
    };
    
    this.state.tempData.editHistory.unshift(editRecord);
    
    // 限制编辑历史数量
    if (this.state.tempData.editHistory.length > 20) {
      this.state.tempData.editHistory = this.state.tempData.editHistory.slice(0, 20);
    }
    
    this.saveState();
  }

  getEditHistory() {
    return this.state.tempData.editHistory;
  }

  // 订单查询功能
  async queryOrderByNo(orderNo) {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // 添加设备ID头
      if (window.DeviceManager && window.DeviceManager.getDeviceId()) {
        headers['X-Device-ID'] = window.DeviceManager.getDeviceId();
      }
      
      const response = await fetch(`/api/v1/orders/${orderNo}`, {
        headers: headers
      });
      const result = await response.json();
      
      if (result.success) {
        // 添加到搜索历史
        this.addSearchHistory(orderNo);
        
        // 添加到订单历史
        this.addOrderHistory(result.order);
        
        return result.order;
      } else {
        throw new Error(result.error || '订单查询失败');
      }
    } catch (error) {
      console.error('查询订单失败:', error);
      throw error;
    }
  }

  // 数据清理
  cleanupExpiredData() {
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
    
    // 清理过期的临时数据
    if (this.state.tempData.lastSaved && now - this.state.tempData.lastSaved > maxAge) {
      this.clearTempData();
    }
    
    // 清理过期的编辑历史
    this.state.tempData.editHistory = this.state.tempData.editHistory.filter(
      edit => now - edit.timestamp < maxAge
    );
    
    // 清理过期的搜索历史
    this.state.orderHistory.searchHistory = this.state.orderHistory.searchHistory.filter(
      (term, index) => index < 20 // 只保留最近20条
    );
    
    this.saveState();
  }

  // 数据导出/导入
  exportData() {
    const exportData = {
      userPreferences: this.state.userPreferences,
      orderHistory: this.state.orderHistory,
      exportTime: new Date().toISOString(),
      version: this.state.version
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baji-user-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const importData = JSON.parse(e.target.result);
          
          // 验证数据格式
          if (!importData.userPreferences || !importData.orderHistory) {
            throw new Error('无效的数据格式');
          }
          
          // 合并导入的数据
          this.state.userPreferences = { 
            ...this.state.userPreferences, 
            ...importData.userPreferences 
          };
          this.state.orderHistory = { 
            ...this.state.orderHistory, 
            ...importData.orderHistory 
          };
          
          this.saveState();
          resolve('数据导入成功');
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  }

  // 重置所有数据
  resetAllData() {
    if (confirm('确定要重置所有用户数据吗？此操作不可撤销。')) {
      localStorage.removeItem(this.storageKey);
      this.state = { ...this.defaultState };
      this.saveState();
      
      // 重新加载页面
      window.location.reload();
    }
  }

  // 事件监听器
  setupEventListeners() {
    // 页面卸载时保存状态
    window.addEventListener('beforeunload', () => {
      this.saveState();
    });
    
    // 定期自动保存
    setInterval(() => {
      this.saveState();
    }, 30000); // 每30秒自动保存一次
  }

  // 获取用户统计信息
  getUserStats() {
    return {
      totalOrders: this.state.orderHistory.orders.length,
      recentOrdersCount: this.state.userPreferences.recentOrders.length,
      searchHistoryCount: this.state.orderHistory.searchHistory.length,
      favoritesCount: this.state.orderHistory.favorites.length,
      editHistoryCount: this.state.tempData.editHistory.length,
      lastUpdated: new Date(this.state.lastUpdated).toLocaleString()
    };
  }
}

// 全局实例
window.UserStateManager = new UserStateManager();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UserStateManager;
}
