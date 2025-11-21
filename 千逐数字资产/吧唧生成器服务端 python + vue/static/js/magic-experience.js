// magic-experience.js - Magic Experience 系统核心模块
// 实现粒子效果、音效反馈、庆祝动画等魔法体验

class MagicExperienceSystem {
  constructor() {
    this.isEnabled = true;
    this.particleContainer = null;
    this.confettiContainer = null;
    this.audioContext = null;
    this.magicOverlay = null;
    this.settings = {
      particles: true,
      sounds: true,
      animations: true,
      celebration: true,
      particleDensity: 'medium', // low, medium, high
      soundVolume: 0.3,
      animationSpeed: 'normal' // slow, normal, fast
    };
    
    this.init();
  }

  init() {
    this.createContainers();
    this.initAudio();
    this.createMagicOverlay();
    this.loadSettings();
    this.injectCSS();
    console.log('✨ Magic Experience System 初始化完成');
  }

  injectCSS() {
    // 注入必要的CSS样式
    const style = document.createElement('style');
    style.textContent = `
      .magic-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: magicNotificationSlide 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
      }
      
      .magic-notification.success {
        background: linear-gradient(135deg, #10b981, #059669);
      }
      
      .magic-notification.error {
        background: linear-gradient(135deg, #ef4444, #dc2626);
      }
      
      .magic-notification.warning {
        background: linear-gradient(135deg, #f59e0b, #d97706);
      }
      
      .magic-notification.info {
        background: linear-gradient(135deg, #3b82f6, #2563eb);
      }
      
      @keyframes magicNotificationSlide {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      .particle-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
      }
      
      .confetti-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
      }
      
      .magic-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9998;
        background: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(59, 130, 246, 0.1) 0%, transparent 50%);
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .magic-overlay.active {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  createContainers() {
    // 确保document.body存在
    if (!document.body) {
      console.warn('document.body 不存在，延迟创建容器');
      setTimeout(() => this.createContainers(), 100);
      return;
    }

    // 创建粒子容器
    this.particleContainer = document.createElement('div');
    this.particleContainer.className = 'particle-container';
    document.body.appendChild(this.particleContainer);

    // 创建彩带容器
    this.confettiContainer = document.createElement('div');
    this.confettiContainer.className = 'confetti-container';
    document.body.appendChild(this.confettiContainer);
  }

  initAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('🎵 音频系统初始化成功');
    } catch (error) {
      console.warn('音频系统不支持:', error);
      this.settings.sounds = false;
    }
  }

  createMagicOverlay() {
    // 确保document.body存在
    if (!document.body) {
      console.warn('document.body 不存在，延迟创建魔法遮罩');
      setTimeout(() => this.createMagicOverlay(), 100);
      return;
    }

    this.magicOverlay = document.createElement('div');
    this.magicOverlay.className = 'magic-drag-overlay';
    document.body.appendChild(this.magicOverlay);
  }

  loadSettings() {
    const savedSettings = localStorage.getItem('magic-experience-settings');
    if (savedSettings) {
      this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
    }
  }

  saveSettings() {
    localStorage.setItem('magic-experience-settings', JSON.stringify(this.settings));
  }

  // 粒子效果系统
  createParticles(x, y, count = 20, type = 'default') {
    if (!this.settings.particles) return;

    const colors = {
      default: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'],
      success: ['#10b981', '#34d399', '#6ee7b7'],
      error: ['#ef4444', '#f87171', '#fca5a5'],
      magic: ['#667eea', '#764ba2', '#8b5cf6']
    };

    const particleColors = colors[type] || colors.default;
    const density = this.settings.particleDensity === 'high' ? 1.5 : 
                   this.settings.particleDensity === 'low' ? 0.5 : 1;

    for (let i = 0; i < count * density; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      const color = particleColors[Math.floor(Math.random() * particleColors.length)];
      particle.style.background = color;
      
      const size = Math.random() * 4 + 2;
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 100 + 50;
      const deltaX = Math.cos(angle) * velocity;
      const deltaY = Math.sin(angle) * velocity;
      
      particle.style.left = (x + deltaX) + 'px';
      particle.style.top = (y + deltaY) + 'px';
      
      this.particleContainer.appendChild(particle);
      
      // 清理粒子
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 2000);
    }
  }

  // 庆祝彩带效果
  createConfetti(x = window.innerWidth / 2, y = 0) {
    if (!this.settings.celebration) return;

    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
    const count = 50;

    for (let i = 0; i < count; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      
      const color = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.background = color;
      
      const size = Math.random() * 8 + 4;
      confetti.style.width = size + 'px';
      confetti.style.height = size + 'px';
      
      confetti.style.left = (x + (Math.random() - 0.5) * 200) + 'px';
      confetti.style.top = y + 'px';
      
      this.confettiContainer.appendChild(confetti);
      
      // 清理彩带
      setTimeout(() => {
        if (confetti.parentNode) {
          confetti.parentNode.removeChild(confetti);
        }
      }, 3000);
    }
  }

  // 成功庆祝动画
  showSuccessCelebration(message = '✨') {
    if (!this.settings.celebration) return;

    // 确保document.body存在
    if (!document.body) {
      console.warn('document.body 不存在，无法显示庆祝效果');
      return;
    }

    const celebration = document.createElement('div');
    celebration.className = 'success-celebration';
    celebration.textContent = message;
    
    document.body.appendChild(celebration);
    
    // 播放音效
    this.playSound('success');
    
    // 创建彩带
    this.createConfetti();
    
    // 清理庆祝元素
    setTimeout(() => {
      if (celebration.parentNode) {
        celebration.parentNode.removeChild(celebration);
      }
    }, 1000);
  }

  // 音效系统
  playSound(type) {
    if (!this.settings.sounds || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    const sounds = {
      success: { frequency: 800, duration: 0.2, endFrequency: 1200 },
      error: { frequency: 300, duration: 0.3, endFrequency: 200 },
      click: { frequency: 600, duration: 0.1, endFrequency: 800 },
      magic: { frequency: 500, duration: 0.4, endFrequency: 1000 },
      upload: { frequency: 400, duration: 0.2, endFrequency: 600 }
    };
    
    const sound = sounds[type] || sounds.click;
    
    oscillator.frequency.setValueAtTime(sound.frequency, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      sound.endFrequency, 
      this.audioContext.currentTime + sound.duration
    );
    
    gainNode.gain.setValueAtTime(this.settings.soundVolume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01, 
      this.audioContext.currentTime + sound.duration
    );
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + sound.duration);
  }

  // 魔法拖拽效果
  showMagicDragOverlay(x, y) {
    if (!this.settings.animations) return;

    this.magicOverlay.style.setProperty('--mouse-x', x + 'px');
    this.magicOverlay.style.setProperty('--mouse-y', y + 'px');
    this.magicOverlay.classList.add('active');
    
    setTimeout(() => {
      this.magicOverlay.classList.remove('active');
    }, 300);
  }

  // 魔法按钮效果
  addMagicButtonEffect(button) {
    if (!this.settings.animations) return;

    button.classList.add('magic-button');
    
    button.addEventListener('click', () => {
      this.playSound('click');
      this.createParticles(
        button.offsetLeft + button.offsetWidth / 2,
        button.offsetTop + button.offsetHeight / 2,
        10,
        'magic'
      );
    });
  }

  // 魔法输入框效果
  addMagicInputEffect(input) {
    if (!this.settings.animations) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'magic-input';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    
    input.addEventListener('focus', () => {
      this.playSound('click');
    });
  }

  // 魔法卡片效果
  addMagicCardEffect(card) {
    if (!this.settings.animations) return;

    card.classList.add('magic-card');
    
    card.addEventListener('mouseenter', () => {
      this.createParticles(
        card.offsetLeft + card.offsetWidth / 2,
        card.offsetTop + card.offsetHeight / 2,
        5,
        'magic'
      );
    });
  }

  // 魔法通知
  showMagicNotification(message, type = 'info', duration = 3000) {
    // 确保document.body存在
    if (!document.body) {
      console.warn('document.body 不存在，无法显示通知');
      return;
    }

    const notification = document.createElement('div');
    notification.className = `magic-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 播放音效
    this.playSound(type === 'success' ? 'success' : 'click');
    
    // 自动移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'magicNotificationSlide 0.3s ease reverse';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, duration);
  }

  // 魔法进度条
  createMagicProgress(container, progress = 0) {
    const progressBar = document.createElement('div');
    progressBar.className = 'magic-progress';
    
    const bar = document.createElement('div');
    bar.className = 'magic-progress-bar';
    bar.style.width = progress + '%';
    
    progressBar.appendChild(bar);
    container.appendChild(progressBar);
    
    return {
      update: (newProgress) => {
        bar.style.width = newProgress + '%';
      },
      remove: () => {
        if (progressBar.parentNode) {
          progressBar.parentNode.removeChild(progressBar);
        }
      }
    };
  }

  // 魔法模态框
  showMagicModal(content, onClose = null) {
    // 确保document.body存在
    if (!document.body) {
      console.warn('document.body 不存在，无法显示模态框');
      return null;
    }

    const modal = document.createElement('div');
    modal.className = 'magic-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'magic-modal-content';
    modalContent.innerHTML = content;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // 播放音效
    this.playSound('magic');
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeMagicModal(modal, onClose);
      }
    });
    
    return modal;
  }

  closeMagicModal(modal, onClose = null) {
    modal.style.animation = 'magicModalFadeIn 0.3s ease reverse';
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
      if (onClose) onClose();
    }, 300);
  }

  // 魔法开关
  createMagicSwitch(container, initialState = false, onChange = null) {
    const switchElement = document.createElement('div');
    switchElement.className = 'magic-switch';
    if (initialState) switchElement.classList.add('active');
    
    switchElement.addEventListener('click', () => {
      switchElement.classList.toggle('active');
      this.playSound('click');
      if (onChange) onChange(switchElement.classList.contains('active'));
    });
    
    container.appendChild(switchElement);
    return switchElement;
  }

  // 魔法标签
  createMagicTag(text, container) {
    const tag = document.createElement('span');
    tag.className = 'magic-tag';
    tag.textContent = text;
    
    container.appendChild(tag);
    return tag;
  }

  // 魔法分隔线
  createMagicDivider(container) {
    const divider = document.createElement('div');
    divider.className = 'magic-divider';
    
    container.appendChild(divider);
    return divider;
  }

  // 设置更新
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  // 启用/禁用系统
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.settings.particles = false;
      this.settings.sounds = false;
      this.settings.animations = false;
      this.settings.celebration = false;
    }
  }

  // 清理所有效果
  cleanup() {
    if (this.particleContainer) {
      this.particleContainer.innerHTML = '';
    }
    if (this.confettiContainer) {
      this.confettiContainer.innerHTML = '';
    }
  }
}

// 全局实例
window.MagicExperience = new MagicExperienceSystem();

// 自动为页面元素添加魔法效果
document.addEventListener('DOMContentLoaded', () => {
  // 为所有按钮添加魔法效果
  document.querySelectorAll('.btn').forEach(btn => {
    window.MagicExperience.addMagicButtonEffect(btn);
  });
  
  // 为所有输入框添加魔法效果
  document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]').forEach(input => {
    window.MagicExperience.addMagicInputEffect(input);
  });
  
  // 为所有卡片添加魔法效果
  document.querySelectorAll('.card, .info-item-professional').forEach(card => {
    window.MagicExperience.addMagicCardEffect(card);
  });
  
  console.log('🎭 页面魔法效果自动应用完成');
});

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MagicExperienceSystem;
}
