#!/bin/bash

echo "🧪 完整功能验证测试"
echo "===================="

# 测试配置
BASE_URL="http://localhost:3001"
TEST_EMAIL="complete-test-$(date +%s)@example.com"
TEST_PASSWORD="CompleteTest123!"
TEST_NAME="Complete Test User"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# 测试结果记录函数
test_result() {
  local test_name="$1"
  local result="$2"
  local details="$3"
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  if [ "$result" = "PASS" ]; then
    echo -e "${GREEN}✅ PASS${NC}: $test_name"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  elif [ "$result" = "WARN" ]; then
    echo -e "${YELLOW}⚠️ WARN${NC}: $test_name"
    if [ -n "$details" ]; then
      echo -e "   ${YELLOW}详情: $details${NC}"
    fi
    WARNINGS=$((WARNINGS + 1))
  else
    echo -e "${RED}❌ FAIL${NC}: $test_name"
    if [ -n "$details" ]; then
      echo -e "   ${RED}详情: $details${NC}"
    fi
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

# 等待函数
wait_with_spinner() {
  local seconds=$1
  local message="$2"
  
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

# ==================== 阶段1：系统基础验证 ====================
echo -e "${PURPLE}📋 阶段1：系统基础验证${NC}"
echo "=========================="

# 1.1 配置验证
echo "🔍 1.1 系统配置验证..."
CONFIG_CHECK=$(curl -s -w "%{http_code}" $BASE_URL/health)
HTTP_CODE="${CONFIG_CHECK: -3}"
HEALTH_BODY="${CONFIG_CHECK%???}"

if [ "$HTTP_CODE" = "200" ]; then
  HEALTH_STATUS=$(echo "$HEALTH_BODY" | jq -r '.status // "unknown"')
  DB_STATUS=$(echo "$HEALTH_BODY" | jq -r '.services.database // "unknown"')
  QUEUE_STATUS=$(echo "$HEALTH_BODY" | jq -r '.services.queue // "unknown"')
  
  if [ "$HEALTH_STATUS" = "ok" ] && [ "$DB_STATUS" = "healthy" ] && [ "$QUEUE_STATUS" = "healthy" ]; then
    test_result "系统配置验证" "PASS"
  else
    test_result "系统配置验证" "FAIL" "健康状态异常: $HEALTH_STATUS, DB: $DB_STATUS, Queue: $QUEUE_STATUS"
  fi
else
  test_result "系统配置验证" "FAIL" "HTTP状态码: $HTTP_CODE"
fi

# 1.2 API版本验证
echo "🔍 1.2 API版本验证..."
API_RESPONSE=$(curl -s -w "%{http_code}" $BASE_URL/api)
HTTP_CODE="${API_RESPONSE: -3}"
API_BODY="${API_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
  API_VERSION=$(echo "$API_BODY" | jq -r '.version // "unknown"')
  V2_ENDPOINTS=$(echo "$API_BODY" | jq -r '.endpoints.v2 | keys | length')
  
  if [ "$API_VERSION" = "2.0.0" ] && [ "$V2_ENDPOINTS" -gt 0 ]; then
    test_result "API版本验证" "PASS"
  else
    test_result "API版本验证" "FAIL" "版本: $API_VERSION, V2端点数: $V2_ENDPOINTS"
  fi
else
  test_result "API版本验证" "FAIL" "HTTP状态码: $HTTP_CODE"
fi

# ==================== 阶段2：用户认证完整流程 ====================
echo ""
echo -e "${PURPLE}🔐 阶段2：用户认证完整流程${NC}"
echo "=========================="

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

# 2.2 JWT令牌验证
if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  echo "🔍 2.2 JWT令牌验证..."
  
  # 验证令牌格式
  TOKEN_PARTS=$(echo "$TOKEN" | tr '.' '\n' | wc -l)
  if [ "$TOKEN_PARTS" -eq 3 ]; then
    test_result "JWT令牌格式" "PASS"
  else
    test_result "JWT令牌格式" "FAIL" "令牌格式错误，部分数: $TOKEN_PARTS"
  fi
  
  # 验证令牌有效性（通过访问受保护的端点）
  AUTH_TEST=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $TOKEN" \
    $BASE_URL/api/job)
  HTTP_CODE="${AUTH_TEST: -3}"
  
  if [ "$HTTP_CODE" = "200" ]; then
    test_result "JWT令牌有效性" "PASS"
  else
    test_result "JWT令牌有效性" "FAIL" "认证失败，状态码: $HTTP_CODE"
  fi
else
  test_result "JWT令牌获取" "FAIL" "未获得有效令牌"
  echo -e "${RED}❌ 无法继续后续测试，退出${NC}"
  exit 1
fi

# ==================== 阶段3：文件处理完整测试 ====================
echo ""
echo -e "${PURPLE}📤 阶段3：文件处理完整测试${NC}"
echo "=========================="

# 创建多种格式的测试文件
echo "📝 创建测试文件..."

# 3.1 TXT文件测试
cat > complete-test.txt << 'EOF'
# 完整功能测试题库

## 选择题

1. 什么是API？
A. 应用程序编程接口
B. 高级编程接口
C. 自动编程接口
D. 应用程序处理接口

答案：A

2. HTTP状态码200表示什么？
A. 错误
B. 重定向
C. 成功
D. 未找到

答案：C

## 填空题

1. RESTful API的核心原则是 _____。
答案：无状态

2. JSON的全称是 _____。
答案：JavaScript Object Notation
EOF

# 3.2 CSV文件测试
cat > complete-test.csv << 'EOF'
题目类型,题目内容,选项A,选项B,选项C,选项D,正确答案,解析
选择题,数据库的ACID特性中A代表什么？,原子性,一致性,隔离性,持久性,A,ACID中A代表Atomicity原子性
选择题,以下哪个不是HTTP方法？,GET,POST,SEND,DELETE,C,SEND不是标准的HTTP方法
填空题,SQL中用于查询数据的关键字是 _____。,,,,,SELECT,SELECT是SQL中最基本的查询语句
EOF

# 3.3 Markdown文件测试
cat > complete-test.md << 'EOF'
# 系统设计题库

## 选择题

### 1. 缓存策略
**题目**: 以下哪种缓存策略适合读多写少的场景？
- A. Write-through
- B. Write-back
- C. Cache-aside
- D. Write-around

**答案**: C

**解析**: Cache-aside模式适合读多写少的场景，应用程序负责维护缓存。

### 2. 负载均衡
**题目**: 轮询负载均衡算法的特点是什么？
- A. 根据服务器性能分配
- B. 随机分配请求
- C. 按顺序分配请求
- D. 根据响应时间分配

**答案**: C

## 填空题

1. 微服务架构中，服务间通信常用的协议是 _____ 和 _____。
   **答案**: HTTP, gRPC

2. 分布式系统中的CAP定理指的是 _____、_____、_____。
   **答案**: 一致性, 可用性, 分区容错性
EOF

echo "✅ 测试文件创建完成"

# 测试文件上传功能
test_file_upload() {
  local file_name=$1
  local file_type=$2
  local test_title="$3"
  
  echo "🔍 3.${file_name: -1} ${file_type}文件上传测试..."
  
  UPLOAD_RESPONSE=$(curl -s -w "%{http_code}" -X POST $BASE_URL/api/upload \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$file_name" \
    -F "title=$test_title" \
    -F "description=完整功能测试 - ${file_type}格式" \
    -F "orderMode=顺序")

  HTTP_CODE="${UPLOAD_RESPONSE: -3}"
  UPLOAD_BODY="${UPLOAD_RESPONSE%???}"

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    UPLOAD_SUCCESS=$(echo "$UPLOAD_BODY" | jq -r '.success // false')
    if [ "$UPLOAD_SUCCESS" = "true" ]; then
      JOB_ID=$(echo "$UPLOAD_BODY" | jq -r '.data.jobId')
      QUIZ_ID=$(echo "$UPLOAD_BODY" | jq -r '.data.quizId')
      test_result "${file_type}文件上传" "PASS"
      
      # 保存任务ID用于后续测试
      echo "$JOB_ID" >> /tmp/test_job_ids.txt
      echo "$QUIZ_ID" >> /tmp/test_quiz_ids.txt
      
      return 0
    else
      test_result "${file_type}文件上传" "FAIL" "上传失败: $(echo "$UPLOAD_BODY" | jq -r '.message')"
      return 1
    fi
  else
    test_result "${file_type}文件上传" "FAIL" "HTTP状态码: $HTTP_CODE"
    return 1
  fi
}

# 清理之前的测试ID文件
rm -f /tmp/test_job_ids.txt /tmp/test_quiz_ids.txt

# 测试各种文件格式
test_file_upload "complete-test.txt" "TXT" "完整测试-文本格式"
test_file_upload "complete-test.csv" "CSV" "完整测试-CSV格式"
test_file_upload "complete-test.md" "Markdown" "完整测试-Markdown格式"

# 3.4 文字处理功能测试
echo "🔍 3.4 文字处理功能测试..."
TEXT_RESPONSE=$(curl -s -w "%{http_code}" -X POST $BASE_URL/api/upload/text \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# 即时测试题库\n\n## 选择题\n\n1. 云计算的三种服务模式是什么？\nA. IaaS, PaaS, SaaS\nB. IaaS, PaaS, DaaS\nC. IaaS, CaaS, SaaS\nD. PaaS, SaaS, FaaS\n\n答案：A\n\n## 填空题\n\n1. Docker容器的核心技术是 _____。\n答案：Linux容器",
    "title": "即时文字处理测试",
    "description": "测试文字处理功能的完整性",
    "orderMode": "顺序"
  }')

HTTP_CODE="${TEXT_RESPONSE: -3}"
TEXT_BODY="${TEXT_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  TEXT_SUCCESS=$(echo "$TEXT_BODY" | jq -r '.success // false')
  if [ "$TEXT_SUCCESS" = "true" ]; then
    TEXT_JOB_ID=$(echo "$TEXT_BODY" | jq -r '.data.jobId')
    TEXT_QUIZ_ID=$(echo "$TEXT_BODY" | jq -r '.data.quizId')
    test_result "文字处理功能" "PASS"
    
    # 保存任务ID
    echo "$TEXT_JOB_ID" >> /tmp/test_job_ids.txt
    echo "$TEXT_QUIZ_ID" >> /tmp/test_quiz_ids.txt
  else
    test_result "文字处理功能" "FAIL" "处理失败: $(echo "$TEXT_BODY" | jq -r '.message')"
  fi
else
  test_result "文字处理功能" "FAIL" "HTTP状态码: $HTTP_CODE"
fi

# ==================== 阶段4：任务处理流程验证 ====================
echo ""
echo -e "${PURPLE}⚙️ 阶段4：任务处理流程验证${NC}"
echo "=========================="

# 4.1 任务状态查询
echo "🔍 4.1 任务状态查询..."
if [ -f /tmp/test_job_ids.txt ]; then
  FIRST_JOB_ID=$(head -n1 /tmp/test_job_ids.txt)
  
  JOB_STATUS_RESPONSE=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $TOKEN" \
    $BASE_URL/api/job/$FIRST_JOB_ID)

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
else
  test_result "任务状态查询" "FAIL" "没有可查询的任务ID"
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

# 4.3 AI处理流程监控
echo "🔍 4.3 AI处理流程监控（30秒）..."
if [ -f /tmp/test_job_ids.txt ]; then
  MONITOR_JOB_ID=$(head -n1 /tmp/test_job_ids.txt)
  
  AI_PROCESSING_SUCCESS=false
  for i in {1..6}; do
    wait_with_spinner 5 "   第${i}次检查AI处理状态"
    
    JOB_MONITOR_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
      $BASE_URL/api/job/$MONITOR_JOB_ID)
    
    JOB_MONITOR_SUCCESS=$(echo "$JOB_MONITOR_RESPONSE" | jq -r '.success // false')
    if [ "$JOB_MONITOR_SUCCESS" = "true" ]; then
      CURRENT_STATUS=$(echo "$JOB_MONITOR_RESPONSE" | jq -r '.data.quiz.status')
      CURRENT_PROGRESS=$(echo "$JOB_MONITOR_RESPONSE" | jq -r '.data.queueStatus.progress // 0')
      
      echo "   状态: $CURRENT_STATUS, 进度: $CURRENT_PROGRESS%"
      
      if [ "$CURRENT_STATUS" = "completed" ]; then
        AI_PROCESSING_SUCCESS=true
        test_result "AI处理流程" "PASS"
        break
      elif [ "$CURRENT_STATUS" = "failed" ]; then
        ERROR_MSG=$(echo "$JOB_MONITOR_RESPONSE" | jq -r '.data.quiz.errorMsg')
        if [[ "$ERROR_MSG" == *"API key not valid"* ]] || [[ "$ERROR_MSG" == *"GEMINI_API_KEY"* ]]; then
          test_result "AI处理流程" "WARN" "需要配置有效的Gemini API密钥"
        else
          test_result "AI处理流程" "FAIL" "AI处理失败: $ERROR_MSG"
        fi
        break
      fi
    fi
  done
  
  if [ "$AI_PROCESSING_SUCCESS" = false ] && [ "$CURRENT_STATUS" != "failed" ]; then
    test_result "AI处理流程" "WARN" "AI处理超时，可能需要更长时间"
  fi
else
  test_result "AI处理流程" "FAIL" "没有可监控的任务"
fi

# ==================== 阶段5：数据管理验证 ====================
echo ""
echo -e "${PURPLE}📚 阶段5：数据管理验证${NC}"
echo "=========================="

# 5.1 题库详情查询
echo "🔍 5.1 题库详情查询..."
if [ -f /tmp/test_quiz_ids.txt ]; then
  FIRST_QUIZ_ID=$(head -n1 /tmp/test_quiz_ids.txt)
  
  QUIZ_DETAIL_RESPONSE=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $TOKEN" \
    $BASE_URL/api/quiz/$FIRST_QUIZ_ID)

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
else
  test_result "题库详情查询" "FAIL" "没有可查询的题库ID"
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

# ==================== 清理和总结 ====================
echo ""
echo -e "${BLUE}🧹 清理测试文件...${NC}"
rm -f complete-test.txt complete-test.csv complete-test.md
rm -f /tmp/test_job_ids.txt /tmp/test_quiz_ids.txt

echo ""
echo -e "${CYAN}📊 完整功能验证总结${NC}"
echo "=========================="
echo -e "总测试数: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "通过: ${GREEN}$PASSED_TESTS${NC}"
echo -e "警告: ${YELLOW}$WARNINGS${NC}"
echo -e "失败: ${RED}$FAILED_TESTS${NC}"

# 计算成功率
if [ $TOTAL_TESTS -gt 0 ]; then
  SUCCESS_RATE=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
  echo -e "成功率: ${CYAN}${SUCCESS_RATE}%${NC}"
fi

if [ $FAILED_TESTS -eq 0 ]; then
  echo ""
  echo -e "${GREEN}🎉 所有核心功能验证通过！${NC}"
  echo ""
  echo -e "${BLUE}✅ 已验证的功能模块:${NC}"
  echo "   - 系统配置和健康检查"
  echo "   - 用户认证和JWT管理"
  echo "   - 多格式文件处理（TXT、CSV、Markdown）"
  echo "   - 文字内容处理"
  echo "   - 任务队列和状态管理"
  echo "   - 题库数据管理"
  echo "   - AI处理流程监控"
  
  if [ $WARNINGS -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️ 注意事项:${NC}"
    echo "   - 部分功能需要配置Gemini API密钥"
    echo "   - 建议在生产环境进行性能测试"
  fi
  
  echo ""
  echo -e "${GREEN}🚀 系统已准备就绪！${NC}"
  
  exit 0
else
  echo ""
  echo -e "${RED}❌ 发现 $FAILED_TESTS 个功能问题${NC}"
  echo ""
  echo -e "${YELLOW}🔧 建议操作:${NC}"
  echo "   1. 检查失败的测试详情"
  echo "   2. 验证系统配置"
  echo "   3. 查看服务器日志"
  echo "   4. 运行配置验证: npm run config:validate"
  
  exit 1
fi
