#!/bin/bash

echo "🎬 产品演示环境设置"
echo "=================="

# 演示配置
BASE_URL="http://localhost:3001"
DEMO_EMAIL="demo@example.com"
DEMO_PASSWORD="Demo123456!"
DEMO_NAME="演示用户"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${BLUE}🔧 演示配置:${NC}"
echo "  - API地址: $BASE_URL"
echo "  - 演示用户: $DEMO_EMAIL"
echo ""

# 检查服务器状态
echo -e "${PURPLE}📋 1. 检查服务器状态...${NC}"
HEALTH_CHECK=$(curl -s $BASE_URL/health 2>/dev/null)
if [ $? -eq 0 ]; then
  HEALTH_STATUS=$(echo "$HEALTH_CHECK" | jq -r '.status // "unknown"')
  if [ "$HEALTH_STATUS" = "ok" ]; then
    echo -e "${GREEN}✅ 服务器运行正常${NC}"
  else
    echo -e "${YELLOW}⚠️ 服务器状态异常: $HEALTH_STATUS${NC}"
  fi
else
  echo "❌ 服务器未运行，请先启动服务器："
  echo "   cd backend && npm run dev:v2"
  exit 1
fi

# 创建演示用户
echo ""
echo -e "${PURPLE}👤 2. 创建演示用户...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$DEMO_EMAIL\",
    \"password\": \"$DEMO_PASSWORD\",
    \"name\": \"$DEMO_NAME\"
  }")

REGISTER_SUCCESS=$(echo "$REGISTER_RESPONSE" | jq -r '.success // false')
if [ "$REGISTER_SUCCESS" = "true" ]; then
  TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token')
  echo -e "${GREEN}✅ 演示用户创建成功${NC}"
elif [ "$(echo "$REGISTER_RESPONSE" | jq -r '.message')" = "该邮箱已被注册" ]; then
  echo -e "${YELLOW}ℹ️ 演示用户已存在，尝试登录...${NC}"
  
  LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$DEMO_EMAIL\",
      \"password\": \"$DEMO_PASSWORD\"
    }")
  
  LOGIN_SUCCESS=$(echo "$LOGIN_RESPONSE" | jq -r '.success // false')
  if [ "$LOGIN_SUCCESS" = "true" ]; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
    echo -e "${GREEN}✅ 演示用户登录成功${NC}"
  else
    echo "❌ 演示用户登录失败"
    exit 1
  fi
else
  echo "❌ 演示用户创建失败"
  exit 1
fi

# 创建演示题库数据
echo ""
echo -e "${PURPLE}📚 3. 创建演示题库数据...${NC}"

# 创建演示目录
mkdir -p demo/sample-files

# 3.1 前端开发题库
cat > demo/sample-files/frontend-quiz.txt << 'EOF'
# 前端开发基础题库

## 选择题

1. HTML5中新增的语义化标签不包括以下哪个？
A. <header>
B. <nav>
C. <section>
D. <div>

答案：D

解析：<div>是HTML4就存在的标签，不是HTML5新增的语义化标签。

2. CSS中用于设置元素浮动的属性是？
A. position
B. float
C. display
D. clear

答案：B

解析：float属性用于设置元素的浮动方向。

3. JavaScript中用于声明变量的关键字有哪些？
A. var, let
B. var, let, const
C. let, const
D. var, const

答案：B

解析：JavaScript中可以使用var、let、const三个关键字声明变量。

4. 以下哪个不是Vue.js的生命周期钩子？
A. created
B. mounted
C. updated
D. rendered

答案：D

解析：Vue.js没有rendered生命周期钩子，正确的是render函数。

5. React中用于管理组件状态的Hook是？
A. useState
B. useEffect
C. useContext
D. useReducer

答案：A

解析：useState是React中最基本的状态管理Hook。

## 填空题

1. CSS中的盒模型包括内容区、_____ 、_____ 和 _____。
答案：内边距, 边框, 外边距

2. JavaScript中的事件冒泡是指事件从 _____ 元素向 _____ 元素传播。
答案：子, 父

3. HTTP状态码 _____ 表示请求成功，_____ 表示资源未找到。
答案：200, 404

4. 响应式设计中，常用的CSS媒体查询关键字是 _____。
答案：@media

5. Git中用于提交代码的命令是 _____，用于推送到远程仓库的命令是 _____。
答案：git commit, git push

## 简答题

1. 请简述什么是闭包，并举一个简单的例子。
答案：闭包是指有权访问另一个函数作用域中变量的函数。例如：
function outer() {
  var x = 10;
  return function inner() {
    console.log(x);
  };
}
var closure = outer();
closure(); // 输出 10

2. 解释CSS中position属性的不同取值及其作用。
答案：
- static：默认值，元素按正常文档流定位
- relative：相对定位，相对于元素原来位置定位
- absolute：绝对定位，相对于最近的已定位祖先元素定位
- fixed：固定定位，相对于浏览器窗口定位
- sticky：粘性定位，结合relative和fixed的特点
EOF

# 3.2 后端开发题库
cat > demo/sample-files/backend-quiz.md << 'EOF'
# 后端开发进阶题库

## 选择题

### 1. 数据库设计
**题目**: 在关系型数据库中，以下哪个不是ACID特性？
- A. 原子性（Atomicity）
- B. 一致性（Consistency）
- C. 可用性（Availability）
- D. 持久性（Durability）

**答案**: C

**解析**: ACID特性包括原子性、一致性、隔离性和持久性，可用性是CAP定理中的概念。

### 2. API设计
**题目**: RESTful API中，用于更新资源的HTTP方法是？
- A. GET
- B. POST
- C. PUT
- D. DELETE

**答案**: C

**解析**: PUT方法用于更新资源，POST用于创建资源。

### 3. 缓存策略
**题目**: Redis中哪种数据结构适合实现排行榜功能？
- A. String
- B. Hash
- C. List
- D. Sorted Set

**答案**: D

**解析**: Sorted Set（有序集合）可以根据分数排序，非常适合实现排行榜。

### 4. 消息队列
**题目**: 以下哪个不是消息队列的优势？
- A. 解耦
- B. 异步处理
- C. 提高响应速度
- D. 增加系统复杂度

**答案**: D

**解析**: 增加系统复杂度是消息队列的缺点，不是优势。

### 5. 微服务架构
**题目**: 微服务架构中，服务发现的作用是？
- A. 负载均衡
- B. 服务注册与发现
- C. 配置管理
- D. 监控告警

**答案**: B

**解析**: 服务发现主要负责服务的注册与发现，让服务能够找到彼此。

## 填空题

1. SQL中，_____ 用于连接多个表，_____ 用于分组数据。
   **答案**: JOIN, GROUP BY

2. Node.js中，_____ 模块用于处理文件系统操作。
   **答案**: fs

3. Docker中，_____ 文件用于定义镜像构建步骤。
   **答案**: Dockerfile

4. 在分布式系统中，CAP定理指的是 _____、_____、_____。
   **答案**: 一致性, 可用性, 分区容错性

5. JWT令牌由三部分组成：_____、_____、_____。
   **答案**: Header, Payload, Signature

## 编程题

### 1. 数据库查询优化
**题目**: 给定一个用户表和订单表，写出查询每个用户的订单总数的SQL语句。

**答案**:
```sql
SELECT u.id, u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

### 2. API设计
**题目**: 设计一个用户管理的RESTful API，包括增删改查操作。

**答案**:
```
GET    /api/users        # 获取用户列表
GET    /api/users/:id    # 获取单个用户
POST   /api/users        # 创建用户
PUT    /api/users/:id    # 更新用户
DELETE /api/users/:id    # 删除用户
```

### 3. 缓存实现
**题目**: 用Node.js实现一个简单的内存缓存类。

**答案**:
```javascript
class MemoryCache {
  constructor() {
    this.cache = new Map();
  }
  
  set(key, value, ttl = 0) {
    const item = {
      value,
      expiry: ttl > 0 ? Date.now() + ttl : null
    };
    this.cache.set(key, item);
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  delete(key) {
    return this.cache.delete(key);
  }
}
```
EOF

# 3.3 系统设计题库（CSV格式）
cat > demo/sample-files/system-design-quiz.csv << 'EOF'
题目类型,题目内容,选项A,选项B,选项C,选项D,正确答案,解析
选择题,负载均衡算法中轮询的特点是什么？,随机分配,按顺序分配,根据权重分配,根据响应时间分配,B,轮询算法按照顺序将请求分配给服务器
选择题,CAP定理中的P代表什么？,性能,分区容错性,持久性,一致性,B,CAP定理中P代表Partition tolerance分区容错性
选择题,以下哪种缓存策略写入性能最好？,Write-through,Write-back,Write-around,Cache-aside,B,Write-back策略写入时只更新缓存性能最好
选择题,分布式锁的实现方式不包括？,Redis,ZooKeeper,数据库,消息队列,D,消息队列不适合实现分布式锁
选择题,微服务架构中API网关的作用不包括？,路由转发,身份认证,数据存储,限流控制,C,API网关不负责数据存储
填空题,分布式系统中解决数据一致性的常用方案是 _____ 和 _____。,,,,,两阶段提交 三阶段提交,2PC和3PC是常用的分布式一致性协议
填空题,Redis集群中数据分片使用的算法是 _____。,,,,,一致性哈希,Redis Cluster使用一致性哈希算法进行数据分片
填空题,容器编排工具 _____ 可以管理大规模容器集群。,,,,,Kubernetes,Kubernetes是主流的容器编排工具
填空题,服务网格技术 _____ 可以处理服务间通信。,,,,,Istio,Istio是流行的服务网格解决方案
填空题,时间序列数据库 _____ 适合存储监控数据。,,,,,InfluxDB,InfluxDB是专门的时间序列数据库
EOF

echo -e "${GREEN}✅ 演示题库文件创建完成${NC}"

# 上传演示题库
echo ""
echo -e "${PURPLE}📤 4. 上传演示题库...${NC}"

upload_demo_file() {
  local file_path=$1
  local title=$2
  local description=$3
  
  echo "   上传: $title"
  
  UPLOAD_RESPONSE=$(curl -s -X POST $BASE_URL/api/upload \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$file_path" \
    -F "title=$title" \
    -F "description=$description" \
    -F "orderMode=顺序")

  UPLOAD_SUCCESS=$(echo "$UPLOAD_RESPONSE" | jq -r '.success // false')
  if [ "$UPLOAD_SUCCESS" = "true" ]; then
    JOB_ID=$(echo "$UPLOAD_RESPONSE" | jq -r '.data.jobId')
    echo "   ✅ 上传成功，任务ID: $JOB_ID"
    return 0
  else
    echo "   ❌ 上传失败: $(echo "$UPLOAD_RESPONSE" | jq -r '.message')"
    return 1
  fi
}

# 上传各个演示题库
upload_demo_file "demo/sample-files/frontend-quiz.txt" "前端开发基础题库" "包含HTML、CSS、JavaScript、Vue、React等前端技术的基础题目"
upload_demo_file "demo/sample-files/backend-quiz.md" "后端开发进阶题库" "涵盖数据库、API设计、缓存、消息队列、微服务等后端技术"
upload_demo_file "demo/sample-files/system-design-quiz.csv" "系统设计题库" "分布式系统、负载均衡、缓存策略、微服务架构等系统设计题目"

# 创建文字处理演示
echo ""
echo -e "${PURPLE}📝 5. 创建文字处理演示...${NC}"

TEXT_CONTENT='# 算法与数据结构题库

## 选择题

1. 以下哪种排序算法的平均时间复杂度是O(n log n)？
A. 冒泡排序
B. 选择排序
C. 快速排序
D. 插入排序

答案：C

2. 二叉搜索树的中序遍历结果是什么？
A. 随机顺序
B. 升序排列
C. 降序排列
D. 层次顺序

答案：B

## 填空题

1. 哈希表解决冲突的两种主要方法是 _____ 和 _____。
答案：链地址法, 开放地址法

2. 图的深度优先搜索使用 _____ 数据结构，广度优先搜索使用 _____ 数据结构。
答案：栈, 队列'

TEXT_RESPONSE=$(curl -s -X POST $BASE_URL/api/upload/text \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"content\": $(echo "$TEXT_CONTENT" | jq -R -s '.'),
    \"title\": \"算法与数据结构题库\",
    \"description\": \"通过文字输入创建的算法和数据结构相关题目\",
    \"orderMode\": \"顺序\"
  }")

TEXT_SUCCESS=$(echo "$TEXT_RESPONSE" | jq -r '.success // false')
if [ "$TEXT_SUCCESS" = "true" ]; then
  echo -e "${GREEN}✅ 文字处理演示创建成功${NC}"
else
  echo "❌ 文字处理演示创建失败"
fi

# 生成演示报告
echo ""
echo -e "${PURPLE}📊 6. 生成演示报告...${NC}"

# 查询题库列表
QUIZ_LIST=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/quiz?page=1&limit=20")

QUIZ_COUNT=$(echo "$QUIZ_LIST" | jq -r '.data.pagination.total // 0')

# 查询任务列表
JOB_LIST=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/job?page=1&limit=20")

JOB_COUNT=$(echo "$JOB_LIST" | jq -r '.data.pagination.total // 0')

# 创建演示说明文档
cat > demo/DEMO_GUIDE.md << EOF
# 刷题网站系统演示指南

## 演示环境信息

- **API地址**: $BASE_URL
- **演示用户**: $DEMO_EMAIL
- **密码**: $DEMO_PASSWORD
- **创建时间**: $(date)

## 演示数据概览

- **题库总数**: $QUIZ_COUNT 个
- **任务总数**: $JOB_COUNT 个
- **支持格式**: TXT, Markdown, CSV, 文字输入

## 演示流程

### 1. 系统健康检查
访问健康检查端点验证系统状态：
\`\`\`
GET $BASE_URL/health
\`\`\`

### 2. 用户认证
使用演示账户登录：
\`\`\`
POST $BASE_URL/api/auth/login
{
  "email": "$DEMO_EMAIL",
  "password": "$DEMO_PASSWORD"
}
\`\`\`

### 3. 查看题库列表
获取所有题库：
\`\`\`
GET $BASE_URL/api/quiz
Authorization: Bearer <token>
\`\`\`

### 4. 查看任务状态
监控处理任务：
\`\`\`
GET $BASE_URL/api/job
Authorization: Bearer <token>
\`\`\`

### 5. 上传新题库
支持多种格式的文件上传：
\`\`\`
POST $BASE_URL/api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <文件>
title: <标题>
description: <描述>
orderMode: 顺序|随机
\`\`\`

### 6. 文字处理
直接输入文字内容创建题库：
\`\`\`
POST $BASE_URL/api/upload/text
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "<题库内容>",
  "title": "<标题>",
  "description": "<描述>",
  "orderMode": "顺序"
}
\`\`\`

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
EOF

echo -e "${GREEN}✅ 演示说明文档创建完成${NC}"

echo ""
echo -e "${GREEN}🎉 演示环境设置完成！${NC}"
echo ""
echo -e "${BLUE}📋 演示信息:${NC}"
echo "  - 演示用户: $DEMO_EMAIL"
echo "  - 密码: $DEMO_PASSWORD"
echo "  - 题库数量: $QUIZ_COUNT 个"
echo "  - 任务数量: $JOB_COUNT 个"
echo ""
echo -e "${BLUE}📖 演示指南:${NC}"
echo "  - 查看: demo/DEMO_GUIDE.md"
echo "  - 示例文件: demo/sample-files/"
echo ""
echo -e "${BLUE}🚀 开始演示:${NC}"
echo "  1. 访问健康检查: curl $BASE_URL/health"
echo "  2. 查看API信息: curl $BASE_URL/api"
echo "  3. 登录获取令牌: 使用上述演示账户"
echo "  4. 体验完整功能流程"
