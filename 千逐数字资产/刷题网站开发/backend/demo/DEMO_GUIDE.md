# 刷题网站系统演示指南

## 演示环境信息

- **API地址**: http://localhost:3001
- **演示用户**: demo@example.com
- **密码**: Demo123456!
- **创建时间**: 2025年 7月25日 星期五 03时03分48秒 CST

## 演示数据概览

- **题库总数**: 4 个
- **任务总数**: 4 个
- **支持格式**: TXT, Markdown, CSV, 文字输入

## 演示流程

### 1. 系统健康检查
访问健康检查端点验证系统状态：
```
GET http://localhost:3001/health
```

### 2. 用户认证
使用演示账户登录：
```
POST http://localhost:3001/api/auth/login
{
  "email": "demo@example.com",
  "password": "Demo123456!"
}
```

### 3. 查看题库列表
获取所有题库：
```
GET http://localhost:3001/api/quiz
Authorization: Bearer <token>
```

### 4. 查看任务状态
监控处理任务：
```
GET http://localhost:3001/api/job
Authorization: Bearer <token>
```

### 5. 上传新题库
支持多种格式的文件上传：
```
POST http://localhost:3001/api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <文件>
title: <标题>
description: <描述>
orderMode: 顺序|随机
```

### 6. 文字处理
直接输入文字内容创建题库：
```
POST http://localhost:3001/api/upload/text
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "<题库内容>",
  "title": "<标题>",
  "description": "<描述>",
  "orderMode": "顺序"
}
```

## 演示题库

### 1. 前端开发基础题库
- **文件**: frontend-quiz.txt
- **格式**: TXT
- **内容**: HTML、CSS、JavaScript、Vue、React
- **题目数量**: 约15题

### 2. 后端开发进阶题库
- **文件**: backend-quiz.md
- **格式**: Markdown
- **内容**: 数据库、API、缓存、微服务
- **题目数量**: 约20题

### 3. 系统设计题库
- **文件**: system-design-quiz.csv
- **格式**: CSV
- **内容**: 分布式系统、负载均衡、缓存策略
- **题目数量**: 约10题

### 4. 算法与数据结构题库
- **创建方式**: 文字输入
- **内容**: 排序算法、数据结构、图论
- **题目数量**: 约5题

## 功能特性演示

### ✅ 已实现功能
- [x] 用户注册和认证
- [x] 多格式文件上传（TXT、MD、CSV）
- [x] 文字内容处理
- [x] 异步任务处理
- [x] 题库管理（CRUD）
- [x] 任务状态监控
- [x] 系统健康检查
- [x] API版本管理

### ⚠️ 需要配置
- [ ] Gemini API密钥（AI处理功能）

### 🚀 扩展功能
- [ ] 题库收藏和分类
- [ ] 错题本功能
- [ ] 学习进度跟踪
- [ ] 题目难度评级

## 技术架构

- **后端框架**: Express.js + TypeScript
- **数据库**: Prisma ORM + SQLite/PostgreSQL
- **队列系统**: BullMQ + Redis
- **AI服务**: Google Gemini API
- **认证**: JWT
- **文件处理**: Multer + 多格式解析器

## 性能指标

- **API响应时间**: < 200ms
- **文件上传限制**: 10MB
- **并发处理**: 支持多用户
- **队列处理**: 异步任务处理
- **错误处理**: 完整的错误捕获和日志

## 故障排除

### 常见问题

1. **AI处理失败**
   - 原因：未配置Gemini API密钥
   - 解决：设置环境变量 GEMINI_API_KEY

2. **文件上传失败**
   - 检查文件格式是否支持
   - 确认文件大小不超过限制

3. **认证失败**
   - 检查JWT令牌是否有效
   - 确认用户账户状态

## 联系信息

如有问题或建议，请联系开发团队。
