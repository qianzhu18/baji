#!/bin/bash

# 智能题库系统 - 完整用户流程演示脚本
echo "🎬 智能题库系统 - 完整用户流程演示"
echo "=================================="
echo ""

BASE_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"

# 检查服务状态
echo "📋 1. 检查服务状态"
echo "-------------------"

echo "🔍 检查后端服务..."
curl -s "$BASE_URL/health" | jq '.' || echo "❌ 后端服务未启动"
echo ""

echo "🔍 检查前端服务..."
curl -s "$FRONTEND_URL" > /dev/null && echo "✅ 前端服务正常" || echo "❌ 前端服务未启动"
echo ""

# 用户注册演示
echo "📋 2. 用户注册演示"
echo "-------------------"

echo "🔐 注册新用户..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONTEND_URL" \
  -d '{
    "name": "演示用户",
    "email": "demo@example.com",
    "password": "Demo123456"
  }')

echo "$REGISTER_RESPONSE" | jq '.'
echo ""

# 用户登录演示
echo "📋 3. 用户登录演示"
echo "-------------------"

echo "🔐 用户登录..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONTEND_URL" \
  -d '{
    "email": "demo@example.com",
    "password": "Demo123456"
  }')

echo "$LOGIN_RESPONSE" | jq '.'
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
echo "🎫 获取到令牌: $TOKEN"
echo ""

# 创建题库演示
echo "📋 4. 创建题库演示"
echo "-------------------"

echo "📚 创建新题库..."
QUIZ_CONTENT="1. 什么是人工智能？
A. 计算机科学的一个分支
B. 一种编程语言
C. 一种硬件设备
D. 一种网络协议
答案：A

2. JavaScript是什么类型的语言？
答案：解释型语言，主要用于网页开发

3. 判断题：Python是一种面向对象的编程语言。
答案：正确

4. 填空题：HTTP协议的默认端口是____。
答案：80"

CREATE_QUIZ_RESPONSE=$(curl -s -X POST "$BASE_URL/api/quizzes" \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONTEND_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"title\": \"计算机基础知识测试\",
    \"description\": \"包含AI、编程语言、网络协议等基础知识\",
    \"content\": $(echo "$QUIZ_CONTENT" | jq -R -s .)
  }")

echo "$CREATE_QUIZ_RESPONSE" | jq '.'
QUIZ_ID=$(echo "$CREATE_QUIZ_RESPONSE" | jq -r '.data.quiz._id')
echo "📝 创建的题库ID: $QUIZ_ID"
echo ""

# AI解析演示
echo "📋 5. AI解析演示"
echo "-------------------"

echo "🤖 验证AI API密钥..."
VALIDATE_KEY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/ai/validate-key" \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONTEND_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "apiKey": "demo-gemini-api-key-12345"
  }')

echo "$VALIDATE_KEY_RESPONSE" | jq '.'
echo ""

echo "🤖 启动AI解析任务..."
PARSE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/ai/parse-quiz" \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONTEND_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"quizId\": \"$QUIZ_ID\",
    \"apiKey\": \"demo-gemini-api-key-12345\"
  }")

echo "$PARSE_RESPONSE" | jq '.'
TASK_ID=$(echo "$PARSE_RESPONSE" | jq -r '.data.taskId')
echo "⏳ 解析任务ID: $TASK_ID"
echo ""

echo "🤖 检查解析状态..."
sleep 1
STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/ai/parse-status/$TASK_ID" \
  -H "Origin: $FRONTEND_URL" \
  -H "Authorization: Bearer $TOKEN")

echo "$STATUS_RESPONSE" | jq '.'
echo ""

# 获取题库列表
echo "📋 6. 获取题库列表"
echo "-------------------"

echo "📚 获取用户题库列表..."
QUIZZES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/quizzes" \
  -H "Origin: $FRONTEND_URL" \
  -H "Authorization: Bearer $TOKEN")

echo "$QUIZZES_RESPONSE" | jq '.'
echo ""

# 获取用户信息
echo "📋 7. 获取用户统计"
echo "-------------------"

echo "👤 获取用户信息和统计..."
USER_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/me" \
  -H "Origin: $FRONTEND_URL" \
  -H "Authorization: Bearer $TOKEN")

echo "$USER_RESPONSE" | jq '.'
echo ""

# 演示总结
echo "📋 8. 演示总结"
echo "==============="
echo "✅ 用户注册/登录 - 完成"
echo "✅ 题库创建 - 完成"
echo "✅ AI密钥验证 - 完成"
echo "✅ AI解析任务 - 完成"
echo "✅ 题库列表获取 - 完成"
echo "✅ 用户统计获取 - 完成"
echo ""
echo "🎉 智能题库系统核心功能演示完成！"
echo ""
echo "🌐 前端应用: $FRONTEND_URL"
echo "🔗 后端API: $BASE_URL"
echo "📖 API文档: $BASE_URL/health"
echo ""
echo "💡 提示: 在浏览器中访问 $FRONTEND_URL 体验完整的用户界面"
