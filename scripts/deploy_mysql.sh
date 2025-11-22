#!/bin/bash
# 吧唧生成器 - 快速部署脚本

set -e

echo "🚀 吧唧生成器 - MySQL部署脚本"
echo "================================"

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "📝 创建环境变量文件..."
    cp env.example .env
    echo "⚠️  请编辑 .env 文件，修改密码和配置"
    echo "   重要：修改 SECRET_KEY, ADMIN_PASSWORD, MYSQL_PASSWORD"
    echo "   数据库：取消注释MySQL配置并设置DATABASE_URL"
    read -p "按回车键继续..."
fi

# 启动服务
echo "🐳 启动Docker服务..."
docker-compose -f docker-compose.mysql.yml up -d

# 等待MySQL启动
echo "⏳ 等待MySQL启动..."
sleep 30

# 初始化数据库
echo "🗄️  初始化数据库..."
docker-compose -f docker-compose.mysql.yml exec web python scripts/init_mysql_database.py

# 测试连接
echo "🔍 测试数据库连接..."
docker-compose -f docker-compose.mysql.yml exec web python scripts/init_mysql_database.py --test

echo ""
echo "✅ 部署完成！"
echo "🌐 访问地址: http://your-server-ip"
echo "📊 管理后台: http://your-server-ip/admin"
echo ""
echo "📋 服务状态:"
docker-compose -f docker-compose.mysql.yml ps
