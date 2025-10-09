#!/bin/bash

echo "🧪 测试Worker进程修复..."

# 获取认证token
echo "🔐 获取认证token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser2@example.com",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')

if [ "$TOKEN" = "null" ] || [ "$TOKEN" = "" ]; then
  echo "❌ 无法获取认证token"
  exit 1
fi

echo "✅ 认证成功"

# 创建简单的测试文件
cat > test-simple.txt << 'EOF'
# 简单测试题库

## 选择题

1. 1+1等于多少？
A. 1
B. 2
C. 3
D. 4

答案：B

## 填空题

1. 地球有 _____ 个月亮。
答案：1
EOF

echo "📝 创建测试文件完成"

# 测试文件上传
echo "📤 测试文件上传..."
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3001/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-simple.txt" \
  -F "title=Worker测试题库" \
  -F "description=测试Worker进程修复" \
  -F "orderMode=顺序")

echo "上传响应: $(echo $UPLOAD_RESPONSE | jq '.')"

SUCCESS=$(echo $UPLOAD_RESPONSE | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  JOB_ID=$(echo $UPLOAD_RESPONSE | jq -r '.data.jobId')
  QUIZ_ID=$(echo $UPLOAD_RESPONSE | jq -r '.data.quizId')
  echo "✅ 文件上传成功，任务ID: $JOB_ID，题库ID: $QUIZ_ID"
  
  # 等待任务处理
  echo "⏳ 等待任务处理..."
  for i in {1..10}; do
    sleep 3
    echo "📋 第${i}次查询任务状态..."
    
    JOB_STATUS=$(curl -s -H "Authorization: Bearer $TOKEN" \
      http://localhost:3001/api/job/$JOB_ID)
    
    STATUS=$(echo $JOB_STATUS | jq -r '.data.quiz.status')
    PROGRESS=$(echo $JOB_STATUS | jq -r '.data.queueStatus.progress // 0')
    
    echo "任务状态: $STATUS, 进度: $PROGRESS%"
    
    if [ "$STATUS" = "completed" ]; then
      echo "🎉 任务处理成功！"
      echo "完整状态: $(echo $JOB_STATUS | jq '.')"
      
      # 查询题库详情
      echo "📋 查询题库详情..."
      QUIZ_DETAIL=$(curl -s -H "Authorization: Bearer $TOKEN" \
        http://localhost:3001/api/quiz/$QUIZ_ID)
      echo "题库详情: $(echo $QUIZ_DETAIL | jq '.')"
      
      break
    elif [ "$STATUS" = "failed" ]; then
      echo "❌ 任务处理失败"
      ERROR_MSG=$(echo $JOB_STATUS | jq -r '.data.quiz.errorMsg')
      echo "错误信息: $ERROR_MSG"
      echo "完整状态: $(echo $JOB_STATUS | jq '.')"
      break
    fi
    
    if [ $i -eq 10 ]; then
      echo "⏰ 任务处理超时"
      echo "最终状态: $(echo $JOB_STATUS | jq '.')"
    fi
  done
  
else
  echo "❌ 文件上传失败"
fi

# 清理测试文件
rm -f test-simple.txt

echo ""
echo "🎉 Worker进程测试完成！"
