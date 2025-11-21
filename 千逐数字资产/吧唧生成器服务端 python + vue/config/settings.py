# config/settings.py - 应用配置
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """基础配置类"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///instance/baji_simple.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # 文件上传配置
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'static/uploads')
    EXPORT_FOLDER = os.environ.get('EXPORT_FOLDER', 'static/exports')
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 5242880))  # 5MB
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
    
    # 导出文件夹结构配置
    USE_DATE_FOLDER_STRUCTURE = os.environ.get('USE_DATE_FOLDER_STRUCTURE', 'true').lower() == 'true'
    
    # 图片处理配置
    MAX_IMAGE_SIZE = (20000, 20000)  # 最大图片尺寸
    BAJI_SIZE = (68, 68)  # 吧唧尺寸(mm)
    
    # PDF生成配置
    PDF_FORMATS = {
        'a4_6': {'page_size': 'A4', 'items_per_page': 6},
        'a4_9': {'page_size': 'A4', 'items_per_page': 9},
        'a4_12': {'page_size': 'A4', 'items_per_page': 12}
    }
    
    # 业务配置
    ORDER_PREFIX = os.environ.get('ORDER_PREFIX', 'BJI')
    DEFAULT_PRICE = float(os.environ.get('DEFAULT_PRICE', 15.00))
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD') or 'admin123'
    
    # 缓存配置
    CACHE_TYPE = os.environ.get('CACHE_TYPE', 'simple')
    CACHE_DEFAULT_TIMEOUT = int(os.environ.get('CACHE_TIMEOUT', 300))

class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    FLASK_ENV = 'development'

class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False
    FLASK_ENV = 'production'
    
    # 生产环境安全配置
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'

class TestingConfig(Config):
    """测试环境配置"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False

# 配置字典
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
