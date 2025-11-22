# app_factory.py - 应用工厂模式
from flask import Flask
from config.settings import config
import os

# 导入数据库实例
from utils.models import db

def create_app(config_name=None):
    """应用工厂函数"""
    # 获取项目根目录
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    template_folder = os.path.join(project_root, 'templates')
    static_folder = os.path.join(project_root, 'static')
    
    app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)
    
    # 加载配置
    config_name = config_name or os.environ.get('FLASK_ENV', 'default')
    app.config.from_object(config[config_name])
    
    # 修复上传文件夹路径为绝对路径
    if not os.path.isabs(app.config['UPLOAD_FOLDER']):
        app.config['UPLOAD_FOLDER'] = os.path.join(project_root, app.config['UPLOAD_FOLDER'])
    
    # 修复导出文件夹路径为绝对路径
    if not os.path.isabs(app.config['EXPORT_FOLDER']):
        app.config['EXPORT_FOLDER'] = os.path.join(project_root, app.config['EXPORT_FOLDER'])
    
    # 确保上传和导出文件夹存在
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['EXPORT_FOLDER'], exist_ok=True)
    
    # 配置Jinja2分隔符以避免与Vue.js冲突
    app.jinja_env.variable_start_string = '[['
    app.jinja_env.variable_end_string = ']]'
    app.jinja_env.block_start_string = '[%'
    app.jinja_env.block_end_string = '%]'
    app.jinja_env.comment_start_string = '[#'
    app.jinja_env.comment_end_string = '#]'
    
    # 初始化扩展
    db.init_app(app)
    
    # 配置安全扩展
    configure_security_extensions(app)
    
    # 注册蓝图
    from routes.pages import pages_bp
    from routes.api import api_bp
    from routes.admin import admin_bp
    
    app.register_blueprint(pages_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(admin_bp)
    
    # 注册错误处理器
    register_error_handlers(app)
    
    # 初始化数据库 - 自动初始化（新服务器部署时确保数据库结构完整）
    with app.app_context():
        init_database()
    
    return app

def register_error_handlers(app):
    """注册错误处理器"""
    
    @app.errorhandler(413)
    def too_large(e):
        return {'success': False, 'error': '文件太大，请选择小于5MB的图片'}, 413
    
    @app.errorhandler(404)
    def not_found(e):
        return "页面不存在", 404
    
    @app.errorhandler(500)
    def internal_error(e):
        return "服务器内部错误", 500

def configure_security_extensions(app):
    """配置安全扩展"""
    try:
        # 配置请求频率限制
        from flask_limiter import Limiter
        from flask_limiter.util import get_remote_address
        
        limiter = Limiter(
            app=app,
            key_func=get_remote_address,
            default_limits=["50000 per day", "5000 per hour"],  # 大幅提高限制
            storage_uri="memory://",  # 生产环境应使用Redis
            enabled=True
        )
        
        # 将limiter存储到app中供路由使用
        app.limiter = limiter
        
        # 配置安全头（完全禁用CSP）
        from flask_talisman import Talisman
        
        Talisman(app, 
                 force_https=app.config.get('FLASK_ENV') == 'production',
                 strict_transport_security=True,
                 strict_transport_security_max_age=31536000,
                 frame_options='SAMEORIGIN',
                 force_file_save=True,
                 content_security_policy=False)
        
        print("✅ 安全扩展配置完成")
        
    except ImportError as e:
        print(f"⚠️ 安全扩展导入失败: {e}")
        print("请运行: pip install Flask-Limiter Flask-Talisman")

def init_database():
    """初始化数据库"""
    from utils.models import SystemConfig
    
    db.create_all()
    
    # 初始化系统配置
    if not SystemConfig.query.filter_by(config_key='site_name').first():
        configs = [
            {'config_key': 'site_name', 'config_value': '吧唧生成器', 'config_type': 'string', 'is_public': True},
            {'config_key': 'default_price', 'config_value': '15.00', 'config_type': 'number', 'is_public': False},
            {'config_key': 'max_file_size', 'config_value': '5242880', 'config_type': 'number', 'is_public': True},
            {'config_key': 'allowed_formats', 'config_value': 'jpg,jpeg,png,webp', 'config_type': 'string', 'is_public': True},
            {'config_key': 'order_prefix', 'config_value': 'BJI', 'config_type': 'string', 'is_public': False},
        ]
        
        for config_data in configs:
            config = SystemConfig(**config_data)
            db.session.add(config)
        
        db.session.commit()
        print("✅ 系统配置初始化完成")
