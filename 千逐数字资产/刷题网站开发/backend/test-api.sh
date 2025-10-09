#!/bin/bash

echo "🧪 测试V2 API功能..."

# 测试健康检查
echo "❤️ 测试健康检查..."
curl -s http://localhost:3001/health | jq '.'

echo ""
echo "📋 测试API信息..."
curl -s http://localhost:3001/api | jq '.'

echo ""
echo "📝 测试用户注册..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser2@example.com",
    "password": "password123",
    "name": "Test User 2"
  }')

echo $REGISTER_RESPONSE | jq '.'

# 提取token
TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.token')

if [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
  echo ""
  echo "✅ 注册成功，Token: ${TOKEN:0:20}..."
  
  echo ""
  echo "📤 测试文件上传..."
  
  # 创建测试文件
  cat > test-quiz.txt << 'EOF'
# JavaScript基础题库

## 选择题

1. JavaScript是什么类型的语言？
A. 编译型语言
B. 解释型语言
C. 汇编语言
D. 机器语言

答案：B

2. 以下哪个不是JavaScript的数据类型？
A. string
B. number
C. char
D. boolean

答案：C

## 填空题

1. JavaScript中声明变量使用关键字 _____ 或 _____。
答案：var, let

2. 函数的关键字是 _____。
答案：function
EOF

  # 测试文件上传
  UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3001/api/upload \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@test-quiz.txt" \
    -F "title=JavaScript基础题库" \
    -F "description=这是一个JavaScript基础知识测试题库")

  echo $UPLOAD_RESPONSE | jq '.'

  # 提取jobId
  JOB_ID=$(echo $UPLOAD_RESPONSE | jq -r '.data.jobId')

  if [ "$JOB_ID" != "null" ] && [ "$JOB_ID" != "" ]; then
    echo ""
    echo "✅ 文件上传成功，任务ID: $JOB_ID"
    
    echo ""
    echo "📋 测试任务状态查询..."
    curl -s -H "Authorization: Bearer $TOKEN" \
      http://localhost:3001/api/job/$JOB_ID | jq '.'
    
    echo ""
    echo "📋 测试任务列表..."
    curl -s -H "Authorization: Bearer $TOKEN" \
      http://localhost:3001/api/job | jq '.'
  else
    echo "❌ 文件上传失败"
  fi

  # 清理测试文件
  rm -f test-quiz.txt

else
  echo "❌ 注册失败，尝试登录..."
  
  LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "testuser2@example.com",
      "password": "password123"
    }')

  echo $LOGIN_RESPONSE | jq '.'
  
  TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
  
  if [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
    echo "✅ 登录成功，Token: ${TOKEN:0:20}..."
  else
    echo "❌ 登录也失败"
  fi
fi

echo ""
echo "🎉 API测试完成！"
