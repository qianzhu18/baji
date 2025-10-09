#!/bin/bash

echo "🧪 测试文件上传和解析功能..."

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

echo "✅ 认证成功，Token: ${TOKEN:0:20}..."

# 创建测试文件
echo "📝 创建测试文件..."

# 1. 创建TXT文件
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

# 2. 创建CSV文件
cat > test-quiz.csv << 'EOF'
题目类型,题目内容,选项A,选项B,选项C,选项D,正确答案,解析
选择题,HTML是什么的缩写？,超文本标记语言,高级文本语言,超链接语言,超媒体语言,A,HTML是HyperText Markup Language的缩写
选择题,CSS的作用是什么？,控制网页结构,控制网页样式,控制网页行为,控制网页数据,B,CSS用于控制网页的样式和布局
填空题,JavaScript中声明变量使用关键字 _____ 或 _____。,,,,,var let,JavaScript有多种声明变量的方式
EOF

# 3. 创建Markdown文件
cat > test-quiz.md << 'EOF'
# 前端开发基础题库

## 选择题

### 1. HTML基础
**题目**: HTML文档的根元素是什么？
- A. `<head>`
- B. `<body>`
- C. `<html>`
- D. `<div>`

**答案**: C

**解析**: `<html>`元素是HTML文档的根元素，包含整个HTML文档的内容。

### 2. CSS基础
**题目**: 以下哪个CSS属性用于设置文字颜色？
- A. `background-color`
- B. `color`
- C. `font-color`
- D. `text-color`

**答案**: B

## 填空题

1. CSS选择器中，类选择器使用 _____ 符号。
   **答案**: .

2. JavaScript中，用于输出内容到控制台的方法是 _____。
   **答案**: console.log
EOF

echo "✅ 测试文件创建完成"

# 测试文件上传功能
test_file_upload() {
  local file_name=$1
  local file_type=$2
  
  echo ""
  echo "📤 测试${file_type}文件上传: $file_name"
  
  UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3001/api/upload \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$file_name" \
    -F "title=${file_type}测试题库" \
    -F "description=这是一个${file_type}格式的测试题库" \
    -F "orderMode=顺序")

  echo "响应: $(echo $UPLOAD_RESPONSE | jq '.')"

  # 检查是否成功
  SUCCESS=$(echo $UPLOAD_RESPONSE | jq -r '.success')
  if [ "$SUCCESS" = "true" ]; then
    JOB_ID=$(echo $UPLOAD_RESPONSE | jq -r '.data.jobId')
    echo "✅ ${file_type}文件上传成功，任务ID: $JOB_ID"
    
    # 等待一下再查询任务状态
    sleep 2
    
    echo "📋 查询任务状态..."
    JOB_STATUS=$(curl -s -H "Authorization: Bearer $TOKEN" \
      http://localhost:3001/api/job/$JOB_ID)
    echo "任务状态: $(echo $JOB_STATUS | jq '.')"
    
    return 0
  else
    echo "❌ ${file_type}文件上传失败"
    return 1
  fi
}

# 测试各种文件格式
test_file_upload "test-quiz.txt" "TXT"
test_file_upload "test-quiz.csv" "CSV" 
test_file_upload "test-quiz.md" "Markdown"

# 测试文字处理功能
echo ""
echo "📝 测试文字处理功能..."
TEXT_RESPONSE=$(curl -s -X POST http://localhost:3001/api/upload/text \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# 数学基础题库\n\n## 选择题\n\n1. 2+2等于多少？\nA. 3\nB. 4\nC. 5\nD. 6\n\n答案：B\n\n## 填空题\n\n1. 圆周率π约等于 _____。\n答案：3.14159",
    "title": "数学基础题库",
    "description": "通过文字输入创建的数学题库",
    "orderMode": "顺序"
  }')

echo "文字处理响应: $(echo $TEXT_RESPONSE | jq '.')"

# 查询任务列表
echo ""
echo "📋 查询任务列表..."
JOB_LIST=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/job?page=1&limit=10")
echo "任务列表: $(echo $JOB_LIST | jq '.')"

# 清理测试文件
echo ""
echo "🧹 清理测试文件..."
rm -f test-quiz.txt test-quiz.csv test-quiz.md

echo ""
echo "🎉 文件上传和解析功能测试完成！"
