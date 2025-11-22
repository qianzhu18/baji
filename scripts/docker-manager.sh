#!/bin/bash
# Docker 管理脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# 函数：检查必要的目录
check_directories() {
    print_message "检查必要的目录..."
    
    directories=("static/uploads" "static/exports" "static/logs" "instance")
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            print_warning "目录 $dir 不存在，正在创建..."
            mkdir -p "$dir"
            chmod 755 "$dir"
        else
            print_message "目录 $dir 已存在"
        fi
    done
}

# 函数：设置目录权限
set_permissions() {
    print_message "设置目录权限..."
    
    directories=("static/uploads" "static/exports" "static/logs" "instance")
    
    for dir in "${directories[@]}"; do
        if [ -d "$dir" ]; then
            chmod -R 755 "$dir"
            print_message "已设置 $dir 权限"
        fi
    done
}

# 函数：启动服务
start_services() {
    print_message "启动服务..."
    check_directories
    set_permissions
    
    docker-compose up -d
    
    print_message "服务已启动"
    print_message "Web应用: http://localhost:5000"
    print_message "Nginx: http://localhost:80"
}

# 函数：停止服务
stop_services() {
    print_message "停止服务..."
    docker-compose down
    print_message "服务已停止"
}

# 函数：重启服务
restart_services() {
    print_message "重启服务..."
    docker-compose restart
    print_message "服务已重启"
}

# 函数：查看日志
view_logs() {
    print_message "查看服务日志..."
    docker-compose logs -f
}

# 函数：查看状态
view_status() {
    print_message "查看服务状态..."
    docker-compose ps
}

# 函数：构建镜像
build_image() {
    print_message "构建Docker镜像..."
    docker-compose build --no-cache
    print_message "镜像构建完成"
}

# 函数：清理
cleanup() {
    print_message "清理Docker资源..."
    docker-compose down --volumes --remove-orphans
    docker system prune -f
    print_message "清理完成"
}

# 函数：备份数据
backup_data() {
    print_message "备份数据..."
    
    backup_dir="backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # 备份数据库
    if [ -f "instance/baji_simple.db" ]; then
        cp "instance/baji_simple.db" "$backup_dir/"
        print_message "数据库已备份到 $backup_dir/baji_simple.db"
    fi
    
    # 备份上传文件
    if [ -d "static/uploads" ]; then
        cp -r "static/uploads" "$backup_dir/"
        print_message "上传文件已备份到 $backup_dir/uploads"
    fi
    
    # 备份导出文件
    if [ -d "static/exports" ]; then
        cp -r "static/exports" "$backup_dir/"
        print_message "导出文件已备份到 $backup_dir/exports"
    fi
    
    print_message "备份完成: $backup_dir"
}

# 主函数
main() {
    case "${1:-start}" in
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        logs)
            view_logs
            ;;
        status)
            view_status
            ;;
        build)
            build_image
            ;;
        cleanup)
            cleanup
            ;;
        backup)
            backup_data
            ;;
        *)
            echo "用法: $0 {start|stop|restart|logs|status|build|cleanup|backup}"
            echo ""
            echo "命令说明:"
            echo "  start   - 启动服务"
            echo "  stop    - 停止服务"
            echo "  restart - 重启服务"
            echo "  logs    - 查看日志"
            echo "  status  - 查看状态"
            echo "  build   - 构建镜像"
            echo "  cleanup - 清理资源"
            echo "  backup  - 备份数据"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
