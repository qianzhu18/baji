# 智能题库系统 - 墨隐侠踪版

> 基于 Next.js + TypeScript 构建的现代化智能题库应用

## ✨ 特色功能

### 🎨 墨隐侠踪主题设计
- **水墨风格界面**：采用中国传统水墨画风格设计
- **剑痕动画效果**：独特的剑痕切割开屏动画
- **宣纸质感**：背景采用仿古宣纸纹理
- **墨色主题**：深度定制的颜色方案，营造古典氛围

### 🔧 核心功能
- **AI 智能解析**：上传文档自动生成题库
- **多种题型支持**：选择题、问答题、论述题
- **实时答题**：翻卡式答题体验
- **进度追踪**：学习进度可视化
- **题库管理**：题库创建、编辑、删除

### 💝 新增交互功能
- **联系作者**：一键弹出微信二维码，方便用户联系
- **打赏作者**：支持微信/支付宝双渠道打赏，感谢支持

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 pnpm

### 安装与运行

```bash
# 进入项目目录
cd study-app

# 安装依赖
npm install --legacy-peer-deps

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

### 访问应用
- 开发环境：http://localhost:3000

## 📱 界面预览

### 开屏动画 (`SwordsmanIntro`)
- 点击"入"字触发剑痕切割动画
- 四道剑痕依次划过屏幕
- 墨点飞溅效果渲染
- 自动切换到登录页面

### 登录界面 (`InkWashLogin`)
- 水墨背景艺术效果
- 半透明毛玻璃卡片
- 古典印章装饰元素
- 支持登录/注册切换

### 主应用界面 (`MainDashboard`)
- **Header**: 顶部导航，包含联系作者和打赏作者按钮
- **LeftSidebar**: 题库管理面板，支持创建和选择题库
- **RightContent**: 中央内容展示区域，答题界面

### 新增弹窗功能
- **联系作者弹窗**: 展示微信二维码，方便用户联系
- **打赏作者弹窗**: 微信/支付宝二维码切换

## 🎯 技术栈

### 前端框架
- **Next.js 15** - React 全栈框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 原子化样式
- **Radix UI** - 高质量组件库

### 开发工具
- **ESLint** - 代码规范
- **PostCSS** - CSS 处理
- **GeistFont** - 现代字体方案

## 📁 项目结构

```
study-app/
├── app/                    # Next.js App Router
│   ├── globals.css        # 全局样式（含墨隐侠踪主题）
│   ├── layout.tsx         # 根布局组件
│   └── page.tsx           # 主页面路由组件
├── components/            # React 组件
│   ├── swordsman-intro.tsx       # 开屏动画组件
│   ├── ink-wash-login.tsx        # 水墨登录页组件
│   ├── main-dashboard.tsx        # 主仪表盘组件
│   ├── header.tsx               # 顶部导航组件
│   ├── left-sidebar.tsx         # 左侧题库管理组件
│   ├── right-content.tsx        # 右侧内容展示组件
│   ├── contact-author-dialog.tsx # 联系作者弹窗
│   ├── donation-dialog.tsx      # 打赏作者弹窗
│   ├── api-key-dialog.tsx       # API配置弹窗
│   ├── profile-dialog.tsx       # 个人资料弹窗
│   └── ui/                      # 基础 UI 组件库
├── public/                # 静态资源
│   ├── 个人微信联系方式.jpg
│   ├── 微信支付.jpg
│   ├── 支付宝支付.jpg
│   └── placeholder-*.* (其他占位图)
├── styles/                # 样式文件
│   └── globals.css        # 全局样式
├── hooks/                 # 自定义 React Hooks
├── lib/                   # 工具函数库
└── 配置文件 (package.json, tailwind.config.ts, etc.)
```

## 🌟 设计理念

### 墨隐侠踪主题
该主题灵感来源于中国传统文化中的侠客精神与水墨画艺术：

- **侠者风范**：简洁而不简单的界面设计
- **墨色深韵**：黑白灰主色调，点缀古典红(`#B93A32`)
- **意境悠远**：动画效果营造意境感
- **实用至上**：美观与功能的完美平衡

### CSS 主题类
- `.swordsman-card` - 毛玻璃卡片效果
- `.swordsman-input` - 古典风格输入框
- `.swordsman-button` - 渐变按钮样式
- `.swordsman-tabs` - 标签页样式
- 丰富的动画效果类

### 用户体验优化
- **渐进式动画**：层次分明的动效序列
- **响应式设计**：适配各种设备尺寸
- **无障碍支持**：符合 WCAG 2.1 标准
- **性能优化**：懒加载与代码分割

## 🛠️ 开发指南

### 组件开发规范
- 使用 TypeScript 严格模式
- 遵循 React Hooks 最佳实践
- 采用 Compound Component 模式
- 实现完整的 Props 类型定义

### 样式开发规范
- 优先使用 Tailwind CSS 原子类
- 自定义样式使用 CSS 模块化
- 主题变量统一管理(`app/globals.css`)
- 响应式断点一致性

### 新增功能扩展
如需添加新的弹窗功能，可参考现有的 `ContactAuthorDialog` 和 `DonationDialog` 组件：

1. 在 `components/` 目录创建新组件
2. 在 `MainDashboard` 中添加状态管理
3. 在 `Header` 中添加触发按钮
4. 确保样式符合墨隐侠踪主题

## 📞 联系方式

- **作者**：千逐 (湖南·长沙)
- **微信**：扫描应用内二维码
- **支持**：通过应用内打赏功能

## 📄 许可证

[MIT License](LICENSE)

---

### 更新日志

#### v2.0.0 - 墨隐侠踪版 (2025-07-24)
- ✨ 全新墨隐侠踪主题设计
- 🎬 剑痕切割开屏动画 (`SwordsmanIntro`)
- 💌 联系作者功能 (`ContactAuthorDialog`)
- 💝 打赏作者功能 (`DonationDialog`)
- 🎨 水墨风格界面重构
- 🚀 完整的目录结构重组
- 📱 响应式布局优化

#### v1.0.0 - 初始版本
- 🎯 基础题库功能
- 🤖 AI 智能解析
- 📱 响应式设计

---

### 开发状态

- ✅ **当前版本**: 墨隐侠踪版
- ✅ **开发服务器**: `npm run dev` 在 http://localhost:3000
- ✅ **所有功能**: 开屏动画 → 登录页 → 主应用 → 弹窗功能
- ✅ **图片资源**: 微信/支付宝二维码已就位

*感谢您使用智能题库系统！现在您可以访问 http://localhost:3000 体验全新的墨隐侠踪界面。* 