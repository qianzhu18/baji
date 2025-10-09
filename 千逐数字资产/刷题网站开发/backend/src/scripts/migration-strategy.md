# 数据迁移策略：MongoDB → Prisma (SQLite/PostgreSQL)

## 1. 迁移概述

### 1.1 目标
- 将现有MongoDB数据平滑迁移到Prisma管理的关系型数据库
- 保证数据完整性和一致性
- 最小化服务中断时间
- 支持回滚机制

### 1.2 迁移范围
- **用户数据** (User collection → users table)
- **题库数据** (Quiz collection → quizzes table)
- **任务数据** (Job collection → jobs table)
- **文件数据** (File metadata)

## 2. 数据模型映射

### 2.1 用户数据映射
```
MongoDB User Collection → Prisma users table
{
  _id: ObjectId          → id: String (UUID)
  email: String          → email: String
  password: String       → password: String
  name: String           → name: String
  avatar: String?        → avatar: String?
  role: String           → (暂不迁移，V2使用默认角色)
  createdAt: Date        → createdAt: DateTime
  updatedAt: Date        → updatedAt: DateTime
  isActive: Boolean      → isActive: Boolean (默认true)
}
```

### 2.2 题库数据映射
```
MongoDB Quiz Collection → Prisma quizzes table
{
  _id: ObjectId          → id: String (UUID)
  title: String          → title: String
  description: String    → description: String?
  html: String           → html: String?
  status: String         → status: String
  userId: ObjectId       → userId: String (映射到新用户ID)
  createdAt: Date        → createdAt: DateTime
  updatedAt: Date        → updatedAt: DateTime
  errorMsg: String?      → errorMsg: String?
}
```

### 2.3 任务数据映射
```
MongoDB Job Collection → Prisma jobs table
{
  _id: ObjectId          → id: String (UUID)
  type: String           → type: String
  status: String         → status: String
  progress: Number       → progress: Int
  data: Object           → data: Json
  result: Object?        → result: Json?
  error: String?         → error: String?
  userId: ObjectId       → userId: String (映射到新用户ID)
  quizId: ObjectId?      → quizId: String? (映射到新题库ID)
  createdAt: Date        → createdAt: DateTime
  updatedAt: Date        → updatedAt: DateTime
}
```

## 3. 迁移策略

### 3.1 分阶段迁移
1. **阶段1：数据导出和验证**
   - 从MongoDB导出所有数据
   - 数据完整性检查
   - 创建ID映射表

2. **阶段2：数据转换**
   - ObjectId → UUID转换
   - 数据格式标准化
   - 关联关系重建

3. **阶段3：数据导入**
   - 按依赖顺序导入（用户→题库→任务）
   - 实时验证数据完整性
   - 创建索引和约束

4. **阶段4：验证和切换**
   - 数据一致性验证
   - 功能测试
   - 服务切换

### 3.2 零停机迁移方案
1. **双写模式**：新数据同时写入MongoDB和Prisma
2. **数据同步**：定期同步历史数据
3. **读写分离**：逐步将读操作切换到Prisma
4. **完全切换**：停止MongoDB写入

## 4. 风险控制

### 4.1 数据备份
- 迁移前完整备份MongoDB数据
- 迁移过程中创建检查点
- 支持快速回滚机制

### 4.2 数据验证
- 记录总数验证
- 关键字段完整性检查
- 关联关系验证
- 业务逻辑验证

### 4.3 回滚策略
- 保留MongoDB数据直到迁移完全稳定
- 支持快速切换回MongoDB
- 数据差异同步机制

## 5. 实施计划

### 5.1 准备阶段 (1-2天)
- [ ] 创建迁移脚本
- [ ] 设置测试环境
- [ ] 数据备份和验证

### 5.2 迁移阶段 (1天)
- [ ] 执行数据迁移
- [ ] 数据验证和测试
- [ ] 性能基准测试

### 5.3 验证阶段 (1-2天)
- [ ] 功能完整性测试
- [ ] 性能对比测试
- [ ] 用户验收测试

### 5.4 切换阶段 (半天)
- [ ] 服务切换
- [ ] 监控和告警
- [ ] 问题快速响应

## 6. 监控指标

### 6.1 迁移过程监控
- 数据迁移进度
- 错误率和失败记录
- 性能指标（吞吐量、延迟）

### 6.2 迁移后监控
- 数据一致性检查
- API响应时间对比
- 错误率监控
- 用户反馈收集

## 7. 应急预案

### 7.1 迁移失败处理
1. 立即停止迁移进程
2. 分析失败原因
3. 修复问题后重新开始
4. 必要时回滚到MongoDB

### 7.2 性能问题处理
1. 识别性能瓶颈
2. 优化数据库查询
3. 调整索引策略
4. 考虑数据分片

### 7.3 数据不一致处理
1. 识别不一致数据
2. 分析根本原因
3. 手动修复关键数据
4. 更新迁移脚本

## 8. 成功标准

### 8.1 数据完整性
- [ ] 用户数据100%迁移成功
- [ ] 题库数据100%迁移成功
- [ ] 任务数据100%迁移成功
- [ ] 关联关系100%正确

### 8.2 功能完整性
- [ ] 所有API端点正常工作
- [ ] 用户认证功能正常
- [ ] 文件上传和处理正常
- [ ] 任务队列正常运行

### 8.3 性能指标
- [ ] API响应时间不超过原系统120%
- [ ] 数据库查询性能满足要求
- [ ] 并发处理能力不降低

## 9. 后续优化

### 9.1 数据库优化
- 索引优化
- 查询性能调优
- 连接池配置

### 9.2 架构优化
- 缓存策略实施
- 读写分离
- 数据分片考虑

### 9.3 监控完善
- 详细的性能监控
- 业务指标监控
- 告警机制完善
