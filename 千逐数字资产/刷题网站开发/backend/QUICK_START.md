# 🚀 快速开始指南

## 一分钟体验完整功能

### 前提条件
- Node.js 16+ 
- Redis 服务器运行中
- Gemini API密钥（可选，用于AI功能）

### 1️⃣ 安装依赖
```bash
cd backend
npm install
```

### 2️⃣ 配置系统（推荐使用配置向导）
```bash
# 运行配置向导
npm run config:setup
```

或者手动配置：
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，至少设置：
# GEMINI_API_KEY=your_api_key_here
```

### 3️⃣ 初始化数据库
```bash
npx prisma db push
```

### 4️⃣ 启动服务器
```bash
npm run dev:v2
```

### 5️⃣ 验证系统
```bash
# 健康检查
curl http://localhost:3001/health

# API信息
curl http://localhost:3001/api
```

### 6️⃣ 设置演示环境（可选）
```bash
chmod +x demo/demo-setup.sh
./demo/demo-setup.sh
```

## 🎯 核心功能测试

### 用户注册
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### 文件上传
```bash
# 创建测试文件
echo "# 测试题库

## 选择题

1. 1+1等于多少？
A. 1
B. 2
C. 3
D. 4

答案：B" > test-quiz.txt

# 上传文件（需要先获取token）
curl -X POST http://localhost:3001/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-quiz.txt" \
  -F "title=测试题库" \
  -F "description=快速测试" \
  -F "orderMode=顺序"
```

### 文字处理
```bash
curl -X POST http://localhost:3001/api/upload/text \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# 即时题库\n\n## 选择题\n\n1. 测试题目？\nA. 选项A\nB. 选项B\n\n答案：A",
    "title": "即时创建的题库",
    "description": "通过文字输入创建",
    "orderMode": "顺序"
  }'
```

## 🔧 配置说明

### 必需配置
```env
# Gemini AI API密钥（必需）
GEMINI_API_KEY=your_api_key_here
```

### 可选配置
```env
# 服务器配置
PORT=3001
HOST=localhost
NODE_ENV=development

# 数据库（默认SQLite）
DATABASE_URL="file:./prisma/dev.db"

# Redis（默认本地）
REDIS_URL="redis://localhost:6379"

# JWT安全
JWT_SECRET=your_secure_secret
JWT_EXPIRES_IN=7d
```

## 📊 系统监控

### 健康检查
```bash
curl http://localhost:3001/health
```

### 配置验证
```bash
npm run config:validate
```

### 完整功能测试
```bash
chmod +x test-complete-functionality.sh
./test-complete-functionality.sh
```

## 🎬 演示模式

### 快速演示设置
```bash
# 设置演示环境
chmod +x demo/demo-setup.sh
./demo/demo-setup.sh

# 演示账户
# 邮箱: demo@example.com
# 密码: Demo123456!
```

### 演示内容
- ✅ 前端开发题库（TXT格式）
- ✅ 后端开发题库（Markdown格式）
- ✅ 系统设计题库（CSV格式）
- ✅ 算法题库（文字输入）

## 🚨 故障排除

### 常见问题

#### 1. 服务器启动失败
```bash
# 检查端口占用
lsof -ti:3001 | xargs kill -9

# 检查配置
npm run config:validate
```

#### 2. AI处理失败
```bash
# 检查API密钥
echo $GEMINI_API_KEY

# 重新配置
npm run config:setup
```

#### 3. 数据库连接失败
```bash
# 重新初始化数据库
npx prisma db push --force-reset
```

#### 4. Redis连接失败
```bash
# 检查Redis服务
redis-cli ping

# 启动Redis（macOS）
brew services start redis
```

## 📚 API文档

### 认证端点
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录

### 文件处理
- `POST /api/upload` - 文件上传
- `POST /api/upload/text` - 文字处理

### 题库管理
- `GET /api/quiz` - 题库列表
- `GET /api/quiz/:id` - 题库详情
- `DELETE /api/quiz/:id` - 删除题库

### 任务管理
- `GET /api/job` - 任务列表
- `GET /api/job/:id` - 任务详情
- `DELETE /api/job/:id` - 删除任务

### 系统监控
- `GET /health` - 健康检查
- `GET /api` - API信息

## 🔗 相关链接

- [配置文档](CONFIG.md)
- [演示指南](demo/DEMO_GUIDE.md)
- [API测试脚本](test-complete-functionality.sh)
- [迁移指南](src/scripts/migration-strategy.md)

## 💡 提示

1. **首次使用**：建议运行 `npm run config:setup` 进行配置
2. **开发环境**：使用 SQLite 数据库即可
3. **生产环境**：建议使用 PostgreSQL 数据库
4. **AI功能**：需要有效的 Gemini API 密钥
5. **演示模式**：运行 `demo/demo-setup.sh` 快速体验

## 🆘 获取帮助

如果遇到问题：
1. 查看服务器日志
2. 运行 `npm run config:validate` 检查配置
3. 查看 [故障排除指南](#-故障排除)
4. 检查 [常见问题](#常见问题)

---

**🎉 现在您可以开始体验完整的刷题网站系统了！**
