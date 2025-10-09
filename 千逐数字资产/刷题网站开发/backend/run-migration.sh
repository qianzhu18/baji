#!/bin/bash

echo "🚀 数据迁移执行脚本"
echo "===================="

# 配置检查
echo "📋 1. 环境配置检查..."

# 检查必要的环境变量
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️ 警告: DATABASE_URL 未设置，将使用默认SQLite数据库"
fi

if [ -z "$MONGODB_URI" ]; then
  echo "⚠️ 警告: MONGODB_URI 未设置，将使用默认MongoDB连接"
  export MONGODB_URI="mongodb://localhost:27017/quiz-system"
fi

echo "✅ 环境配置检查完成"

# 数据库备份
echo ""
echo "💾 2. 数据备份..."

# 备份MongoDB数据
echo "📦 备份MongoDB数据..."
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if command -v mongodump &> /dev/null; then
  mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/mongodb"
  echo "✅ MongoDB数据备份完成: $BACKUP_DIR/mongodb"
else
  echo "⚠️ 警告: mongodump 未安装，跳过MongoDB备份"
fi

# 备份Prisma数据库（如果存在）
if [ -f "prisma/dev.db" ]; then
  cp prisma/dev.db "$BACKUP_DIR/prisma_dev.db.backup"
  echo "✅ Prisma数据库备份完成: $BACKUP_DIR/prisma_dev.db.backup"
fi

# 数据库准备
echo ""
echo "🔧 3. 数据库准备..."

# 确保Prisma数据库是最新的
echo "📊 更新Prisma数据库架构..."
npx prisma db push --force-reset
echo "✅ Prisma数据库架构更新完成"

# 执行迁移
echo ""
echo "🔄 4. 执行数据迁移..."

echo "📝 编译TypeScript代码..."
npx tsc src/scripts/migrate-data.ts --outDir dist/scripts --moduleResolution node --esModuleInterop --target es2020

if [ $? -eq 0 ]; then
  echo "✅ TypeScript编译成功"
else
  echo "❌ TypeScript编译失败"
  exit 1
fi

echo "🚀 开始数据迁移..."
node dist/scripts/migrate-data.js

MIGRATION_EXIT_CODE=$?

if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
  echo "✅ 数据迁移成功完成"
else
  echo "❌ 数据迁移失败，退出码: $MIGRATION_EXIT_CODE"
  
  # 询问是否回滚
  read -p "是否要回滚到备份数据？(y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 开始回滚..."
    
    # 回滚Prisma数据库
    if [ -f "$BACKUP_DIR/prisma_dev.db.backup" ]; then
      cp "$BACKUP_DIR/prisma_dev.db.backup" prisma/dev.db
      echo "✅ Prisma数据库已回滚"
    fi
    
    echo "✅ 回滚完成"
  fi
  
  exit $MIGRATION_EXIT_CODE
fi

# 验证迁移结果
echo ""
echo "🔍 5. 验证迁移结果..."

echo "📝 编译验证脚本..."
npx tsc src/scripts/validate-migration.ts --outDir dist/scripts --moduleResolution node --esModuleInterop --target es2020

if [ $? -eq 0 ]; then
  echo "✅ 验证脚本编译成功"
else
  echo "❌ 验证脚本编译失败"
  exit 1
fi

echo "🔍 开始验证..."
node dist/scripts/validate-migration.js

VALIDATION_EXIT_CODE=$?

if [ $VALIDATION_EXIT_CODE -eq 0 ]; then
  echo "✅ 数据验证通过"
else
  echo "❌ 数据验证失败，退出码: $VALIDATION_EXIT_CODE"
  echo "⚠️ 建议检查验证报告并考虑回滚"
fi

# 清理临时文件
echo ""
echo "🧹 6. 清理临时文件..."
rm -rf dist/scripts
echo "✅ 临时文件清理完成"

# 迁移总结
echo ""
echo "📊 7. 迁移总结..."
echo "===================="

if [ $MIGRATION_EXIT_CODE -eq 0 ] && [ $VALIDATION_EXIT_CODE -eq 0 ]; then
  echo "🎉 数据迁移完全成功！"
  echo "📁 备份位置: $BACKUP_DIR"
  echo "📋 ID映射文件: ./migration-mappings.json"
  echo ""
  echo "✅ 下一步建议:"
  echo "   1. 测试应用程序功能"
  echo "   2. 监控系统性能"
  echo "   3. 确认无误后可删除MongoDB数据"
  echo "   4. 更新部署配置"
else
  echo "⚠️ 数据迁移存在问题"
  echo "📁 备份位置: $BACKUP_DIR"
  echo ""
  echo "🔧 建议操作:"
  echo "   1. 检查错误日志"
  echo "   2. 修复发现的问题"
  echo "   3. 考虑回滚到备份"
  echo "   4. 重新执行迁移"
fi

echo ""
echo "📞 如需帮助，请查看迁移文档: src/scripts/migration-strategy.md"
