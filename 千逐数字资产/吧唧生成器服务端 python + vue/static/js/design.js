// design.js - 乔布斯式极致体验的JavaScript实现
const { createApp, ref, reactive, computed, watch, onMounted, onUnmounted } = Vue;

// 图片编辑器类 - 核心功能
class ImageEditor {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.image = null;
    this.scale = 1.0;
    this.rotation = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.originalImagePath = null;
    this.processedImagePath = null;
    this.previewImagePath = null;
    this.imageWidth = 0;
    this.imageHeight = 0;
    this.imageFormat = '';
    this.imageSize = 0;
  }
  
  // 加载图片
  loadImage(imageFile) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.image = img;
        this.imageWidth = img.width;
        this.imageHeight = img.height;
        this.imageFormat = imageFile.type ? imageFile.type.split('/')[1] : 'unknown';
        this.imageSize = imageFile.size || 0;
        this.setupCanvas();
        this.drawImage();
        resolve(img);
      };
      img.onerror = reject;
      
      // 处理不同类型的图片源
      if (imageFile instanceof File) {
        img.src = URL.createObjectURL(imageFile);
      } else if (typeof imageFile === 'string') {
        img.src = imageFile;
      } else if (imageFile.src) {
        img.src = imageFile.src;
      } else {
        reject(new Error('Invalid image file'));
      }
    });
  }
  
  // 设置画布尺寸
  setupCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    
    // 使用clientWidth获取真实宽度331
    const realCanvasWidth = this.canvas.clientWidth || 331;
    const realCanvasHeight = this.canvas.clientHeight || 331;
    
    // 确保 canvas 尺寸与容器完全匹配
    const containerSize = Math.min(realCanvasWidth, realCanvasHeight);
    
    // 设置 canvas 的实际像素尺寸（考虑设备像素比）
    this.canvas.width = containerSize * window.devicePixelRatio;
    this.canvas.height = containerSize * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // 设置 canvas 的显示尺寸，确保与容器完全匹配
    this.canvas.style.width = containerSize + 'px';
    this.canvas.style.height = containerSize + 'px';
    
    console.log('🎨 Canvas 尺寸设置:', {
      realCanvasWidth: realCanvasWidth,
      realCanvasHeight: realCanvasHeight,
      containerSize: containerSize,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      displayWidth: this.canvas.style.width,
      displayHeight: this.canvas.style.height,
      devicePixelRatio: window.devicePixelRatio
    });
  }
  
  // 绘制专业圆形吧唧图片 - 精确68mm/58mm尺寸
  drawImage() {
    if (!this.image) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 获取Canvas真实宽度331
    const canvasRealWidth = this.canvas.clientWidth || 331;
    const canvasRealHeight = this.canvas.clientHeight || 331;
    const canvasSize = Math.min(canvasRealWidth, canvasRealHeight);
    
    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    
    // 精确计算像素尺寸：68mm和58mm在300 DPI下的像素值
    const mmToPixels = 300 / 25.4; // 300 DPI = 25.4mm/inch
    const innerRadius = (58 / 2) * mmToPixels; // 58mm内圈半径
    
    this.ctx.save();
    
    // 创建圆形裁剪路径 - 精确58mm内圈
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    this.ctx.clip();
    
    // 新的绘制逻辑：保持完整图片，通过变换显示不同区域
    // 用户可以在完整图片上拖拽调整位置，而不是被限制在裁切区域内
    
    const originalImageWidth = this.image.width;
    const originalImageHeight = this.image.height;
    
    console.log('🎨 设计模式数据计算:', {
      canvasSize: canvasSize,
      scale: this.scale,
      originalImageSize: `${originalImageWidth}x${originalImageHeight}`,
      offset: `(${this.offsetX}, ${this.offsetY})`,
      rotation: this.rotation
    });
    
    // 移动到图片中心
    this.ctx.translate(centerX + this.offsetX, centerY + this.offsetY);
    
    // 旋转
    this.ctx.rotate((this.rotation * Math.PI) / 180);
    
    // 缩放
    this.ctx.scale(this.scale, this.scale);
    
    // 绘制完整图片（从中心点开始）
    this.ctx.drawImage(
      this.image,
      -originalImageWidth / 2,
      -originalImageHeight / 2,
      originalImageWidth,
      originalImageHeight
    );
    
    this.ctx.restore();
    
    // 绘制专业吧唧边框
    this.drawBajiFrame();
  }
  
  // 绘制专业吧唧边框 - 精确68mm/58mm尺寸
  drawBajiFrame() {
    // 获取Canvas真实宽度331
    const canvasRealWidth = this.canvas.clientWidth || 331;
    const canvasRealHeight = this.canvas.clientHeight || 331;
    const canvasSize = Math.min(canvasRealWidth, canvasRealHeight);
    
    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    
    // 精确计算像素尺寸：68mm和58mm在300 DPI下的像素值
    const mmToPixels = 300 / 25.4; // 300 DPI = 25.4mm/inch
    const outerRadius = (68 / 2) * mmToPixels; // 68mm外圈半径
    const innerRadius = (58 / 2) * mmToPixels; // 58mm内圈半径
    
    this.ctx.save();
    
    // 绘制网格背景（可选）
    this.drawGrid(centerX, centerY, outerRadius);
    
    // 绘制外圈裁剪区域 - 68mm
    this.ctx.strokeStyle = '#3b82f6';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([8, 8]);
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
    this.ctx.stroke();
    
    // 绘制内圈展示区域 - 58mm
    this.ctx.strokeStyle = '#10b981';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    this.ctx.stroke();
    
    // 绘制尺寸标签
    this.drawDimensionLabels(centerX, centerY, outerRadius, innerRadius);
    
    // 绘制边缘渐变遮罩
    const gradient = this.ctx.createRadialGradient(
      centerX, centerY, innerRadius * 0.7,
      centerX, centerY, innerRadius
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.85, 'rgba(0, 0, 0, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    this.ctx.fill();
    
    this.ctx.restore();
  }
  
  // 绘制网格背景
  drawGrid(centerX, centerY, radius) {
    const gridSize = 20; // 网格大小
    const gridColor = 'rgba(0, 0, 0, 0.05)';
    
    this.ctx.strokeStyle = gridColor;
    this.ctx.lineWidth = 1;
    
    // 绘制水平网格线
    for (let y = centerY - radius; y <= centerY + radius; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(centerX - radius, y);
      this.ctx.lineTo(centerX + radius, y);
      this.ctx.stroke();
    }
    
    // 绘制垂直网格线
    for (let x = centerX - radius; x <= centerX + radius; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, centerY - radius);
      this.ctx.lineTo(x, centerY + radius);
      this.ctx.stroke();
    }
  }
  
  // 绘制尺寸标签
  drawDimensionLabels(centerX, centerY, outerRadius, innerRadius) {
    this.ctx.save();
    this.ctx.fillStyle = '#374151';
    this.ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.textAlign = 'center';
    
    // 外圈标签
    this.ctx.fillText('68mm', centerX, centerY - outerRadius - 10);
    
    // 内圈标签
    this.ctx.fillText('58mm', centerX, centerY - innerRadius - 10);
    
    // 中心点标记
    this.ctx.fillStyle = '#ef4444';
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 2, 0, 2 * Math.PI);
    this.ctx.fill();
    
    this.ctx.restore();
  }
  
  // 更新缩放
  updateScale(newScale) {
    this.scale = Math.max(0.1, Math.min(2.0, newScale));
    this.drawImage();
    
    // 同步更新Vue的editParams
    if (window.app && window.app._instance) {
      const setupState = window.app._instance.setupState;
      if (setupState && setupState.editParams) {
        setupState.editParams.scale = this.scale;
      }
    }
  }
  
  // 更新旋转
  updateRotation(angle) {
    this.rotation = angle % 360;
    this.drawImage();
    
    // 同步更新Vue的editParams
    if (window.app && window.app._instance) {
      const setupState = window.app._instance.setupState;
      if (setupState && setupState.editParams) {
        setupState.editParams.rotation = this.rotation;
      }
    }
  }
  
  // 更新位置
  updatePosition(x, y) {
    console.log('🔄 ImageEditor.updatePosition 被调用:', { x, y, currentOffsetX: this.offsetX, currentOffsetY: this.offsetY });
    
    this.offsetX = x;
    this.offsetY = y;
    this.drawImage();
    
    // 直接更新Vue的响应式数据
    if (window.app && window.app._instance) {
      // Vue 3 中通过 _instance.setupState 访问响应式数据
      const setupState = window.app._instance.setupState;
      if (setupState && setupState.editParams) {
        console.log('📝 更新Vue数据前:', { 
          offsetX: setupState.editParams.offsetX, 
          offsetY: setupState.editParams.offsetY 
        });
        
        setupState.editParams.offsetX = Math.round(x);
        setupState.editParams.offsetY = Math.round(y);
        
        console.log('📝 更新Vue数据后:', { 
          offsetX: setupState.editParams.offsetX, 
          offsetY: setupState.editParams.offsetY 
        });
      } else {
        console.warn('❌ setupState.editParams 未找到');
        console.log('setupState:', setupState);
      }
    } else {
      console.warn('❌ window.app 或 _instance 未找到');
      console.log('window.app:', window.app);
    }
  }
  
  // 重置所有参数
  reset() {
    this.scale = 1.0;
    this.rotation = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.drawImage();
    
    // 同步更新Vue的editParams
    if (window.app && window.app._instance) {
      const setupState = window.app._instance.setupState;
      if (setupState && setupState.editParams) {
        setupState.editParams.scale = 1.0;
        setupState.editParams.rotation = 0;
        setupState.editParams.offsetX = 0;
        setupState.editParams.offsetY = 0;
      }
    }
  }
  
  // 获取当前状态
  getState() {
    return {
      scale: this.scale,
      rotation: this.rotation,
      offsetX: this.offsetX,
      offsetY: this.offsetY
    };
  }
  
  // 设置状态
  setState(state) {
    this.scale = state.scale;
    this.rotation = state.rotation;
    this.offsetX = state.offsetX;
    this.offsetY = state.offsetY;
    this.drawImage();
  }
  
  // 拖拽处理
  startDrag(event) {
    this.isDragging = true;
    const rect = this.canvas.getBoundingClientRect();
    this.dragStart.x = event.clientX - rect.left;
    this.dragStart.y = event.clientY - rect.top;
  }
  
  drag(event) {
    if (!this.isDragging) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const deltaX = event.clientX - rect.left - this.dragStart.x;
    const deltaY = event.clientY - rect.top - this.dragStart.y;
    
    this.updatePosition(this.offsetX + deltaX, this.offsetY + deltaY);
    
    this.dragStart.x = event.clientX - rect.left;
    this.dragStart.y = event.clientY - rect.top;
  }
  
  endDrag(event) {
    this.isDragging = false;
  }
}

// 触摸手势处理器
class TouchHandler {
  constructor(canvas, imageEditor) {
    this.canvas = canvas;
    this.editor = imageEditor;
    this.touches = [];
    this.lastTouchDistance = 0;
    this.lastTouchAngle = 0;
    this.isGesturing = false;
    
    // 移动端优化属性
    this.tapThreshold = 300; // 毫秒
    this.doubleTapThreshold = 500; // 毫秒
    this.lastTapTime = 0;
    this.tapCount = 0;
    
    // 不自动设置事件监听器，由Vue管理
  }
  
  handleTouchStart(e) {
    e.preventDefault();
    e.stopPropagation();
    this.touches = Array.from(e.touches);
    
    if (this.touches.length === 1) {
      // 单指拖拽
      this.startSingleTouch();
    } else if (this.touches.length === 2) {
      // 双指手势
      this.startMultiTouch();
    }
  }
  
  handleTouchMove(e) {
    e.preventDefault();
    e.stopPropagation();
    const currentTouches = Array.from(e.touches);
    
    if (currentTouches.length === 1) {
      this.handleSingleTouchMove(currentTouches[0]);
    } else if (currentTouches.length === 2) {
      this.handleMultiTouchMove(currentTouches);
    }
  }
  
  handleTouchEnd(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // 检测双击
    const now = Date.now();
    if (now - this.lastTapTime < this.doubleTapThreshold) {
      this.tapCount++;
    } else {
      this.tapCount = 1;
    }
    this.lastTapTime = now;
    
    // 处理点击事件
    if (this.tapCount === 2) {
      this.handleDoubleTap();
    } else if (this.tapCount === 1 && this.touches.length === 1) {
      this.handleSingleTap();
    }
    
    this.touches = [];
    this.isGesturing = false;
  }
  
  startSingleTouch() {
    const touch = this.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.lastTouchX = touch.clientX - rect.left;
    this.lastTouchY = touch.clientY - rect.top;
    this.isGesturing = true;
  }
  
  handleSingleTap() {
    // 单击处理
    console.log('Single tap detected');
    
    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }
  
  handleDoubleTap() {
    // 双击处理
    console.log('Double tap detected');
    
    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    
    // 重置缩放和旋转
    if (this.editor) {
      this.editor.reset();
    }
  }

  handleSingleTouchMove(touch) {
    if (!this.isGesturing) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const deltaX = (touch.clientX - rect.left) - this.lastTouchX;
    const deltaY = (touch.clientY - rect.top) - this.lastTouchY;
    
    console.log('👆 触摸移动:', { 
      deltaX, 
      deltaY, 
      currentX: this.editor.offsetX, 
      currentY: this.editor.offsetY,
      newX: this.editor.offsetX + deltaX, 
      newY: this.editor.offsetY + deltaY 
    });
    
    this.editor.updatePosition(
      this.editor.offsetX + deltaX,
      this.editor.offsetY + deltaY
    );
    
    this.lastTouchX = touch.clientX - rect.left;
    this.lastTouchY = touch.clientY - rect.top;
  }
  
  startMultiTouch() {
    const touch1 = this.touches[0];
    const touch2 = this.touches[1];
    
    this.lastTouchDistance = this.getDistance(touch1, touch2);
    this.lastTouchAngle = this.getAngle(touch1, touch2);
    this.isGesturing = true;
  }
  
  handleMultiTouchMove(touches) {
    if (touches.length !== 2) return;
    
    const touch1 = touches[0];
    const touch2 = touches[1];
    
    const currentDistance = this.getDistance(touch1, touch2);
    const currentAngle = this.getAngle(touch1, touch2);
    
    // 处理缩放
    if (this.lastTouchDistance > 0) {
      const scaleChange = currentDistance / this.lastTouchDistance;
      const newScale = this.editor.scale * scaleChange;
      this.editor.updateScale(newScale);
    }
    
    // 处理旋转
    const angleChange = currentAngle - this.lastTouchAngle;
    const newRotation = this.editor.rotation + angleChange;
    this.editor.updateRotation(newRotation);
    
    this.lastTouchDistance = currentDistance;
    this.lastTouchAngle = currentAngle;
  }
  
  getDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  getAngle(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }
}

// 魔法般的拖拽体验 - 使用Magic Experience系统
class MagicalDragDrop {
  constructor() {
    this.magicSystem = window.MagicExperience;
    this.setupDragEffects();
  }
  
  setupDragEffects() {
    // 使用Magic Experience系统的粒子效果
    console.log('🎭 魔法拖拽效果已启用');
  }
  
  triggerParticleEffect(x, y) {
    // 使用Magic Experience系统触发粒子效果
    if (this.magicSystem) {
      this.magicSystem.createParticles(x, y, 20, 'magic');
    }
  }
  
  triggerSuccessEffect() {
    // 使用Magic Experience系统触发成功效果
    if (this.magicSystem) {
      this.magicSystem.showSuccessCelebration('✨');
    }
  }
}

// 情感化反馈管理器 - 使用Magic Experience系统
class EmotionalFeedbackManager {
  constructor() {
    this.happinessLevel = 0;
    this.magicSystem = window.MagicExperience;
    this.setupEmotionalTriggers();
  }
  
  setupEmotionalTriggers() {
    // 成功操作时的庆祝效果
    this.celebrateSuccess = () => {
      if (this.magicSystem) {
        this.magicSystem.showSuccessCelebration('✨');
        this.magicSystem.createConfetti();
        this.magicSystem.playSound('success');
      }
      this.increaseHappiness();
    };
    
    // 错误操作时的安慰效果
    this.comfortError = () => {
      if (this.magicSystem) {
        this.magicSystem.showMagicNotification('别担心，再试一次吧！', 'error', 2000);
        this.magicSystem.playSound('error');
      }
      this.decreaseHappiness();
    };
  }
  
  increaseHappiness() {
    this.happinessLevel = Math.min(100, this.happinessLevel + 10);
    this.updateHappinessIndicator();
  }
  
  decreaseHappiness() {
    this.happinessLevel = Math.max(0, this.happinessLevel - 5);
    this.updateHappinessIndicator();
  }
  
  updateHappinessIndicator() {
    // 可以在这里添加用户满意度可视化
    console.log(`😊 用户满意度: ${this.happinessLevel}%`);
  }
}

// 主应用
const app = createApp({
  setup() {
    // 导航组件状态
    const userMenuOpen = ref(false);
    
    // 响应式状态
    const currentImage = ref(null);
    const isDragOver = ref(false);
    const isUploading = ref(false);
    const isProcessing = ref(false);
    
    // 编辑参数
    const editParams = reactive({
      scale: 1.0,
      rotation: 0,
      offsetX: 0,
      offsetY: 0
    });
    
    console.log('🎯 Vue editParams 初始化:', editParams);
    
    // DOM引用
    const fileInput = ref(null);
    const previewCanvas = ref(null);
    const editCanvas = ref(null);
    
    // 计算属性
    const canConfirm = computed(() => {
      return currentImage.value && 
             !isUploading.value && 
             !isProcessing.value &&
             (currentImage.value.uploadStatus === 'uploaded' || currentImage.value.serverPath);
    });
    
    // 图片编辑器实例
    let imageEditor = null;
    let touchHandler = null;
    let magicalDragDrop = null;
    let emotionalFeedback = null;
    
    // 导航组件方法
    const toggleUserMenu = () => {
      userMenuOpen.value = !userMenuOpen.value;
    };
    
 
     
    
    // 方法
    const selectFile = () => {
      fileInput.value.click();
    };
    
    const handleFileSelect = (event) => {
      const file = event.target.files[0];
      if (file) {
        processImageFile(file);
      }
    };
    
    const handleDragOver = (event) => {
      event.preventDefault();
      isDragOver.value = true;
      
      // 触发魔法效果
      if (magicalDragDrop) {
        magicalDragDrop.triggerParticleEffect(event.clientX, event.clientY);
      }
    };
    
    const handleDragLeave = (event) => {
      event.preventDefault();
      isDragOver.value = false;
    };
    
    const handleDrop = (event) => {
      event.preventDefault();
      isDragOver.value = false;
      
      const files = event.dataTransfer.files;
      if (files.length > 0) {
        processImageFile(files[0]);
        
        // 触发魔法效果
        if (magicalDragDrop) {
          magicalDragDrop.triggerSuccessEffect();
        }
        
        // 触发庆祝效果
        if (emotionalFeedback) {
          emotionalFeedback.celebrateSuccess();
        }
      }
    };
    
    const processImageFile = async (file) => {
      // 验证文件
      if (!validateFile(file)) {
        return;
      }
      
      isUploading.value = true;
      
      try {
        // 创建图片对象
        const imageUrl = URL.createObjectURL(file);
        const img = new Image();
        
        img.onload = async () => {
          try {
            // 先设置基本的图片信息
            currentImage.value = {
              file: file,
              name: file.name,
              size: file.size,
              preview: imageUrl,
              width: img.width,
              height: img.height,
              serverPath: null, // 服务器路径，稍后设置
              uploadStatus: 'uploading' // 上传状态
            };
            
            // 初始化图片编辑器
            initializeImageEditor(file);
            
            // 触发成功效果
            if (magicalDragDrop) {
              magicalDragDrop.triggerSuccessEffect();
            }
            
            if (emotionalFeedback) {
              emotionalFeedback.celebrateSuccess();
            }
            
            showSuccess('图片加载成功！正在上传到服务器...');
            
            // 自动上传到服务器
            try {
              const uploadResult = await uploadImageFile();
              if (uploadResult.success) {
                // 更新图片信息，添加服务器路径
                currentImage.value.serverPath = uploadResult.file_path;
                currentImage.value.uploadStatus = 'uploaded';
                
                console.log('✅ 图片自动上传成功:', uploadResult.file_path);
                console.log('🔍 上传API返回的file_path格式:', {
                  file_path: uploadResult.file_path,
                  unixStyle: uploadResult.file_path.replace(/\\/g, '/'),
                  startsWithStatic: uploadResult.file_path.replace(/\\/g, '/').startsWith('static/uploads/'),
                  startsWithSlash: uploadResult.file_path.replace(/\\/g, '/').startsWith('/static/uploads/')
                });
                
                // 显示上传成功消息
                if (window.MagicExperience) {
                  window.MagicExperience.showMagicNotification('图片已上传到服务器！', 'success', 2000);
                }
              } else {
                console.warn('⚠️ 图片上传失败，但本地预览可用:', uploadResult.error);
                currentImage.value.uploadStatus = 'failed';
                
                if (window.MagicExperience) {
                  window.MagicExperience.showMagicNotification('图片上传失败，但可以继续编辑', 'warning', 3000);
                }
              }
            } catch (uploadError) {
              console.error('❌ 自动上传失败:', uploadError);
              currentImage.value.uploadStatus = 'failed';
              
              if (window.MagicExperience) {
                window.MagicExperience.showMagicNotification('图片上传失败，但可以继续编辑', 'warning', 3000);
              }
            }
            
            isUploading.value = false;
            
            // 自动滚动到预览区域
            setTimeout(() => {
              scrollToPreviewArea();
            }, 500);
          } catch (error) {
            console.error('图片处理失败:', error);
            if (window.errorHandler) {
              window.errorHandler.reportError(window.errorHandler.errorTypes.PROCESSING_ERROR, '图片处理失败', { error: error.message });
            } else {
              showError('图片处理失败');
            }
            isUploading.value = false;
          }
        };
        
        img.onerror = () => {
          console.error('图片加载失败');
          if (window.errorHandler) {
            window.errorHandler.reportError(window.errorHandler.errorTypes.PROCESSING_ERROR, '图片加载失败');
          } else {
            showError('图片加载失败');
          }
          isUploading.value = false;
          URL.revokeObjectURL(imageUrl);
          
          if (emotionalFeedback) {
            emotionalFeedback.comfortError();
          }
        };
        
        img.src = imageUrl;
        
      } catch (error) {
        console.error('图片处理失败:', error);
        if (window.errorHandler) {
          window.errorHandler.reportError(window.errorHandler.errorTypes.UNKNOWN_ERROR, '处理图片文件失败', { error: error.message });
        } else {
          showError('处理图片文件失败');
        }
        isUploading.value = false;
        
        if (emotionalFeedback) {
          emotionalFeedback.comfortError();
        }
      }
    };
    
    const validateFile = (file) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (!allowedTypes.includes(file.type)) {
        showError('请选择 JPG、PNG 或 WebP 格式的图片');
        return false;
      }
      
      if (file.size > maxSize) {
        showError('图片大小不能超过 5MB');
        return false;
      }
      
      return true;
    };
    
    const initializeImageEditor = (file) => {
      if (previewCanvas.value) {
        imageEditor = new ImageEditor(previewCanvas.value);
        imageEditor.loadImage(file).then(() => {
          console.log('图片编辑器初始化成功');
        }).catch((error) => {
          console.error('图片编辑器初始化失败:', error);
        });
        
        // 设置触摸处理器 - 使用预览画布
        if (previewCanvas.value) {
          touchHandler = new TouchHandler(previewCanvas.value, imageEditor);
          console.log('触摸处理器初始化成功 - 使用预览画布');
        }
      }
    };
    
    const setScale = (scale) => {
      editParams.scale = scale;
      if (imageEditor) {
        imageEditor.updateScale(scale);
      }
    };
    
    const rotate = (angle) => {
      editParams.rotation = (editParams.rotation + angle) % 360;
      if (imageEditor) {
        imageEditor.updateRotation(editParams.rotation);
      }
    };
    
    const resetRotation = () => {
      editParams.rotation = 0;
      if (imageEditor) {
        imageEditor.updateRotation(0);
      }
    };
    
    const resetPosition = () => {
      editParams.offsetX = 0;
      editParams.offsetY = 0;
      if (imageEditor) {
        imageEditor.updatePosition(0, 0);
      }
    };
    
    const resetAll = () => {
      editParams.scale = 1.0;
      editParams.rotation = 0;
      editParams.offsetX = 0;
      editParams.offsetY = 0;
      
      if (imageEditor) {
        imageEditor.reset();
      }
    };
    
    const confirmDesign = async () => {
      if (!canConfirm.value) return;
      
      isProcessing.value = true;
      
      try {
        // 检查图片是否已上传到服务器
        let serverImagePath = null;
        
        if (currentImage.value && currentImage.value.serverPath) {
          // 图片已经上传到服务器
          serverImagePath = currentImage.value.serverPath;
          console.log('✅ 使用已上传的图片路径:', serverImagePath);
        } else if (currentImage.value && currentImage.value.file) {
          // 图片还没有上传，需要先上传
          console.log('📤 图片未上传，开始上传...');
          const uploadResult = await uploadImageFile();
          if (!uploadResult.success) {
            throw new Error(uploadResult.error || '图片上传失败');
          }
          serverImagePath = uploadResult.file_path;
          
          // 更新图片信息
          currentImage.value.serverPath = serverImagePath;
          currentImage.value.uploadStatus = 'uploaded';
        } else {
          throw new Error('没有可用的图片文件');
        }
        
        // 确保 imageEditor 已完全初始化
        if (imageEditor && imageEditor.imageWidth && imageEditor.imageHeight) {
          console.log('✅ imageEditor 已完全初始化');
        } else {
          console.warn('⚠️ imageEditor 未完全初始化，使用 currentImage 的尺寸');
        }
        
        // 生成订单参数（使用服务器文件路径）
        const parameters = generateOrderParameters(serverImagePath);
        
        // 创建订单
        const headers = {
          'Content-Type': 'application/json'
        };
        
        // 添加设备ID头
        if (window.DeviceManager && window.DeviceManager.getDeviceId()) {
          headers['X-Device-ID'] = window.DeviceManager.getDeviceId();
        }
        
        const response = await fetch('/api/v1/orders', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(parameters)
        });
        
        const result = await response.json();
        
        if (result.success) {
          // 触发庆祝效果
          if (emotionalFeedback) {
            emotionalFeedback.celebrateSuccess();
          }
          
          // 使用用户状态管理系统记录订单
          if (window.UserStateManager) {
            window.UserStateManager.addOrderHistory(result.order);
            
            // 添加到编辑历史
            window.UserStateManager.addEditHistory({
              action: 'create_order',
              orderNo: result.order.order_no,
              imageName: currentImage.value?.name || '未命名',
              imagePath: serverImagePath,
              editParams: { ...editParams },
              totalPrice: result.order.total_price
            });
            
            // 清除临时数据
            window.UserStateManager.clearTempData();
          }
          
          // 显示成功消息
          if (window.MagicExperience) {
            window.MagicExperience.showMagicNotification('订单创建成功！正在跳转到支付页面...', 'success', 2000);
          }
          
          // 跳转到支付页面
          setTimeout(() => {
            const deviceId = window.DeviceManager ? window.DeviceManager.getDeviceId() : '';
            const paymentUrl = deviceId ? 
              `/payment?order_no=${result.order.order_no}&device_id=${deviceId}` :
              `/payment?order_no=${result.order.order_no}`;
            window.location.href = paymentUrl;
          }, 2000);
        } else {
          throw new Error(result.error);
        }
        
      } catch (error) {
        console.error('创建订单失败:', error);
        showError('创建订单失败，请重试');
        
        if (emotionalFeedback) {
          emotionalFeedback.comfortError();
        }
      } finally {
        isProcessing.value = false;
      }
    };
    
    const uploadImageFile = async () => {
      if (!currentImage.value || !currentImage.value.file) {
        return { success: false, error: '没有图片文件' };
      }
      
      const formData = new FormData();
      formData.append('file', currentImage.value.file);
      
      // 添加设备ID头
      const headers = {};
      if (window.DeviceManager && window.DeviceManager.getDeviceId()) {
        headers['X-Device-ID'] = window.DeviceManager.getDeviceId();
      }
      
      try {
        
        const response = await fetch('/api/v1/upload', {
          method: 'POST',
          headers: headers,
          body: formData
        });
        
        const result = await response.json();
        return result;
      } catch (error) {
        console.error('上传图片失败:', error);
        return { success: false, error: error.message };
      }
    };
    
    const generateOrderParameters = (uploadedFilePath) => {
      // 安全检查：确保 currentImage 存在
      if (!currentImage.value) {
        throw new Error('没有可用的图片数据');
      }
      
      const currentState = imageEditor ? imageEditor.getState() : editParams;
      
      // 安全获取文件格式
      let fileFormat = 'png'; // 默认格式
      if (currentImage.value.file && currentImage.value.file.type) {
        fileFormat = currentImage.value.file.type.split('/')[1];
      } else if (currentImage.value.type) {
        fileFormat = currentImage.value.type.split('/')[1];
      } else if (uploadedFilePath) {
        // 从文件路径推断格式
        const extension = uploadedFilePath.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
          fileFormat = extension === 'jpg' ? 'jpeg' : extension;
        }
      }
      
      // 根据旋转角度计算实际的图片尺寸
      let actualWidth = currentImage.value.width || (imageEditor ? imageEditor.imageWidth : 0);
      let actualHeight = currentImage.value.height || (imageEditor ? imageEditor.imageHeight : 0);
      
      // 如果旋转了90度或270度，宽高需要交换
      if (currentState.rotation === 90 || currentState.rotation === 270) {
        const temp = actualWidth;
        actualWidth = actualHeight;
        actualHeight = temp;
      }
      
      // 调试信息
      console.log('🔍 generateOrderParameters 调试:');
      console.log('  imageEditor存在:', !!imageEditor);
      console.log('  imageEditor.imageWidth:', imageEditor ? imageEditor.imageWidth : 'undefined');
      console.log('  imageEditor.imageHeight:', imageEditor ? imageEditor.imageHeight : 'undefined');
      console.log('  currentImage.value.width:', currentImage.value.width);
      console.log('  currentImage.value.height:', currentImage.value.height);
      console.log('  旋转角度:', currentState.rotation);
      console.log('  实际尺寸:', actualWidth, 'x', actualHeight);
      
      return {
        image: {
          original_path: uploadedFilePath,
          processed_path: uploadedFilePath,
          preview_path: currentImage.value.preview || '',
          width: actualWidth,
          height: actualHeight,
          format: fileFormat,
          size: currentImage.value.size || 0
        },
        
        edit_params: {
          scale: currentState.scale,
          rotation: currentState.rotation,
          offset_x: currentState.offsetX,
          offset_y: currentState.offsetY,
          crop_x: 0,
          crop_y: 0,
          crop_width: actualWidth,
          crop_height: actualHeight,
      // 前端Canvas计算的圆的大小
      canvas_inner_radius: imageEditor ? (58 / 2) * (300 / 25.4) : 0,
      canvas_outer_radius: imageEditor ? (68 / 2) * (300 / 25.4) : 0,
      canvas_dpi: 300,
      // 添加Canvas实际显示尺寸
      canvas_display_width: imageEditor ? imageEditor.canvas.width : 0,
      canvas_display_height: imageEditor ? imageEditor.canvas.height : 0,
      canvas_client_width: imageEditor ? imageEditor.canvas.clientWidth : 0,
      canvas_client_height: imageEditor ? imageEditor.canvas.clientHeight : 0,
      device_pixel_ratio: window.devicePixelRatio || 1
        },
        
        baji_specs: {
          size: 68,
          dpi: 300,
          format: 'png',
          quality: 95
        },
        
        user_preferences: {
          auto_enhance: true,
          smart_crop: false,
          color_correction: true,
          sharpening: false
        }
      };
    };
    
    const previewFullSize = () => {
      // 全屏预览逻辑
      if (imageEditor) {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        
        // 绘制全尺寸预览
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 800, 800);
        
        const img = imageEditor.image;
        if (img) {
          ctx.save();
          ctx.translate(400, 400);
          ctx.rotate((imageEditor.rotation * Math.PI) / 180);
          ctx.scale(imageEditor.scale, imageEditor.scale);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          ctx.restore();
        }
        
        // 显示全屏预览
        const previewWindow = window.open('', '_blank', 'width=900,height=900');
        previewWindow.document.write(`
          <html>
            <head><title>全屏预览</title></head>
            <body style="margin:0;padding:20px;background:#f0f0f0;display:flex;justify-content:center;align-items:center;">
              <img src="${canvas.toDataURL()}" style="max-width:100%;max-height:100%;box-shadow:0 10px 30px rgba(0,0,0,0.3);">
            </body>
          </html>
        `);
      }
    };
    
    const saveDraft = async () => {
      if (!currentImage.value) {
        showError('请先上传图片');
        return;
      }

      try {
        // 显示保存中状态
        if (window.MagicExperience) {
          window.MagicExperience.showMagicNotification('正在保存草稿...', 'info', 1000);
        }

        // 检查图片是否已上传到服务器
        let serverImagePath = null;
        
        if (currentImage.value.serverPath) {
          // 图片已经上传到服务器
          serverImagePath = currentImage.value.serverPath;
          console.log('✅ 使用已上传的图片路径保存草稿:', serverImagePath);
          console.log('🔍 保存草稿时的serverImagePath格式:', {
            serverImagePath: serverImagePath,
            unixStyle: serverImagePath.replace(/\\/g, '/'),
            startsWithStatic: serverImagePath.replace(/\\/g, '/').startsWith('static/uploads/'),
            startsWithSlash: serverImagePath.replace(/\\/g, '/').startsWith('/static/uploads/')
          });
        } else if (currentImage.value.file && currentImage.value.file instanceof File) {
          // 图片还没有上传，需要先上传
          console.log('📤 图片未上传，开始上传...');
          const formData = new FormData();
          formData.append('file', currentImage.value.file);
          
          const headers = {};
          if (window.DeviceManager && window.DeviceManager.getDeviceId()) {
            headers['X-Device-ID'] = window.DeviceManager.getDeviceId();
          }
          
          const uploadResponse = await fetch('/api/v1/upload', {
            method: 'POST',
            headers: headers,
            body: formData
          });
          
          if (!uploadResponse.ok) {
            throw new Error('图片上传失败');
          }
          
          const uploadData = await uploadResponse.json();
          if (!uploadData.success) {
            throw new Error(uploadData.error || '图片上传失败');
          }
          
          serverImagePath = uploadData.file_path;
          
          // 更新图片信息
          currentImage.value.serverPath = serverImagePath;
          currentImage.value.uploadStatus = 'uploaded';
          
          console.log('✅ 上传成功，服务器路径:', serverImagePath);
        } else {
          console.error('❌ 无效的图片数据结构:', currentImage.value);
          throw new Error('无效的图片数据结构');
        }

        // 使用用户状态管理系统保存草稿
        if (window.UserStateManager) {
          const draftData = {
            currentImage: {
              name: currentImage.value?.name || 'draft_image',
              path: serverImagePath,
              size: currentImage.value?.size || 0,
              type: currentImage.value?.type || 'image/png',
              serverPath: serverImagePath, // 保存服务器路径
              uploadStatus: currentImage.value?.uploadStatus || 'uploaded'
            },
            professionalState: { ...editParams },
            magicState: {
              // 可以保存魔法效果的状态
              particleDensity: window.MagicExperience?.settings.particleDensity || 'medium',
              soundVolume: window.MagicExperience?.settings.soundVolume || 0.3
            },
            lastSaved: Date.now()
          };
          
          window.UserStateManager.saveTempData(draftData);
          
          // 添加到编辑历史
          window.UserStateManager.addEditHistory({
            action: 'save_draft',
            imageName: currentImage.value?.name || '未命名',
            imagePath: serverImagePath,
            editParams: { ...editParams }
          });
          
          // 触发保存成功效果
          if (window.MagicExperience) {
            window.MagicExperience.showMagicNotification('草稿已保存！', 'success', 2000);
            window.MagicExperience.createParticles(
              window.innerWidth / 2,
              window.innerHeight / 2,
              15,
              'success'
            );
          }
        } else {
          // 降级处理
          const draftData = {
            image: {
              name: currentImage.value?.name || 'draft_image',
              path: serverImagePath,
              size: currentImage.value?.size || 0,
              type: currentImage.value?.type || 'image/png',
              serverPath: serverImagePath
            },
            editParams: { ...editParams },
            timestamp: Date.now()
          };
          
          localStorage.setItem('baji-draft', JSON.stringify(draftData));
          showSuccess('草稿已保存');
        }
      } catch (error) {
        console.error('保存草稿失败:', error);
        showError('保存草稿失败: ' + error.message);
      }
    };
    
    const showHelp = () => {
      // 使用Magic Experience系统显示帮助
      if (window.MagicExperience) {
        const helpContent = `
          <div class="text-center">
            <h3 class="text-xl font-bold mb-4 text-gray-800">🍎 吧唧生成器使用指南</h3>
            <div class="space-y-3 text-left">
              <div class="flex items-center space-x-3">
                <span class="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                <span>拖拽或点击上传图片</span>
              </div>
              <div class="flex items-center space-x-3">
                <span class="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <span>使用预览区域周围的工具调整图片</span>
              </div>
              <div class="flex items-center space-x-3">
                <span class="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                <span>实时预览专业效果</span>
              </div>
              <div class="flex items-center space-x-3">
                <span class="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                <span>确认设计完成</span>
              </div>
            </div>
            <div class="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <p class="text-gray-600">✨ 享受制作吧唧的魔法体验！</p>
            </div>
          </div>
        `;
        
        window.MagicExperience.showMagicModal(helpContent);
      } else {
        // 降级处理
        alert('欢迎使用吧唧生成器！\n\n1. 拖拽或点击上传图片\n2. 使用右侧工具调整图片\n3. 实时预览效果\n4. 确认设计完成\n\n享受制作吧唧的乐趣！✨');
      }
    };
    
    // 拖拽相关方法
    const startDrag = (event) => {
      if (imageEditor) {
        imageEditor.startDrag(event);
      }
    };
    
    const drag = (event) => {
      if (imageEditor) {
        imageEditor.drag(event);
      }
    };
    
    const endDrag = (event) => {
      if (imageEditor) {
        imageEditor.endDrag(event);
      }
    };
    
    const startTouch = (event) => {
      console.log('触摸开始事件触发', event);
      if (touchHandler) {
        touchHandler.handleTouchStart(event);
      } else {
        console.warn('TouchHandler未初始化');
      }
    };
    
    const touchMove = (event) => {
      console.log('触摸移动事件触发', event);
      if (touchHandler) {
        touchHandler.handleTouchMove(event);
      } else {
        console.warn('TouchHandler未初始化');
      }
    };
    
    const endTouch = (event) => {
      console.log('触摸结束事件触发', event);
      if (touchHandler) {
        touchHandler.handleTouchEnd(event);
      } else {
        console.warn('TouchHandler未初始化');
      }
    };
    
      // 处理预览区域点击
      const handlePreviewClick = (event) => {
        // 如果当前没有图片，点击预览区域就上传
        if (!currentImage.value) {
          selectFile();
        }
      };
    
    // 工具函数
    const scrollToPreviewArea = () => {
      const previewSection = document.querySelector('.preview-section');
      if (previewSection) {
        previewSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    };
    
    const changeImage = () => {
      // 清除当前图片
      if (currentImage.value) {
        URL.revokeObjectURL(currentImage.value.preview);
        currentImage.value = null;
      }
      
      // 重置编辑参数
      resetAll();
      
      // 触发文件选择
      selectFile();
    };
    
    const retryUpload = async () => {
      if (!currentImage.value || !currentImage.value.file) {
        showError('没有可重试的文件');
        return;
      }
      
      try {
        currentImage.value.uploadStatus = 'uploading';
        
        const uploadResult = await uploadImageFile();
        if (uploadResult.success) {
          currentImage.value.serverPath = uploadResult.file_path;
          currentImage.value.uploadStatus = 'uploaded';
          
          if (window.MagicExperience) {
            window.MagicExperience.showMagicNotification('重新上传成功！', 'success', 2000);
          }
        } else {
          currentImage.value.uploadStatus = 'failed';
          throw new Error(uploadResult.error || '上传失败');
        }
      } catch (error) {
        console.error('重试上传失败:', error);
        currentImage.value.uploadStatus = 'failed';
        showError('重试上传失败: ' + error.message);
      }
    };
    
    const showError = (message) => {
      if (window.errorHandler) {
        // 根据消息内容选择合适的错误类型
        let errorType = window.errorHandler.errorTypes.UNKNOWN_ERROR;
        
        if (message.includes('请先上传图片') || message.includes('没有图片')) {
          errorType = window.errorHandler.errorTypes.IMAGE_REQUIRED_ERROR;
        } else if (message.includes('上传') || message.includes('文件')) {
          errorType = window.errorHandler.errorTypes.UPLOAD_ERROR;
        } else if (message.includes('处理') || message.includes('编辑')) {
          errorType = window.errorHandler.errorTypes.PROCESSING_ERROR;
        } else if (message.includes('网络') || message.includes('连接')) {
          errorType = window.errorHandler.errorTypes.NETWORK_ERROR;
        }
        
        window.errorHandler.reportError(errorType, message);
      } else if (window.MagicExperience) {
        window.MagicExperience.showMagicNotification(message, 'error', 5000);
      } else {
        // 降级处理
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.remove();
        }, 5000);
      }
    };
    
    const showSuccess = (message) => {
      if (window.MagicExperience) {
        window.MagicExperience.showMagicNotification(message, 'success', 3000);
      } else {
        // 降级处理
        const notification = document.createElement('div');
        notification.className = 'success';
        notification.style.cssText = `
          position: fixed;
          top: 1rem;
          right: 1rem;
          background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 0.75rem;
          z-index: 1000;
          animation: slideInRight 0.3s ease-out;
          box-shadow: 0 8px 25px rgba(78, 205, 196, 0.3);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.remove();
        }, 3000);
      }
    };
    
    // 监听参数变化
    watch(editParams, (newParams) => {
      if (imageEditor) {
        imageEditor.setState(newParams);
      }
      
      // 自动保存到用户状态管理系统
      if (window.UserStateManager && currentImage.value) {
        const autoSave = window.UserStateManager.getPreference('settings.autoSave', true);
        if (autoSave) {
          // 防抖保存，避免频繁保存
          clearTimeout(window.autoSaveTimeout);
          window.autoSaveTimeout = setTimeout(() => {
            window.UserStateManager.saveTempData({
              currentImage: currentImage.value,
              professionalState: { ...newParams },
              lastSaved: Date.now()
            });
          }, 2000); // 2秒后保存
        }
      }
    }, { deep: true });
    
    // 生命周期
    onMounted(async () => {
      // 初始化魔法效果
      magicalDragDrop = new MagicalDragDrop();
      emotionalFeedback = new EmotionalFeedbackManager();
      
      // 初始化移动端优化
      if (window.mobileOptimizer) {
        console.log('📱 移动端优化器已加载');
      }
      
      // 初始化错误处理器
      if (window.errorHandler) {
        console.log('🛡️ 错误处理器已加载');
      }
      
      // 初始化Magic Experience系统
      if (window.MagicExperience) {
        console.log('✨ Magic Experience 系统已就绪');
        
        // 为页面元素添加魔法效果
        const previewContainer = document.querySelector('.preview-container');
        if (previewContainer) {
          window.MagicExperience.addMagicCardEffect(previewContainer);
        }
        
        // 为按钮添加魔法效果
        document.querySelectorAll('.btn').forEach(btn => {
          window.MagicExperience.addMagicButtonEffect(btn);
        });
        
        // 显示欢迎消息
        setTimeout(() => {
          window.MagicExperience.showMagicNotification('欢迎使用吧唧生成器！开始你的创作之旅吧 ✨', 'success', 4000);
        }, 1000);
      }
      
      // 初始化用户状态管理系统
      if (window.UserStateManager) {
        console.log('👤 用户状态管理系统已就绪');
        
        // 恢复用户偏好设置
        const autoSave = window.UserStateManager.getPreference('settings.autoSave', true);
        const showGrid = window.UserStateManager.getPreference('professionalSettings.showGrid', false);
        const showDimensions = window.UserStateManager.getPreference('professionalSettings.showDimensions', true);
        
        // 应用专业设置
        if (imageEditor) {
          // 这里可以应用专业设置到图片编辑器
          console.log('应用专业设置:', { showGrid, showDimensions });
        }
        
        // 检查是否有保存的草稿
        const tempData = window.UserStateManager.getTempData();
        if (tempData.currentImage && tempData.lastSaved) {
          const timeSinceLastSave = Date.now() - tempData.lastSaved;
          const maxAge = 24 * 60 * 60 * 1000; // 24小时
          
          if (timeSinceLastSave < maxAge && confirm('发现保存的草稿，是否继续编辑？')) {
            // 恢复草稿
            try {
              // 确保 imageEditor 已初始化
              if (!imageEditor && previewCanvas.value) {
                imageEditor = new ImageEditor(previewCanvas.value);
                
                // 初始化触摸处理器
                if (previewCanvas.value) {
                  touchHandler = new TouchHandler(previewCanvas.value, imageEditor);
                  console.log('触摸处理器初始化成功 - 恢复草稿时');
                }
              }
              
              if (!imageEditor) {
                throw new Error('图片编辑器未初始化');
              }
              
              // 处理草稿恢复 - 确保blob和服务器路径同时存在
              if (tempData.currentImage.serverPath || tempData.currentImage.path) {
                // 新格式：包含服务器路径
                const serverPath = tempData.currentImage.serverPath || tempData.currentImage.path;
                
                // 修复图片URL拼接问题 - 处理Windows和Unix路径分隔符
                let imageUrl;
                
                // 首先将Windows路径分隔符转换为Unix风格
                let normalizedPath = serverPath.replace(/\\/g, '/');
                
                // 标准化路径，确保它以/static/uploads/开头
                if (normalizedPath.startsWith('static/uploads/')) {
                  normalizedPath = '/' + normalizedPath;
                } else if (!normalizedPath.startsWith('/static/uploads/')) {
                  normalizedPath = '/static/uploads/' + normalizedPath;
                }
                
                imageUrl = normalizedPath;
                
                currentImage.value = {
                  name: tempData.currentImage.name,
                  size: tempData.currentImage.size,
                  type: tempData.currentImage.type,
                  preview: imageUrl, // 使用服务器图片URL作为预览
                  serverPath: serverPath, // 保存服务器路径
                  uploadStatus: 'uploaded', // 标记为已上传
                  width: tempData.currentImage.width || 0,
                  height: tempData.currentImage.height || 0
                };
                
                console.log('📂 恢复草稿 - 原始服务器路径:', serverPath);
                console.log('📂 恢复草稿 - 转换后的Unix路径:', normalizedPath);
                console.log('📂 恢复草稿 - 最终预览URL:', imageUrl);
                console.log('📂 恢复草稿 - 路径处理步骤:', {
                  original: serverPath,
                  unixStyle: normalizedPath,
                  startsWithStatic: normalizedPath.startsWith('static/uploads/'),
                  startsWithSlashStatic: normalizedPath.startsWith('/static/uploads/'),
                  final: imageUrl
                });
                
                // 加载服务器图片
                await imageEditor.loadImage(imageUrl);
              } else {
                // 旧格式：直接是图片对象或blob URL
                currentImage.value = tempData.currentImage;
                if (tempData.currentImage instanceof File) {
                  await imageEditor.loadImage(tempData.currentImage);
                } else if (typeof tempData.currentImage === 'string') {
                  await imageEditor.loadImage(tempData.currentImage);
                }
              }
              
              // 恢复编辑参数
              if (tempData.professionalState) {
                Object.assign(editParams, tempData.professionalState);
                imageEditor.updateScale(editParams.scale);
                imageEditor.updateRotation(editParams.rotation);
                imageEditor.updatePosition(editParams.offsetX, editParams.offsetY);
              }
              
              // 触发恢复成功效果
              if (window.MagicExperience) {
                window.MagicExperience.showMagicNotification('草稿已恢复！', 'success', 2000);
              }
            } catch (error) {
              console.error('恢复草稿失败:', error);
              if (window.MagicExperience) {
                window.MagicExperience.showMagicNotification('恢复草稿失败，请重新上传图片', 'error', 3000);
              }
            }
          }
        }
        
        // 显示用户统计信息
        const stats = window.UserStateManager.getUserStats();
        console.log('📊 用户统计:', stats);
      }
      
      console.log('🍎 吧唧生成器已加载 - 乔布斯式极致体验');
    });
    
    onUnmounted(() => {
      // 清理资源
      if (currentImage.value) {
        URL.revokeObjectURL(currentImage.value.preview);
      }
    });
    
    return {
      // 导航组件
      userMenuOpen,
      toggleUserMenu,  
      
      // 状态
      currentImage,
      isDragOver,
      isUploading,
      isProcessing,
      editParams,
      
      // DOM引用
      fileInput,
      previewCanvas,
      editCanvas,
      
      // 计算属性
      canConfirm,
      
      // 方法
      selectFile,
      handleFileSelect,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      changeImage,
      retryUpload,
      setScale,
      rotate,
      resetRotation,
      resetPosition,
      resetAll,
      confirmDesign,
      previewFullSize,
      saveDraft,
      showHelp,
      startDrag,
      drag,
      endDrag,
      startTouch,
      touchMove,
      endTouch,
      handlePreviewClick,
    };
  }
});

// 挂载应用
app.mount('#app');

// 将app实例保存到window对象，供ImageEditor使用
window.app = app;
console.log('🌐 window.app 设置完成:', window.app);
console.log('📊 window.app.editParams:', window.app.editParams);
