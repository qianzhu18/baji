#!/bin/bash

# 智能题库系统部署脚本
# 使用方法: ./deploy.sh [dev|prod]

set -e  # 遇到错误时退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查部署依赖..."
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装。请先安装 Docker。"
        exit 1
    fi
    
    # 检查 Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装。请先安装 Docker Compose。"
        exit 1
    fi
    
    log_success "依赖检查完成"
}

# 环境设置
setup_environment() {
    local env=${1:-dev}
    log_info "设置 $env 环境..."
    
    # 创建环境变量文件
    if [ ! -f "backend/.env" ]; then
        log_info "创建后端环境变量文件..."
        cat > backend/.env << EOF
# 环境配置
NODE_ENV=$env

# 服务器配置
PORT=3001
HOST=0.0.0.0

# CORS配置
CORS_ORIGIN=http://localhost:3000

# 数据库配置
MONGODB_URI=mongodb://mongo:27017/quiz-system

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production-$(openssl rand -hex 32)
JWT_EXPIRE=7d

# 速率限制
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Google AI API
GOOGLE_AI_API_KEY=your-google-ai-api-key

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Redis配置
REDIS_URL=redis://:redispassword@redis:6379

# 日志级别
LOG_LEVEL=info
EOF
        log_warning "请编辑 backend/.env 文件，填入正确的配置信息"
    fi
    
    # 创建前端环境变量文件
    if [ ! -f "study-app/.env.local" ]; then
        log_info "创建前端环境变量文件..."
        cat > study-app/.env.local << EOF
# API 地址
NEXT_PUBLIC_API_URL=http://localhost:3001

# 应用配置
NEXT_PUBLIC_APP_NAME=智能题库系统
NEXT_PUBLIC_APP_VERSION=1.0.0
EOF
    fi
    
    log_success "环境设置完成"
}

# 构建镜像
build_images() {
    log_info "构建 Docker 镜像..."
    
    # 构建前端镜像
    log_info "构建前端镜像..."
    docker build -t quiz-frontend:latest .
    
    # 构建后端镜像
    log_info "构建后端镜像..."
    docker build -t quiz-backend:latest ./backend
    
    log_success "镜像构建完成"
}

# 启动服务
start_services() {
    local env=${1:-dev}
    log_info "启动服务..."
    
    if [ "$env" = "dev" ]; then
        # 开发环境：启动必要服务
        docker-compose up -d mongo redis
        log_info "等待数据库启动..."
        sleep 10
        
        log_info "开发环境已启动。请手动启动前端和后端："
        log_info "前端: cd study-app && npm run dev"
        log_info "后端: cd backend && npm run dev"
    else
        # 生产环境：启动所有服务
        docker-compose up -d
        log_info "等待服务启动..."
        sleep 30
        
        # 检查服务状态
        check_services
    fi
    
    log_success "服务启动完成"
}

# 检查服务状态
check_services() {
    log_info "检查服务状态..."
    
    # 检查后端健康状态
    for i in {1..30}; do
        if curl -f http://localhost:3001/health > /dev/null 2>&1; then
            log_success "后端服务运行正常"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "后端服务启动失败"
            docker-compose logs backend
            exit 1
        fi
        sleep 2
    done
    
    # 检查前端服务
    for i in {1..30}; do
        if curl -f http://localhost:3000 > /dev/null 2>&1; then
            log_success "前端服务运行正常"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "前端服务启动失败"
            docker-compose logs frontend
            exit 1
        fi
        sleep 2
    done
    
    # 显示服务信息
    echo ""
    log_success "🎉 部署成功！"
    echo ""
    echo "服务地址:"
    echo "  前端: http://localhost:3000"
    echo "  后端: http://localhost:3001"
    echo "  数据库: mongodb://localhost:27017"
    echo "  Redis: redis://localhost:6379"
    echo ""
    echo "管理命令:"
    echo "  查看日志: docker-compose logs -f [service_name]"
    echo "  停止服务: docker-compose down"
    echo "  重启服务: docker-compose restart [service_name]"
    echo ""
}

# 停止服务
stop_services() {
    log_info "停止服务..."
    docker-compose down
    log_success "服务已停止"
}

# 清理资源
cleanup() {
    log_info "清理 Docker 资源..."
    
    # 停止并删除容器
    docker-compose down -v
    
    # 删除镜像（可选）
    read -p "是否删除构建的镜像？(y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker rmi quiz-frontend:latest quiz-backend:latest 2>/dev/null || true
        log_success "镜像已删除"
    fi
    
    # 清理未使用的资源
    docker system prune -f
    
    log_success "清理完成"
}

# 显示帮助信息
show_help() {
    echo "智能题库系统部署脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [command] [environment]"
    echo ""
    echo "命令:"
    echo "  start [dev|prod]  启动服务 (默认: dev)"
    echo "  stop              停止服务"
    echo "  restart [env]     重启服务"
    echo "  build             构建镜像"
    echo "  status            查看服务状态"
    echo "  logs [service]    查看日志"
    echo "  cleanup           清理资源"
    echo "  help              显示帮助"
    echo ""
    echo "环境:"
    echo "  dev               开发环境 (仅启动数据库)"
    echo "  prod              生产环境 (启动所有服务)"
    echo ""
    echo "示例:"
    echo "  $0 start dev      启动开发环境"
    echo "  $0 start prod     启动生产环境"
    echo "  $0 logs backend   查看后端日志"
    echo ""
}

# 主函数
main() {
    local command=${1:-help}
    local env=${2:-dev}
    
    case $command in
        "start")
            check_dependencies
            setup_environment $env
            if [ "$env" = "prod" ]; then
                build_images
            fi
            start_services $env
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            stop_services
            start_services $env
            ;;
        "build")
            check_dependencies
            build_images
            ;;
        "status")
            docker-compose ps
            ;;
        "logs")
            if [ -n "$2" ]; then
                docker-compose logs -f $2
            else
                docker-compose logs -f
            fi
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            log_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@" 