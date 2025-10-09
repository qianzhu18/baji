#!/bin/bash

echo "🚀 Quiz System 部署脚本"
echo "====================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# 配置变量
ENVIRONMENT=${1:-development}
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

echo -e "${BLUE}🔧 部署配置:${NC}"
echo "  - 环境: $ENVIRONMENT"
echo "  - Compose文件: $COMPOSE_FILE"
echo "  - 环境变量文件: $ENV_FILE"
echo ""

# 检查Docker和Docker Compose
check_dependencies() {
  echo -e "${PURPLE}📋 1. 检查依赖...${NC}"
  
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装${NC}"
    exit 1
  fi
  
  if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose 未安装${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✅ Docker 和 Docker Compose 已安装${NC}"
}

# 检查环境变量
check_environment() {
  echo ""
  echo -e "${PURPLE}🔍 2. 检查环境变量...${NC}"
  
  if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️ 未找到 $ENV_FILE 文件，创建默认配置...${NC}"
    
    cat > "$ENV_FILE" << EOF
# Quiz System 环境变量配置
NODE_ENV=$ENVIRONMENT
PORT=3001

# 数据库配置
DATABASE_URL=postgresql://quiz_user:quiz_password@postgres:5432/quiz_system

# Redis配置
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=

# JWT配置
JWT_SECRET=$(openssl rand -hex 64)
JWT_EXPIRES_IN=7d

# AI服务配置
GEMINI_API_KEY=your_gemini_api_key_here
AI_PROVIDER=gemini
AI_MODEL=gemini-pro

# 文件上传配置
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/app/uploads

# 监控配置
GRAFANA_PASSWORD=admin123

# 日志配置
LOG_LEVEL=info
EOF
    
    echo -e "${GREEN}✅ 已创建默认 $ENV_FILE 文件${NC}"
    echo -e "${YELLOW}⚠️ 请编辑 $ENV_FILE 文件，设置正确的配置值${NC}"
  fi
  
  # 检查关键环境变量
  source "$ENV_FILE"
  
  if [ -z "$GEMINI_API_KEY" ] || [ "$GEMINI_API_KEY" = "your_gemini_api_key_here" ]; then
    echo -e "${YELLOW}⚠️ 警告: GEMINI_API_KEY 未设置，AI功能将不可用${NC}"
  fi
  
  if [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-in-production" ]; then
    echo -e "${YELLOW}⚠️ 警告: 使用默认JWT密钥，建议更改${NC}"
  fi
  
  echo -e "${GREEN}✅ 环境变量检查完成${NC}"
}

# 构建镜像
build_images() {
  echo ""
  echo -e "${PURPLE}🔨 3. 构建Docker镜像...${NC}"
  
  echo "构建应用镜像..."
  docker-compose build quiz-backend
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 镜像构建成功${NC}"
  else
    echo -e "${RED}❌ 镜像构建失败${NC}"
    exit 1
  fi
}

# 启动服务
start_services() {
  echo ""
  echo -e "${PURPLE}🚀 4. 启动服务...${NC}"
  
  # 根据环境选择不同的配置
  case $ENVIRONMENT in
    "production")
      echo "启动生产环境服务（包含Nginx和监控）..."
      docker-compose --profile production --profile monitoring up -d
      ;;
    "staging")
      echo "启动预发布环境服务..."
      docker-compose up -d
      ;;
    *)
      echo "启动开发环境服务..."
      docker-compose up -d postgres redis quiz-backend
      ;;
  esac
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 服务启动成功${NC}"
  else
    echo -e "${RED}❌ 服务启动失败${NC}"
    exit 1
  fi
}

# 等待服务就绪
wait_for_services() {
  echo ""
  echo -e "${PURPLE}⏳ 5. 等待服务就绪...${NC}"
  
  echo "等待数据库启动..."
  timeout 60 bash -c 'until docker-compose exec postgres pg_isready -U quiz_user -d quiz_system; do sleep 2; done'
  
  echo "等待Redis启动..."
  timeout 30 bash -c 'until docker-compose exec redis redis-cli ping; do sleep 2; done'
  
  echo "等待应用启动..."
  timeout 120 bash -c 'until curl -f http://localhost:3001/health; do sleep 5; done'
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 所有服务已就绪${NC}"
  else
    echo -e "${RED}❌ 服务启动超时${NC}"
    echo "查看日志："
    docker-compose logs quiz-backend
    exit 1
  fi
}

# 运行数据库迁移
run_migrations() {
  echo ""
  echo -e "${PURPLE}📊 6. 运行数据库迁移...${NC}"
  
  echo "推送Prisma架构到数据库..."
  docker-compose exec quiz-backend npx prisma db push
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 数据库迁移完成${NC}"
  else
    echo -e "${RED}❌ 数据库迁移失败${NC}"
    exit 1
  fi
}

# 验证部署
verify_deployment() {
  echo ""
  echo -e "${PURPLE}🔍 7. 验证部署...${NC}"
  
  # 健康检查
  echo "检查应用健康状态..."
  HEALTH_RESPONSE=$(curl -s http://localhost:3001/health)
  HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status // "unknown"')
  
  if [ "$HEALTH_STATUS" = "ok" ]; then
    echo -e "${GREEN}✅ 应用健康检查通过${NC}"
  else
    echo -e "${RED}❌ 应用健康检查失败${NC}"
    echo "响应: $HEALTH_RESPONSE"
    exit 1
  fi
  
  # API信息检查
  echo "检查API信息..."
  API_RESPONSE=$(curl -s http://localhost:3001/api)
  API_VERSION=$(echo "$API_RESPONSE" | jq -r '.version // "unknown"')
  
  if [ "$API_VERSION" = "2.0.0" ]; then
    echo -e "${GREEN}✅ API版本验证通过${NC}"
  else
    echo -e "${RED}❌ API版本验证失败${NC}"
    echo "响应: $API_RESPONSE"
    exit 1
  fi
  
  echo -e "${GREEN}✅ 部署验证完成${NC}"
}

# 显示部署信息
show_deployment_info() {
  echo ""
  echo -e "${GREEN}🎉 部署完成！${NC}"
  echo ""
  echo -e "${BLUE}📋 服务信息:${NC}"
  echo "  - 应用地址: http://localhost:3001"
  echo "  - 健康检查: http://localhost:3001/health"
  echo "  - API信息: http://localhost:3001/api"
  echo "  - 数据库: localhost:5432"
  echo "  - Redis: localhost:6379"
  
  if [ "$ENVIRONMENT" = "production" ]; then
    echo "  - Nginx: http://localhost"
    echo "  - Grafana: http://localhost:3000"
    echo "  - Prometheus: http://localhost:9090"
  fi
  
  echo ""
  echo -e "${BLUE}🔧 管理命令:${NC}"
  echo "  - 查看日志: docker-compose logs -f quiz-backend"
  echo "  - 停止服务: docker-compose down"
  echo "  - 重启服务: docker-compose restart quiz-backend"
  echo "  - 进入容器: docker-compose exec quiz-backend sh"
  echo ""
  echo -e "${BLUE}📊 监控命令:${NC}"
  echo "  - 查看容器状态: docker-compose ps"
  echo "  - 查看资源使用: docker stats"
  echo "  - 查看网络: docker network ls"
  echo ""
  
  if [ "$ENVIRONMENT" = "development" ]; then
    echo -e "${YELLOW}💡 开发提示:${NC}"
    echo "  - 代码更改后需要重新构建: docker-compose build quiz-backend"
    echo "  - 数据库重置: docker-compose exec quiz-backend npx prisma db push --force-reset"
    echo "  - 清理数据: docker-compose down -v"
  fi
}

# 错误处理
handle_error() {
  echo ""
  echo -e "${RED}❌ 部署失败！${NC}"
  echo ""
  echo -e "${YELLOW}🔧 故障排除:${NC}"
  echo "  1. 查看容器日志: docker-compose logs"
  echo "  2. 检查容器状态: docker-compose ps"
  echo "  3. 检查环境变量: cat $ENV_FILE"
  echo "  4. 重新构建: docker-compose build --no-cache"
  echo "  5. 清理重启: docker-compose down && docker-compose up -d"
  echo ""
  echo -e "${YELLOW}📞 获取帮助:${NC}"
  echo "  - 查看文档: README.md"
  echo "  - 检查配置: CONFIG.md"
  echo "  - 运行诊断: npm run config:validate"
}

# 主执行流程
main() {
  # 设置错误处理
  trap handle_error ERR
  
  # 执行部署步骤
  check_dependencies
  check_environment
  build_images
  start_services
  wait_for_services
  run_migrations
  verify_deployment
  show_deployment_info
}

# 显示使用说明
show_usage() {
  echo "使用方法: $0 [environment]"
  echo ""
  echo "环境选项:"
  echo "  development  - 开发环境（默认）"
  echo "  staging      - 预发布环境"
  echo "  production   - 生产环境"
  echo ""
  echo "示例:"
  echo "  $0                    # 部署开发环境"
  echo "  $0 development        # 部署开发环境"
  echo "  $0 production         # 部署生产环境"
}

# 检查参数
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
  show_usage
  exit 0
fi

# 执行主流程
main
