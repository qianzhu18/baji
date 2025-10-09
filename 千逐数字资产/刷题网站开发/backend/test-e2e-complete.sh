#!/bin/bash

echo "🧪 端到端功能完整测试"
echo "======================"

# 测试配置
BASE_URL="http://localhost:3001"
TEST_EMAIL="e2e-test-$(date +%s)@example.com"
TEST_PASSWORD="E2ETest123!"
TEST_NAME="E2E Test User"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试结果记录函数
test_result() {
  local test_name="$1"
  local result="$2"
  local details="$3"
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  if [ "$result" = "PASS" ]; then
    echo -e "${GREEN}✅ PASS${NC}: $test_name"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}❌ FAIL${NC}: $test_name"
    if [ -n "$details" ]; then
      echo -e "   ${YELLOW}详情: $details${NC}"
    fi
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

# 等待函数
wait_with_progress() {
  local seconds=$1
  local message=$2
  
  echo -n "$message"
  for ((i=1; i<=seconds; i++)); do
    echo -n "."
    sleep 1
  done
  echo " 完成"
}

echo -e "${BLUE}🔧 测试配置:${NC}"
echo "  - API地址: $BASE_URL"
echo "  - 测试用户: $TEST_EMAIL"
echo ""

# ==================== 第一阶段：系统基础测试 ====================
echo -e "${BLUE}📋 第一阶段：系统基础测试${NC}"
echo "================================"

# 1.1 系统健康检查
echo "🔍 1.1 系统健康检查..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" $BASE_URL/health)
HTTP_CODE="${HEALTH_RESPONSE: -3}"
HEALTH_BODY="${HEALTH_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
  HEALTH_STATUS=$(echo "$HEALTH_BODY" | jq -r '.status // "unknown"')
  if [ "$HEALTH_STATUS" = "ok" ]; then
    test_result "系统健康检查" "PASS"
  else
    test_result "系统健康检查" "FAIL" "健康状态: $HEALTH_STATUS"
  fi
else
  test_result "系统健康检查" "FAIL" "HTTP状态码: $HTTP_CODE"
fi

# 1.2 API版本信息
echo "🔍 1.2 API版本信息..."
API_RESPONSE=$(curl -s -w "%{http_code}" $BASE_URL/api)
HTTP_CODE="${API_RESPONSE: -3}"
API_BODY="${API_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
  API_VERSION=$(echo "$API_BODY" | jq -r '.version // "unknown"')
  if [ "$API_VERSION" = "2.0.0" ]; then
    test_result "API版本信息" "PASS"
  else
    test_result "API版本信息" "FAIL" "版本: $API_VERSION"
  fi
else
  test_result "API版本信息" "FAIL" "HTTP状态码: $HTTP_CODE"
fi

# ==================== 第二阶段：用户认证流程测试 ====================
echo ""
echo -e "${BLUE}🔐 第二阶段：用户认证流程测试${NC}"
echo "================================"

# 2.1 用户注册
echo "🔍 2.1 用户注册..."
REGISTER_RESPONSE=$(curl -s -w "%{http_code}" -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"name\": \"$TEST_NAME\"
  }")

HTTP_CODE="${REGISTER_RESPONSE: -3}"
REGISTER_BODY="${REGISTER_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  REGISTER_SUCCESS=$(echo "$REGISTER_BODY" | jq -r '.success // false')
  if [ "$REGISTER_SUCCESS" = "true" ]; then
    TOKEN=$(echo "$REGISTER_BODY" | jq -r '.data.token')
    USER_ID=$(echo "$REGISTER_BODY" | jq -r '.data.user.id')
    test_result "用户注册" "PASS"
  else
    test_result "用户注册" "FAIL" "注册失败: $(echo "$REGISTER_BODY" | jq -r '.message')"
  fi
else
  test_result "用户注册" "FAIL" "HTTP状态码: $HTTP_CODE"
fi

# 2.2 用户登录（如果注册失败）
if [ -z "$TOKEN" ]; then
  echo "🔍 2.2 用户登录（注册失败后尝试登录）..."
  LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -X POST $BASE_URL/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$TEST_EMAIL\",
      \"password\": \"$TEST_PASSWORD\"
    }")

  HTTP_CODE="${LOGIN_RESPONSE: -3}"
  LOGIN_BODY="${LOGIN_RESPONSE%???}"

  if [ "$HTTP_CODE" = "200" ]; then
    LOGIN_SUCCESS=$(echo "$LOGIN_BODY" | jq -r '.success // false')
    if [ "$LOGIN_SUCCESS" = "true" ]; then
      TOKEN=$(echo "$LOGIN_BODY" | jq -r '.data.token')
      USER_ID=$(echo "$LOGIN_BODY" | jq -r '.data.user.id')
      test_result "用户登录" "PASS"
    else
      test_result "用户登录" "FAIL" "登录失败: $(echo "$LOGIN_BODY" | jq -r '.message')"
    fi
  else
    test_result "用户登录" "FAIL" "HTTP状态码: $HTTP_CODE"
  fi
fi

# 检查是否获得了有效的认证token
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ 无法获得有效的认证token，后续测试将跳过${NC}"
  exit 1
fi

# ==================== 第三阶段：文件处理功能测试 ====================
echo ""
echo -e "${BLUE}📤 第三阶段：文件处理功能测试${NC}"
echo "================================"

# 创建测试文件
cat > e2e-test.txt << 'EOF'
# E2E测试题库

## 选择题

1. 什么是端到端测试？
A. 单元测试
B. 集成测试
C. 完整流程测试
D. 性能测试

答案：C

2. API的全称是什么？
A. Application Programming Interface
B. Advanced Programming Interface
C. Automated Programming Interface
D. Application Process Interface

答案：A

## 填空题

1. HTTP状态码200表示 _____。
答案：成功

2. RESTful API的核心原则是 _____。
答案：无状态
EOF

# 3.1 文件上传测试
echo "🔍 3.1 文件上传测试..."
UPLOAD_RESPONSE=$(curl -s -w "%{http_code}" -X POST $BASE_URL/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@e2e-test.txt" \
  -F "title=E2E测试题库" \
  -F "description=端到端测试用题库" \
  -F "orderMode=顺序")

HTTP_CODE="${UPLOAD_RESPONSE: -3}"
UPLOAD_BODY="${UPLOAD_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  UPLOAD_SUCCESS=$(echo "$UPLOAD_BODY" | jq -r '.success // false')
  if [ "$UPLOAD_SUCCESS" = "true" ]; then
    JOB_ID=$(echo "$UPLOAD_BODY" | jq -r '.data.jobId')
    QUIZ_ID=$(echo "$UPLOAD_BODY" | jq -r '.data.quizId')
    test_result "文件上传" "PASS"
  else
    test_result "文件上传" "FAIL" "上传失败: $(echo "$UPLOAD_BODY" | jq -r '.message')"
  fi
else
  test_result "文件上传" "FAIL" "HTTP状态码: $HTTP_CODE"
fi

# 3.2 文字处理测试
echo "🔍 3.2 文字处理测试..."
TEXT_RESPONSE=$(curl -s -w "%{http_code}" -X POST $BASE_URL/api/upload/text \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# 快速测试\n\n## 选择题\n\n1. 测试题目？\nA. 选项A\nB. 选项B\n\n答案：A",
    "title": "文字处理E2E测试",
    "description": "文字处理功能测试",
    "orderMode": "顺序"
  }')

HTTP_CODE="${TEXT_RESPONSE: -3}"
TEXT_BODY="${TEXT_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  TEXT_SUCCESS=$(echo "$TEXT_BODY" | jq -r '.success // false')
  if [ "$TEXT_SUCCESS" = "true" ]; then
    TEXT_JOB_ID=$(echo "$TEXT_BODY" | jq -r '.data.jobId')
    TEXT_QUIZ_ID=$(echo "$TEXT_BODY" | jq -r '.data.quizId')
    test_result "文字处理" "PASS"
  else
    test_result "文字处理" "FAIL" "处理失败: $(echo "$TEXT_BODY" | jq -r '.message')"
  fi
else
  test_result "文字处理" "FAIL" "HTTP状态码: $HTTP_CODE"
fi

# ==================== 第四阶段：任务管理功能测试 ====================
echo ""
echo -e "${BLUE}📋 第四阶段：任务管理功能测试${NC}"
echo "================================"

# 4.1 任务状态查询
if [ -n "$JOB_ID" ]; then
  echo "🔍 4.1 任务状态查询..."
  JOB_STATUS_RESPONSE=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $TOKEN" \
    $BASE_URL/api/job/$JOB_ID)

  HTTP_CODE="${JOB_STATUS_RESPONSE: -3}"
  JOB_STATUS_BODY="${JOB_STATUS_RESPONSE%???}"

  if [ "$HTTP_CODE" = "200" ]; then
    JOB_STATUS_SUCCESS=$(echo "$JOB_STATUS_BODY" | jq -r '.success // false')
    if [ "$JOB_STATUS_SUCCESS" = "true" ]; then
      TASK_STATUS=$(echo "$JOB_STATUS_BODY" | jq -r '.data.status')
      test_result "任务状态查询" "PASS"
    else
      test_result "任务状态查询" "FAIL" "查询失败: $(echo "$JOB_STATUS_BODY" | jq -r '.message')"
    fi
  else
    test_result "任务状态查询" "FAIL" "HTTP状态码: $HTTP_CODE"
  fi
fi

# 4.2 任务列表查询
echo "🔍 4.2 任务列表查询..."
JOB_LIST_RESPONSE=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/job?page=1&limit=10")

HTTP_CODE="${JOB_LIST_RESPONSE: -3}"
JOB_LIST_BODY="${JOB_LIST_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
  JOB_LIST_SUCCESS=$(echo "$JOB_LIST_BODY" | jq -r '.success // false')
  if [ "$JOB_LIST_SUCCESS" = "true" ]; then
    TOTAL_JOBS=$(echo "$JOB_LIST_BODY" | jq -r '.data.pagination.total')
    test_result "任务列表查询" "PASS"
  else
    test_result "任务列表查询" "FAIL" "查询失败: $(echo "$JOB_LIST_BODY" | jq -r '.message')"
  fi
else
  test_result "任务列表查询" "FAIL" "HTTP状态码: $HTTP_CODE"
fi

# ==================== 第五阶段：题库管理功能测试 ====================
echo ""
echo -e "${BLUE}📚 第五阶段：题库管理功能测试${NC}"
echo "================================"

# 5.1 题库详情查询
if [ -n "$QUIZ_ID" ]; then
  echo "🔍 5.1 题库详情查询..."
  QUIZ_DETAIL_RESPONSE=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $TOKEN" \
    $BASE_URL/api/quiz/$QUIZ_ID)

  HTTP_CODE="${QUIZ_DETAIL_RESPONSE: -3}"
  QUIZ_DETAIL_BODY="${QUIZ_DETAIL_RESPONSE%???}"

  if [ "$HTTP_CODE" = "200" ]; then
    QUIZ_DETAIL_SUCCESS=$(echo "$QUIZ_DETAIL_BODY" | jq -r '.success // false')
    if [ "$QUIZ_DETAIL_SUCCESS" = "true" ]; then
      QUIZ_STATUS=$(echo "$QUIZ_DETAIL_BODY" | jq -r '.data.status')
      QUIZ_TITLE=$(echo "$QUIZ_DETAIL_BODY" | jq -r '.data.title')
      test_result "题库详情查询" "PASS"
    else
      test_result "题库详情查询" "FAIL" "查询失败: $(echo "$QUIZ_DETAIL_BODY" | jq -r '.message')"
    fi
  else
    test_result "题库详情查询" "FAIL" "HTTP状态码: $HTTP_CODE"
  fi
fi

# 5.2 题库列表查询
echo "🔍 5.2 题库列表查询..."
QUIZ_LIST_RESPONSE=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/quiz?page=1&limit=10")

HTTP_CODE="${QUIZ_LIST_RESPONSE: -3}"
QUIZ_LIST_BODY="${QUIZ_LIST_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
  QUIZ_LIST_SUCCESS=$(echo "$QUIZ_LIST_BODY" | jq -r '.success // false')
  if [ "$QUIZ_LIST_SUCCESS" = "true" ]; then
    TOTAL_QUIZZES=$(echo "$QUIZ_LIST_BODY" | jq -r '.data.pagination.total')
    test_result "题库列表查询" "PASS"
  else
    test_result "题库列表查询" "FAIL" "查询失败: $(echo "$QUIZ_LIST_BODY" | jq -r '.message')"
  fi
else
  test_result "题库列表查询" "FAIL" "HTTP状态码: $HTTP_CODE"
fi

# ==================== 第六阶段：任务处理流程测试 ====================
echo ""
echo -e "${BLUE}⚙️ 第六阶段：任务处理流程测试${NC}"
echo "================================"

# 6.1 任务处理监控
if [ -n "$JOB_ID" ]; then
  echo "🔍 6.1 任务处理监控（等待30秒）..."
  
  PROCESSING_SUCCESS=false
  for i in {1..6}; do
    wait_with_progress 5 "   监控第${i}次检查"
    
    JOB_MONITOR_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
      $BASE_URL/api/job/$JOB_ID)
    
    JOB_MONITOR_SUCCESS=$(echo "$JOB_MONITOR_RESPONSE" | jq -r '.success // false')
    if [ "$JOB_MONITOR_SUCCESS" = "true" ]; then
      CURRENT_STATUS=$(echo "$JOB_MONITOR_RESPONSE" | jq -r '.data.quiz.status')
      CURRENT_PROGRESS=$(echo "$JOB_MONITOR_RESPONSE" | jq -r '.data.queueStatus.progress // 0')
      
      echo "   状态: $CURRENT_STATUS, 进度: $CURRENT_PROGRESS%"
      
      if [ "$CURRENT_STATUS" = "completed" ]; then
        PROCESSING_SUCCESS=true
        break
      elif [ "$CURRENT_STATUS" = "failed" ]; then
        ERROR_MSG=$(echo "$JOB_MONITOR_RESPONSE" | jq -r '.data.quiz.errorMsg')
        echo "   错误: $ERROR_MSG"
        break
      fi
    fi
  done
  
  if [ "$PROCESSING_SUCCESS" = true ]; then
    test_result "任务处理监控" "PASS"
  else
    test_result "任务处理监控" "FAIL" "任务未在预期时间内完成或失败"
  fi
fi

# ==================== 清理和总结 ====================
echo ""
echo -e "${BLUE}🧹 清理测试文件...${NC}"
rm -f e2e-test.txt

echo ""
echo -e "${BLUE}📊 测试总结${NC}"
echo "=============="
echo -e "总测试数: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "通过: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失败: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
  echo ""
  echo -e "${GREEN}🎉 所有测试通过！系统功能正常${NC}"
  echo ""
  echo -e "${BLUE}✅ 验证完成的功能:${NC}"
  echo "   - 系统健康检查和API信息"
  echo "   - 用户注册和认证流程"
  echo "   - 文件上传和文字处理"
  echo "   - 任务管理和状态查询"
  echo "   - 题库管理和数据查询"
  echo "   - 任务处理流程监控"
  echo ""
  echo -e "${YELLOW}⚠️ 注意事项:${NC}"
  echo "   - AI处理功能需要配置有效的Gemini API密钥"
  echo "   - 建议在生产环境中进行更全面的性能测试"
  echo "   - 定期监控系统性能和错误日志"
  
  exit 0
else
  echo ""
  echo -e "${RED}❌ 发现 $FAILED_TESTS 个测试失败${NC}"
  echo ""
  echo -e "${YELLOW}🔧 建议操作:${NC}"
  echo "   1. 检查失败的测试详情"
  echo "   2. 查看服务器日志"
  echo "   3. 验证系统配置"
  echo "   4. 修复问题后重新测试"
  
  exit 1
fi
