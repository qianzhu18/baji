#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MySQL数据库初始化脚本
用于在服务器上创建MySQL数据库和表结构
"""

import os
import sys
import pymysql
from urllib.parse import urlparse

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.app_factory import create_app
from utils.models import db, SystemConfig
from utils.logger import logger

def parse_database_url(database_url):
    """解析数据库URL"""
    parsed = urlparse(database_url)
    
    return {
        'host': parsed.hostname or 'localhost',
        'port': parsed.port or 3306,
        'username': parsed.username,
        'password': parsed.password,
        'database': parsed.path.lstrip('/'),
        'charset': 'utf8mb4'
    }

def create_database_if_not_exists(db_config):
    """创建数据库（如果不存在）"""
    try:
        # 连接到MySQL服务器（不指定数据库）
        connection = pymysql.connect(
            host=db_config['host'],
            port=db_config['port'],
            user=db_config['username'],
            password=db_config['password'],
            charset=db_config['charset']
        )
        
        with connection.cursor() as cursor:
            # 创建数据库
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_config['database']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            print(f"✅ 数据库 {db_config['database']} 创建成功")
            
            # 选择数据库
            cursor.execute(f"USE `{db_config['database']}`")
            
            # 设置MySQL配置
            cursor.execute("SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO'")
            cursor.execute("SET time_zone = '+00:00'")
            
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ 创建数据库失败: {str(e)}")
        return False

def init_mysql_database():
    """初始化MySQL数据库"""
    database_url = os.environ.get('DATABASE_URL')
    
    if not database_url:
        print("❌ 未设置 DATABASE_URL 环境变量")
        return False
    
    if not database_url.startswith('mysql'):
        print("❌ 当前配置不是MySQL数据库")
        return False
    
    print("🚀 开始初始化MySQL数据库...")
    
    # 解析数据库配置
    db_config = parse_database_url(database_url)
    print(f"📊 数据库配置: {db_config['host']}:{db_config['port']}/{db_config['database']}")
    
    # 创建数据库
    if not create_database_if_not_exists(db_config):
        return False
    
    # 创建Flask应用
    app = create_app()
    
    with app.app_context():
        try:
            # 创建所有表
            db.create_all()
            print("✅ 数据库表创建成功")
            
            # 初始化系统配置
            init_system_config()
            
            # 验证表创建
            verify_tables()
            
            print("\n🎉 MySQL数据库初始化完成！")
            print("📝 数据库已准备就绪，可以开始使用")
            
            return True
            
        except Exception as e:
            print(f"❌ 数据库初始化失败: {str(e)}")
            logger.log_error('mysql_init_error', str(e))
            return False

def init_system_config():
    """初始化系统配置"""
    try:
        # 检查是否已有配置
        if SystemConfig.query.filter_by(config_key='site_name').first():
            print("ℹ️  系统配置已存在，跳过初始化")
            return
        
        configs = [
            {'config_key': 'site_name', 'config_value': '吧唧生成器', 'config_type': 'string', 'is_public': True, 'description': '网站名称'},
            {'config_key': 'default_price', 'config_value': '15.00', 'config_type': 'number', 'is_public': False, 'description': '默认价格'},
            {'config_key': 'max_file_size', 'config_value': '5242880', 'config_type': 'number', 'is_public': True, 'description': '最大文件大小(字节)'},
            {'config_key': 'allowed_formats', 'config_value': 'jpg,jpeg,png,webp', 'config_type': 'string', 'is_public': True, 'description': '允许的文件格式'},
            {'config_key': 'order_prefix', 'config_value': 'BJI', 'config_type': 'string', 'is_public': False, 'description': '订单号前缀'},
            {'config_key': 'database_type', 'config_value': 'mysql', 'config_type': 'string', 'is_public': False, 'description': '数据库类型'},
        ]
        
        for config_data in configs:
            config = SystemConfig(**config_data)
            db.session.add(config)
        
        db.session.commit()
        print("✅ 系统配置初始化完成")
        
    except Exception as e:
        print(f"❌ 系统配置初始化失败: {str(e)}")
        db.session.rollback()
        raise

def verify_tables():
    """验证表是否创建成功"""
    tables = [
        'orders', 'coupons', 'deliveries', 'system_configs', 
        'cases', 'case_interactions', 'device_sessions', 'file_management'
    ]
    
    print("\n📋 验证数据库表:")
    for table in tables:
        try:
            # 检查表是否存在
            result = db.engine.execute(f"SHOW TABLES LIKE '{table}'")
            if result.fetchone():
                print(f"✅ 表 {table} 存在")
            else:
                print(f"❌ 表 {table} 不存在")
        except Exception as e:
            print(f"❌ 检查表 {table} 失败: {str(e)}")

def test_connection():
    """测试数据库连接"""
    try:
        app = create_app()
        with app.app_context():
            # 执行简单查询
            result = db.engine.execute("SELECT 1 as test")
            if result.fetchone():
                print("✅ 数据库连接测试成功")
                return True
    except Exception as e:
        print(f"❌ 数据库连接测试失败: {str(e)}")
        return False

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='MySQL数据库初始化脚本')
    parser.add_argument('--test', action='store_true', help='仅测试数据库连接')
    parser.add_argument('--force', action='store_true', help='强制重新初始化')
    
    args = parser.parse_args()
    
    if args.test:
        print("🔍 测试数据库连接...")
        success = test_connection()
        sys.exit(0 if success else 1)
    else:
        success = init_mysql_database()
        sys.exit(0 if success else 1)
