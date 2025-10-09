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
