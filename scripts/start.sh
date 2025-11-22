#!/bin/bash
# 启动脚本 - 乔布斯式吧唧生成器

echo "🍎 吧唧生成器启动中..."
echo "✨ 乔布斯式极致体验，简单到极致！"
echo ""

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装，请先安装Python3"
    exit 1
fi

# 检查pip
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 未安装，请先安装pip3"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖包..."
pip3 install -r requirements.txt

# 创建必要的目录
echo "📁 创建目录结构..."
mkdir -p static/uploads
mkdir -p static/exports
mkdir -p static/images
mkdir -p static/css
mkdir -p static/js
mkdir -p templates
mkdir -p config
mkdir -p routes
mkdir -p utils
mkdir -p test
mkdir -p scripts

# 启动应用
echo "🚀 启动应用..."
echo "访问地址: http://localhost:5000"
echo "设计页面: http://localhost:5000/design"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

python3 main.py
