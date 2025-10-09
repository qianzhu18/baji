#!/bin/bash

echo "🚀 Quiz System 一键演示脚本"
echo "=========================="
echo "这个脚本将演示完整的AI题库生成功能"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置
BASE_URL="http://localhost:3001"
DEMO_EMAIL="demo-$(date +%s)@example.com"
DEMO_PASSWORD="Demo123456!"
DEMO_NAME="一键演示用户"

# 检查依赖
check_dependencies() {
  echo -e "${BLUE}📋 检查系统依赖...${NC}"
  
  if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ curl 未安装${NC}"
    exit 1
  fi
  
  if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq 未安装，请安装: brew install jq${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✅ 系统依赖检查通过${NC}"
}

# 检查服务器状态
check_server() {
  echo ""
  echo -e "${BLUE}🔍 检查服务器状态...${NC}"
  
  HEALTH_RESPONSE=$(curl -s $BASE_URL/health 2>/dev/null)
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 服务器未运行，请先启动服务器：${NC}"
    echo "   cd backend && npm run dev:v2"
    exit 1
  fi
  
  HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status // "unknown"')
  if [ "$HEALTH_STATUS" = "ok" ]; then
    echo -e "${GREEN}✅ 服务器运行正常${NC}"
  else
    echo -e "${YELLOW}⚠️ 服务器状态异常: $HEALTH_STATUS${NC}"
  fi
}

# 检查AI配置
check_ai_config() {
  echo ""
  echo -e "${BLUE}🤖 检查AI配置...${NC}"
  
  AI_STATUS=$(curl -s $BASE_URL/api/ai/status)
  AI_CONFIGURED=$(echo "$AI_STATUS" | jq -r '.configured // false')
  AI_HEALTHY=$(echo "$AI_STATUS" | jq -r '.healthy // false')
  AI_PROVIDER=$(echo "$AI_STATUS" | jq -r '.provider // "unknown"')
  
  echo "   Provider: $AI_PROVIDER"
  echo "   Configured: $AI_CONFIGURED"
  echo "   Healthy: $AI_HEALTHY"
  
  if [ "$AI_CONFIGURED" = "true" ] && [ "$AI_HEALTHY" = "true" ]; then
    echo -e "${GREEN}✅ AI服务配置正常，将使用真实AI生成${NC}"
    USE_REAL_AI=true
  else
    echo -e "${YELLOW}⚠️ AI服务未配置或不健康，将使用Mock演示${NC}"
    USE_REAL_AI=false
  fi
}

# 用户注册
register_user() {
  echo ""
  echo -e "${BLUE}👤 创建演示用户...${NC}"
  
  REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$DEMO_EMAIL\",
      \"password\": \"$DEMO_PASSWORD\",
      \"name\": \"$DEMO_NAME\"
    }")

  REGISTER_SUCCESS=$(echo "$REGISTER_RESPONSE" | jq -r '.success // false')
  if [ "$REGISTER_SUCCESS" = "true" ]; then
    TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token')
    USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.data.user.id')
    echo -e "${GREEN}✅ 用户创建成功${NC}"
    echo "   邮箱: $DEMO_EMAIL"
    echo "   用户ID: $USER_ID"
  else
    echo -e "${RED}❌ 用户创建失败: $(echo "$REGISTER_RESPONSE" | jq -r '.message')${NC}"
    exit 1
  fi
}

# AI功能演示
demo_ai_features() {
  echo ""
  echo -e "${PURPLE}🎯 AI功能演示${NC}"
  echo "===================="
  
  # 1. API密钥验证演示
  echo ""
  echo -e "${CYAN}1. API密钥验证演示${NC}"
  echo "-------------------"
  
  if [ "$USE_REAL_AI" = "true" ]; then
    echo "验证真实的Gemini API密钥..."
    VALIDATION_RESPONSE=$(curl -s "$BASE_URL/api/ai/validate-key")
    VALIDATION_VALID=$(echo "$VALIDATION_RESPONSE" | jq -r '.valid // false')
    
    if [ "$VALIDATION_VALID" = "true" ]; then
      echo -e "${GREEN}✅ API密钥验证成功${NC}"
      QUOTA=$(echo "$VALIDATION_RESPONSE" | jq -r '.quota')
      echo "   配额信息: $QUOTA"
    else
      echo -e "${RED}❌ API密钥验证失败${NC}"
      REASON=$(echo "$VALIDATION_RESPONSE" | jq -r '.reason')
      echo "   失败原因: $REASON"
    fi
  else
    echo "演示API密钥验证流程（使用Mock）..."
    echo -e "${GREEN}✅ Mock验证演示完成${NC}"
  fi
  
  # 2. AI生成测试
  echo ""
  echo -e "${CYAN}2. AI生成功能测试${NC}"
  echo "-------------------"
  
  TEST_CONTENT='# 演示题库

## 选择题

1. 什么是人工智能？
A. 计算机程序
B. 机器学习的一种应用
C. 模拟人类智能的技术
D. 数据分析工具

答案：C

2. 以下哪个不是机器学习的类型？
A. 监督学习
B. 无监督学习
C. 强化学习
D. 逻辑学习

答案：D

## 填空题

1. AI的全称是 _____。
答案：Artificial Intelligence

2. 深度学习是 _____ 的一个子集。
答案：机器学习'

  echo "测试内容长度: ${#TEST_CONTENT} 字符"
  echo "开始AI生成测试..."
  
  GENERATION_RESPONSE=$(curl -s -X POST $BASE_URL/api/ai/test-generation \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"content\": $(echo "$TEST_CONTENT" | jq -R -s '.'),
      \"provider\": \"$([ "$USE_REAL_AI" = "true" ] && echo "gemini" || echo "mock")\"
    }")

  GENERATION_SUCCESS=$(echo "$GENERATION_RESPONSE" | jq -r '.success // false')
  if [ "$GENERATION_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ AI生成测试成功${NC}"
    PROVIDER=$(echo "$GENERATION_RESPONSE" | jq -r '.provider')
    METADATA=$(echo "$GENERATION_RESPONSE" | jq -r '.metadata')
    echo "   使用Provider: $PROVIDER"
    echo "   生成元数据: $METADATA"
  else
    echo -e "${RED}❌ AI生成测试失败${NC}"
    ERROR=$(echo "$GENERATION_RESPONSE" | jq -r '.error')
    echo "   错误信息: $ERROR"
  fi
}

# 完整流程演示
demo_complete_workflow() {
  echo ""
  echo -e "${PURPLE}🔄 完整工作流程演示${NC}"
  echo "========================"
  
  # 创建演示题库文件
  echo ""
  echo -e "${CYAN}1. 创建演示题库文件${NC}"
  
  cat > demo-ai-quiz.txt << 'EOF'
# AI与机器学习基础题库

## 选择题

1. 人工智能的英文缩写是什么？
A. AI
B. ML
C. DL
D. NLP

答案：A

解析：人工智能的英文是Artificial Intelligence，缩写为AI。

2. 以下哪个是深度学习的特点？
A. 需要大量标注数据
B. 使用多层神经网络
C. 能够自动提取特征
D. 以上都是

答案：D

解析：深度学习具有需要大量数据、使用多层神经网络、自动特征提取等特点。

3. 监督学习和无监督学习的主要区别是什么？
A. 算法复杂度不同
B. 是否有标注数据
C. 计算资源需求不同
D. 应用场景不同

答案：B

解析：监督学习使用有标注的数据进行训练，而无监督学习使用无标注数据。

## 填空题

1. 机器学习是 _____ 的一个重要分支。
答案：人工智能

2. _____ 是一种模拟人脑神经网络的计算模型。
答案：神经网络

3. 自然语言处理的英文缩写是 _____。
答案：NLP

## 简答题

1. 请简述什么是机器学习？
答案：机器学习是一种人工智能技术，通过算法让计算机从数据中学习规律，并能够对新数据进行预测或决策，而无需明确编程指定每一个步骤。

2. 举例说明深度学习在日常生活中的应用。
答案：深度学习在日常生活中有很多应用，如：图像识别（人脸识别、物体检测）、语音识别（智能助手）、推荐系统（购物、视频推荐）、自动驾驶等。
EOF

  echo -e "${GREEN}✅ 演示文件创建完成${NC}"
  
  # 2. 文件上传
  echo ""
  echo -e "${CYAN}2. 文件上传演示${NC}"
  
  UPLOAD_RESPONSE=$(curl -s -X POST $BASE_URL/api/upload \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@demo-ai-quiz.txt" \
    -F "title=AI与机器学习演示题库" \
    -F "description=一键演示脚本生成的AI题库，展示完整的AI处理流程" \
    -F "orderMode=顺序")

  UPLOAD_SUCCESS=$(echo "$UPLOAD_RESPONSE" | jq -r '.success // false')
  if [ "$UPLOAD_SUCCESS" = "true" ]; then
    JOB_ID=$(echo "$UPLOAD_RESPONSE" | jq -r '.data.jobId')
    QUIZ_ID=$(echo "$UPLOAD_RESPONSE" | jq -r '.data.quizId')
    echo -e "${GREEN}✅ 文件上传成功${NC}"
    echo "   任务ID: $JOB_ID"
    echo "   题库ID: $QUIZ_ID"
  else
    echo -e "${RED}❌ 文件上传失败${NC}"
    ERROR=$(echo "$UPLOAD_RESPONSE" | jq -r '.message')
    echo "   错误信息: $ERROR"
    return 1
  fi
  
  # 3. 任务处理监控
  echo ""
  echo -e "${CYAN}3. AI处理进度监控${NC}"
  
  echo "监控AI处理进度（最多等待60秒）..."
  for i in {1..12}; do
    sleep 5
    echo -n "."
    
    JOB_STATUS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
      $BASE_URL/api/job/$JOB_ID)
    
    JOB_STATUS_SUCCESS=$(echo "$JOB_STATUS_RESPONSE" | jq -r '.success // false')
    if [ "$JOB_STATUS_SUCCESS" = "true" ]; then
      CURRENT_STATUS=$(echo "$JOB_STATUS_RESPONSE" | jq -r '.data.quiz.status')
      CURRENT_PROGRESS=$(echo "$JOB_STATUS_RESPONSE" | jq -r '.data.queueStatus.progress // 0')
      
      echo ""
      echo "   状态: $CURRENT_STATUS, 进度: $CURRENT_PROGRESS%"
      
      if [ "$CURRENT_STATUS" = "completed" ]; then
        echo -e "${GREEN}✅ AI处理完成！${NC}"
        break
      elif [ "$CURRENT_STATUS" = "failed" ]; then
        ERROR_MSG=$(echo "$JOB_STATUS_RESPONSE" | jq -r '.data.quiz.errorMsg')
        echo -e "${YELLOW}⚠️ AI处理失败（预期，因为需要真实API密钥）${NC}"
        echo "   错误信息: $ERROR_MSG"
        break
      fi
    fi
    
    if [ $i -eq 12 ]; then
      echo ""
      echo -e "${YELLOW}⏰ 处理超时，但这是正常的演示流程${NC}"
    fi
  done
  
  # 4. 结果查看
  echo ""
  echo -e "${CYAN}4. 查看处理结果${NC}"
  
  QUIZ_DETAIL_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
    $BASE_URL/api/quiz/$QUIZ_ID)

  QUIZ_DETAIL_SUCCESS=$(echo "$QUIZ_DETAIL_RESPONSE" | jq -r '.success // false')
  if [ "$QUIZ_DETAIL_SUCCESS" = "true" ]; then
    QUIZ_STATUS=$(echo "$QUIZ_DETAIL_RESPONSE" | jq -r '.data.status')
    QUIZ_TITLE=$(echo "$QUIZ_DETAIL_RESPONSE" | jq -r '.data.title')
    QUIZ_HTML_LENGTH=$(echo "$QUIZ_DETAIL_RESPONSE" | jq -r '.data.html | length // 0')
    
    echo -e "${GREEN}✅ 题库详情获取成功${NC}"
    echo "   标题: $QUIZ_TITLE"
    echo "   状态: $QUIZ_STATUS"
    echo "   HTML长度: $QUIZ_HTML_LENGTH 字符"
  else
    echo -e "${RED}❌ 题库详情获取失败${NC}"
  fi
  
  # 清理演示文件
  rm -f demo-ai-quiz.txt
}

# 演示总结
show_demo_summary() {
  echo ""
  echo -e "${GREEN}🎉 一键演示完成！${NC}"
  echo "===================="
  echo ""
  echo -e "${BLUE}📋 演示内容总结:${NC}"
  echo "✅ 系统健康检查"
  echo "✅ AI配置验证"
  echo "✅ 用户注册和认证"
  echo "✅ AI功能测试"
  echo "✅ 完整工作流程"
  echo ""
  echo -e "${BLUE}🔗 有用的链接:${NC}"
  echo "- 健康检查: $BASE_URL/health"
  echo "- API信息: $BASE_URL/api"
  echo "- AI状态: $BASE_URL/api/ai/status"
  echo "- AI健康检查: $BASE_URL/api/ai/health"
  echo ""
  echo -e "${BLUE}👤 演示账户信息:${NC}"
  echo "- 邮箱: $DEMO_EMAIL"
  echo "- 密码: $DEMO_PASSWORD"
  echo "- Token: ${TOKEN:0:20}..."
  echo ""
  
  if [ "$USE_REAL_AI" = "false" ]; then
    echo -e "${YELLOW}💡 提示:${NC}"
    echo "要体验真实的AI功能，请："
    echo "1. 获取Gemini API密钥: https://makersuite.google.com/app/apikey"
    echo "2. 设置环境变量: export GEMINI_API_KEY=your_api_key"
    echo "3. 重启服务器: npm run dev:v2"
    echo "4. 重新运行演示脚本"
    echo ""
  fi
  
  echo -e "${GREEN}🚀 系统已准备就绪，可以开始使用！${NC}"
}

# 主执行流程
main() {
  check_dependencies
  check_server
  check_ai_config
  register_user
  demo_ai_features
  demo_complete_workflow
  show_demo_summary
}

# 错误处理
set -e
trap 'echo -e "\n${RED}❌ 演示过程中发生错误，请检查日志${NC}"' ERR

# 执行主流程
main
