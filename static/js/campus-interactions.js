// 🎪 校园风格交互动效
class CampusInteractions {
  constructor() {
    this.init();
  }

  init() {
    this.initClickEffects();
    this.initButtonAnimations();
    this.initCardHover();
    this.initScrollAnimations();
    this.initConfetti();
    this.initCountUp();
    this.initMobileOptimizations();
  }

  // 🎯 点击特效
  initClickEffects() {
    document.addEventListener('click', (e) => {
      // 检查是否点击了校园风格按钮
      if (e.target.closest('.campus-btn') ||
          e.target.closest('.ripple-effect') ||
          e.target.classList.contains('campus-btn')) {
        this.createClickEffect(e.clientX, e.clientY);
        this.playClickFeedback(e.target);
      }
    });

    // 为所有campus-btn添加涟漪效果
    document.querySelectorAll('.campus-btn').forEach(btn => {
      if (!btn.classList.contains('ripple-effect')) {
        btn.classList.add('ripple-effect');
      }
    });
  }

  createClickEffect(x, y) {
    const effect = document.createElement('div');
    effect.className = 'click-effect';
    effect.style.left = x + 'px';
    effect.style.top = y + 'px';
    effect.style.position = 'fixed';
    effect.style.pointerEvents = 'none';
    effect.style.zIndex = '9999';
    document.body.appendChild(effect);

    // 8秒后移除特效
    setTimeout(() => {
      if (effect.parentNode) {
        effect.remove();
      }
    }, 800);
  }

  playClickFeedback(element) {
    // 添加视觉反馈
    element.style.transform = 'scale(0.95)';
    setTimeout(() => {
      element.style.transform = '';
    }, 100);

    // 可以在这里添加音效
    // this.playClickSound();
  }

  // 🔊 播放点击音效（可选）
  playClickSound() {
    try {
      // 创建点击音效（如果需要的话）
      const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAAAAAAAAAAAA');
      audio.volume = 0.1;
      audio.play().catch(() => {
        // 忽略自动播放限制错误
      });
    } catch (e) {
      // 忽略音效错误
    }
  }

  // 🎈 按钮动画
  initButtonAnimations() {
    document.querySelectorAll('.campus-btn, .mobile-btn').forEach(btn => {
      // 鼠标进入效果
      btn.addEventListener('mouseenter', () => {
        if (!this.isMobile()) {
          btn.style.transform = 'translateY(-3px) scale(1.05)';
        }
      });

      // 鼠标离开效果
      btn.addEventListener('mouseleave', () => {
        if (!this.isMobile()) {
          btn.style.transform = 'translateY(0) scale(1)';
        }
      });

      // 鼠标按下效果
      btn.addEventListener('mousedown', () => {
        if (!this.isMobile()) {
          btn.style.transform = 'translateY(-1px) scale(1.02)';
        }
      });

      // 鼠标释放效果
      btn.addEventListener('mouseup', () => {
        if (!this.isMobile()) {
          btn.style.transform = 'translateY(-3px) scale(1.05)';
        }
      });

      // 触摸开始效果
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btn.style.transform = 'scale(0.95)';
      }, { passive: false });

      // 触摸结束效果
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        btn.style.transform = '';
      }, { passive: false });
    });
  }

  // 🎴 卡片悬停效果
  initCardHover() {
    document.querySelectorAll('.campus-card, .mobile-case-card').forEach(card => {
      // 只在非移动设备上启用hover效果
      if (!this.isMobile()) {
        card.addEventListener('mouseenter', () => {
          card.style.transform = 'translateY(-8px) scale(1.02)';
        });

        card.addEventListener('mouseleave', () => {
          card.style.transform = 'translateY(0) scale(1)';
        });
      }

      // 移动端触摸反馈
      card.addEventListener('touchstart', (e) => {
        card.style.transform = 'scale(0.98)';
      }, { passive: true });

      card.addEventListener('touchend', () => {
        card.style.transform = '';
      }, { passive: true });
    });
  }

  // 📜 滚动动画
  initScrollAnimations() {
    // 检查浏览器是否支持Intersection Observer
    if (!window.IntersectionObserver) {
      return;
    }

    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in-up');

          // 如果是统计数字，触发计数动画
          if (entry.target.classList.contains('stat-number') ||
              entry.target.classList.contains('mobile-stat-number')) {
            this.animateNumber(entry.target);
          }
        }
      });
    }, observerOptions);

    // 观察需要动画的元素
    document.querySelectorAll('.campus-card, .campus-section, .stat-number, .mobile-stat-number').forEach(el => {
      observer.observe(el);
    });
  }

  // 🎉 彩带特效
  initConfetti() {
    // 监听成功事件
    document.addEventListener('success', (e) => {
      this.createConfetti();
    });

    // 监听成功按钮点击
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-success="true"]')) {
        this.createConfetti();
        this.showSuccessCelebration();
      }
    });
  }

  createConfetti() {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff8cc8', '#a8e6cf'];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * window.innerWidth + 'px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.width = (Math.random() * 10 + 5) + 'px';
        confetti.style.height = confetti.style.width;
        document.body.appendChild(confetti);

        setTimeout(() => {
          if (confetti.parentNode) {
            confetti.remove();
          }
        }, 3000);
      }, i * 30);
    }
  }

  // 🎊 成功庆祝
  celebrateSuccess() {
    this.showSuccessCelebration();
    this.createConfetti();

    // 播放成功音效（可选）
    this.playSuccessSound();
  }

  showSuccessCelebration() {
    const celebrations = ['🎉', '🎊', '✨', '🌟', '💫', '🎆'];
    const celebration = document.createElement('div');
    celebration.className = 'success-celebration';
    celebration.textContent = celebrations[Math.floor(Math.random() * celebrations.length)];
    document.body.appendChild(celebration);

    setTimeout(() => {
      if (celebration.parentNode) {
        celebration.remove();
      }
    }, 1000);
  }

  playSuccessSound() {
    try {
      // 创建成功音效（如果需要的话）
      const audio = new Audio('data:audio/wav;base64,UklGRhwAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YfgAAAAAAAAAAAAA');
      audio.volume = 0.2;
      audio.play().catch(() => {
        // 忽略自动播放限制错误
      });
    } catch (e) {
      // 忽略音效错误
    }
  }

  // 📊 数字动画
  initCountUp() {
    document.querySelectorAll('.stat-number, .mobile-stat-number').forEach(element => {
      const target = parseInt(element.dataset.target) || 0;
      if (target > 0) {
        element.dataset.target = target;
        element.textContent = '0';
      }
    });
  }

  animateNumber(element) {
    const target = parseInt(element.dataset.target) || 0;
    const duration = 2000; // 2秒
    const start = 0;
    const increment = target / (duration / 16); // 60fps
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }

      // 格式化数字
      if (target >= 10000) {
        element.textContent = Math.floor(current / 1000) + 'k+';
      } else {
        element.textContent = Math.floor(current);
      }
    }, 16);
  }

  // 📱 移动端优化
  initMobileOptimizations() {
    if (this.isMobile()) {
      // 禁用hover效果
      document.body.classList.add('touch-device');

      // 优化滚动
      this.optimizeScrolling();

      // 添加触摸反馈
      this.addTouchFeedback();

      // 处理移动端导航
      this.initMobileNavigation();
    }
  }

  // 检测是否为移动设备
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768 && 'ontouchstart' in window);
  }

  // 优化滚动
  optimizeScrolling() {
    // 添加平滑滚动
    document.documentElement.style.scrollBehavior = 'smooth';

    // 处理iOS滚动回弹
    let startY = 0;
    document.addEventListener('touchstart', (e) => {
      startY = e.touches[0].pageY;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const direction = e.touches[0].pageY - startY;

      // 防止过度滚动
      if ((scrollTop <= 0 && direction > 0) ||
          (scrollTop >= document.documentElement.scrollHeight - window.innerHeight && direction < 0)) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  // 添加触摸反馈
  addTouchFeedback() {
    document.addEventListener('touchstart', (e) => {
      const target = e.target.closest('.campus-btn, .campus-card, .mobile-btn, .mobile-list-item');
      if (target) {
        target.style.transform = 'scale(0.98)';
      }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const target = e.target.closest('.campus-btn, .campus-card, .mobile-btn, .mobile-list-item');
      if (target) {
        target.style.transform = '';
      }
    }, { passive: true });
  }

  // 初始化移动端导航
  initMobileNavigation() {
    // 添加滑动返回支持
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      this.handleSwipe(touchStartX, touchEndX);
    }, { passive: true });
  }

  // 处理滑动手势
  handleSwipe(startX, endX) {
    const swipeThreshold = 50;
    const diff = startX - endX;

    if (Math.abs(diff) < swipeThreshold) return;

    // 根据滑动方向处理
    if (diff > 0) {
      // 向左滑动
      this.handleSwipeLeft();
    } else {
      // 向右滑动
      this.handleSwipeRight();
    }
  }

  handleSwipeLeft() {
    // 实现向左滑动的逻辑
    const activeTab = document.querySelector('.mobile-tab.active');
    if (activeTab && activeTab.nextElementSibling) {
      activeTab.nextElementSibling.click();
    }
  }

  handleSwipeRight() {
    // 实现向右滑动的逻辑
    const activeTab = document.querySelector('.mobile-tab.active');
    if (activeTab && activeTab.previousElementSibling) {
      activeTab.previousElementSibling.click();
    }
  }

  // 🎨 工具方法
  debounce(func, wait) {
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

  throttle(func, limit) {
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

  // 🎯 懒加载图片
  initLazyLoading() {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }

  // 🎪 页面加载动画
  initPageLoadAnimations() {
    // 页面加载时的动画
    window.addEventListener('load', () => {
      document.body.classList.add('page-loaded');

      // 为主要元素添加入场动画
      const mainElements = document.querySelectorAll('h1, h2, .hero-campus, .campus-card');
      mainElements.forEach((el, index) => {
        setTimeout(() => {
          el.classList.add('bounce-in');
        }, index * 100);
      });
    });
  }

  // 🌈 初始化所有功能
  initAll() {
    this.init();
    this.initLazyLoading();
    this.initPageLoadAnimations();
  }
}

// 🎮 全局函数，供外部调用
window.CampusInteractions = CampusInteractions;

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
  window.campusInteractions = new CampusInteractions();
});

// 导出常用的方法供其他脚本使用
window.campusEffects = {
  celebrate: () => {
    if (window.campusInteractions) {
      window.campusInteractions.celebrateSuccess();
    }
  },

  createConfetti: () => {
    if (window.campusInteractions) {
      window.campusInteractions.createConfetti();
    }
  },

  animateNumber: (element, target) => {
    element.dataset.target = target;
    element.textContent = '0';
    if (window.campusInteractions) {
      window.campusInteractions.animateNumber(element);
    }
  }
};