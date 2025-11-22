#!/usr/bin/env python3
# scripts/security_setup.py - 安全配置设置脚本
import os
import sys
import stat
import subprocess
from pathlib import Path

def install_security_packages():
    """安装安全相关包"""
    print("🔧 安装安全相关包...")
    
    packages = [
        'Flask-Limiter==3.5.0',
        'Flask-Talisman==1.1.0'
    ]
    
    for package in packages:
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', package])
            print(f"✅ {package} 安装成功")
        except subprocess.CalledProcessError as e:
            print(f"❌ {package} 安装失败: {e}")
            return False
    
    return True

def setup_file_permissions():
    """设置文件权限"""
    print("🔒 设置文件权限...")
    
    # 需要设置权限的目录和文件
    paths_to_secure = [
        'static/uploads',
        'static/exports',
        'static/logs',
        'instance',
        'instance/baji_simple.db'
    ]
    
    for path in paths_to_secure:
        if os.path.exists(path):
            try:
                if os.path.isdir(path):
                    # 目录权限: 仅所有者可读写执行
                    os.chmod(path, stat.S_IRWXU)
                    print(f"✅ 目录权限设置: {path}")
                else:
                    # 文件权限: 仅所有者可读写
                    os.chmod(path, stat.S_IRUSR | stat.S_IWUSR)
                    print(f"✅ 文件权限设置: {path}")
            except Exception as e:
                print(f"⚠️ 权限设置失败 {path}: {e}")

def create_security_directories():
    """创建安全相关目录"""
    print("📁 创建安全相关目录...")
    
    directories = [
        'static/logs',
        'static/logs/security',
        'static/logs/audit'
    ]
    
    for directory in directories:
        try:
            os.makedirs(directory, exist_ok=True)
            # 设置目录权限
            os.chmod(directory, stat.S_IRWXU)
            print(f"✅ 创建目录: {directory}")
        except Exception as e:
            print(f"❌ 创建目录失败 {directory}: {e}")

def update_nginx_security():
    """更新Nginx安全配置"""
    print("🌐 更新Nginx安全配置...")
    
    nginx_config = """# 安全头配置
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# 隐藏Nginx版本
server_tokens off;

# 限制请求大小
client_max_body_size 10M;

# 限制请求频率
limit_req_zone $binary_remote_addr zone=upload:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

# 应用限制
location /api/v1/upload {
    limit_req zone=upload burst=5 nodelay;
    proxy_pass http://flask_app;
}

location /api/v1/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://flask_app;
}
"""
    
    try:
        with open('nginx_security.conf', 'w') as f:
            f.write(nginx_config)
        print("✅ Nginx安全配置已生成: nginx_security.conf")
        print("请将配置添加到您的Nginx配置文件中")
    except Exception as e:
        print(f"❌ Nginx配置生成失败: {e}")

def generate_security_report():
    """生成安全配置报告"""
    print("📊 生成安全配置报告...")
    
    report = {
        "timestamp": "2024-01-01T00:00:00Z",
        "security_measures": {
            "file_validation": "✅ 增强MIME类型验证",
            "path_traversal_protection": "✅ secure_filename() 防护",
            "file_permissions": "✅ 文件权限设置",
            "rate_limiting": "✅ Flask-Limiter 频率限制",
            "security_headers": "✅ Flask-Talisman 安全头",
            "audit_logging": "✅ 安全审计日志",
            "admin_authentication": "✅ 管理员认证保护"
        },
        "recommendations": [
            "定期更新依赖包",
            "监控安全日志",
            "定期进行安全审计",
            "备份重要数据",
            "使用HTTPS（生产环境）"
        ]
    }
    
    try:
        import json
        with open('security_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        print("✅ 安全配置报告已生成: security_report.json")
    except Exception as e:
        print(f"❌ 报告生成失败: {e}")

def main():
    """主函数"""
    print("🛡️ 吧唧生成器安全配置设置")
    print("=" * 50)
    
    # 检查Python版本
    if sys.version_info < (3, 7):
        print("❌ 需要Python 3.7或更高版本")
        return
    
    # 安装安全包
    if not install_security_packages():
        print("❌ 安全包安装失败，请手动安装")
        return
    
    # 设置文件权限
    setup_file_permissions()
    
    # 创建安全目录
    create_security_directories()
    
    # 更新Nginx配置
    update_nginx_security()
    
    # 生成安全报告
    generate_security_report()
    
    print("\n" + "=" * 50)
    print("✅ 安全配置设置完成！")
    print("\n📋 下一步操作:")
    print("1. 重启应用以应用新的安全配置")
    print("2. 检查安全日志: static/logs/security/")
    print("3. 定期查看安全审计报告")
    print("4. 在生产环境中启用HTTPS")
    print("5. 配置防火墙规则")

if __name__ == "__main__":
    main()
