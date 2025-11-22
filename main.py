# main.py - 应用入口文件
from config.app_factory import create_app
from utils.helpers import ensure_directories
import os

# main.py - 应用入口文件
from config.app_factory import create_app
from utils.helpers import ensure_directories
from utils.file_manager import file_manager
from utils.logger import logger
from utils.performance_optimizer import performance_optimizer
from utils.system_monitor import system_monitor
import os

def main():
    """主函数"""
    print("🍎 吧唧生成器启动脚本")
    print("=" * 50)
    
    # 创建应用
    app = create_app()
    
    # 确保目录存在
    with app.app_context():
        ensure_directories()
        
        # 初始化文件管理系统
        print("📁 初始化文件管理系统...")
        file_manager._ensure_directories()
        
        # 清理临时文件 - 已禁用（需要数据库）
        # print("🧹 清理临时文件...")
        # file_manager.cleanup_temp_files()
        
        # 性能优化初始化 - 已禁用（需要数据库）
        # print("⚡ 初始化性能优化...")
        # performance_optimizer.optimize_database_queries()
        
        # 系统监控初始化 - 已禁用（需要数据库）
        # print("📊 初始化系统监控...")
        # system_monitor.log_system_metrics()
        
        # 记录启动日志 - 已禁用（需要数据库）
        # logger.log_system('应用启动', 'INFO', {
        #     'version': '2.0.0',
        #     'features': ['case_display', 'file_management', 'file_logging', 'recommendation', 'monitoring', 'optimization']
        # })
    
    print("✅ 目录结构检查完成")
    print("✅ 文件管理系统初始化完成")
    print("🚀 启动应用...")
    print("📱 用户端: http://localhost:5000")
    print("🎨 作品画廊: http://localhost:5000/gallery")
    print("🔧 管理后台: http://localhost:5000/admin/login")
    print("📚 API文档: http://localhost:5000/api/v1/")
    print("=" * 50)
    
    app.run(debug=True, host='0.0.0.0', port=5000)

if __name__ == '__main__':
    main()
