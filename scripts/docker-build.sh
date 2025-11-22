#!/bin/bash
# Docker 镜像构建和推送脚本

set -e

# 配置
IMAGE_NAME="odinluo/baji"
VERSION=${1:-latest}
REGISTRY="docker.io"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数：打印带颜色的消息
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 函数：检查Docker是否运行
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker未运行，请先启动Docker"
        exit 1
    fi
    print_message "Docker运行正常"
}

# 函数：检查是否已登录Docker Hub
check_login() {
    if ! docker info | grep -q "Username:"; then
        print_warning "未检测到Docker Hub登录状态"
        print_message "请先登录Docker Hub: docker login"
        read -p "是否现在登录? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker login
        else
            print_error "需要登录Docker Hub才能推送镜像"
            exit 1
        fi
    fi
    print_message "Docker Hub登录状态正常"
}

# 函数：构建镜像
build_image() {
    print_step "构建Docker镜像..."
    
    # 构建镜像
    docker build -t "${IMAGE_NAME}:${VERSION}" .
    
    # 如果是latest版本，也打上latest标签
    if [ "$VERSION" != "latest" ]; then
        docker tag "${IMAGE_NAME}:${VERSION}" "${IMAGE_NAME}:latest"
        print_message "已创建latest标签"
    fi
    
    print_message "镜像构建完成: ${IMAGE_NAME}:${VERSION}"
}

# 函数：推送镜像
push_image() {
    print_step "推送镜像到Docker Hub..."
    
    # 推送指定版本
    docker push "${IMAGE_NAME}:${VERSION}"
    print_message "已推送: ${IMAGE_NAME}:${VERSION}"
    
    # 如果不是latest版本，也推送latest标签
    if [ "$VERSION" != "latest" ]; then
        docker push "${IMAGE_NAME}:latest"
        print_message "已推送: ${IMAGE_NAME}:latest"
    fi
    
    print_message "镜像推送完成"
}

# 函数：清理本地镜像
cleanup_local() {
    print_step "清理本地镜像..."
    
    read -p "是否删除本地构建的镜像? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker rmi "${IMAGE_NAME}:${VERSION}" 2>/dev/null || true
        if [ "$VERSION" != "latest" ]; then
            docker rmi "${IMAGE_NAME}:latest" 2>/dev/null || true
        fi
        print_message "本地镜像已清理"
    fi
}

# 函数：显示镜像信息
show_image_info() {
    print_step "镜像信息:"
    echo "  镜像名称: ${IMAGE_NAME}"
    echo "  版本标签: ${VERSION}"
    echo "  完整名称: ${IMAGE_NAME}:${VERSION}"
    echo "  Docker Hub: https://hub.docker.com/r/${IMAGE_NAME}"
    echo ""
}

# 函数：测试镜像
test_image() {
    print_step "测试镜像..."
    
    # 停止可能运行的容器
    docker-compose down 2>/dev/null || true
    
    # 使用构建的镜像启动服务
    print_message "使用新镜像启动服务进行测试..."
    docker-compose up -d
    
    # 等待服务启动
    sleep 10
    
    # 检查服务状态
    if docker-compose ps | grep -q "Up"; then
        print_message "服务启动成功"
        print_message "测试访问: http://localhost:5000"
        
        read -p "服务运行正常，按Enter继续..."
        
        # 停止测试服务
        docker-compose down
        print_message "测试服务已停止"
    else
        print_error "服务启动失败"
        docker-compose logs
        exit 1
    fi
}

# 主函数
main() {
    case "${2:-build}" in
        build)
            show_image_info
            check_docker
            build_image
            ;;
        push)
            show_image_info
            check_docker
            check_login
            build_image
            push_image
            ;;
        test)
            show_image_info
            check_docker
            build_image
            test_image
            ;;
        full)
            show_image_info
            check_docker
            check_login
            build_image
            test_image
            push_image
            cleanup_local
            ;;
        cleanup)
            cleanup_local
            ;;
        *)
            echo "用法: $0 <version> <command>"
            echo ""
            echo "版本参数:"
            echo "  latest  - 最新版本（默认）"
            echo "  v1.0.0  - 指定版本号"
            echo ""
            echo "命令说明:"
            echo "  build   - 仅构建镜像（默认）"
            echo "  push    - 构建并推送镜像"
            echo "  test    - 构建镜像并测试"
            echo "  full    - 完整流程：构建->测试->推送->清理"
            echo "  cleanup - 清理本地镜像"
            echo ""
            echo "示例:"
            echo "  $0 latest build     # 构建latest版本"
            echo "  $0 v1.0.0 push      # 构建并推送v1.0.0版本"
            echo "  $0 latest full      # 完整流程"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
