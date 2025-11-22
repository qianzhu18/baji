#!/bin/bash
# 测试脚本 - 乔布斯式吧唧生成器

echo "🧪 运行测试套件..."
echo "✨ 确保代码质量，追求完美！"
echo ""

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装，请先安装Python3"
    exit 1
fi

# 运行测试
echo "📋 执行测试..."
python3 -m pytest . -v

echo ""
echo "✅ 测试完成！"
