#!/usr/bin/env python3
"""
数据库初始化脚本
用于在 Docker 容器启动时确保数据库文件存在且具有正确权限
"""

import os
import sys
import sqlite3
from pathlib import Path

def init_database():
    """初始化数据库"""
    # 确保 instance 目录存在
    instance_dir = Path('/app/instance')
    instance_dir.mkdir(exist_ok=True)
    
    # 设置目录权限
    os.chmod(instance_dir, 0o777)
    
    # 数据库文件路径
    db_path = instance_dir / 'baji_simple.db'
    
    # 如果数据库文件不存在，创建它
    if not db_path.exists():
        print(f"创建数据库文件: {db_path}")
        # 创建空的数据库文件
        conn = sqlite3.connect(str(db_path))
        conn.close()
    
    # 设置数据库文件权限
    try:
        os.chmod(db_path, 0o666)
        print(f"设置数据库文件权限: {db_path}")
    except Exception as e:
        print(f"设置权限失败: {e}")
    
    # 测试数据库连接
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        conn.close()
        print(f"数据库连接测试成功: {result}")
        return True
    except Exception as e:
        print(f"数据库连接测试失败: {e}")
        return False

if __name__ == '__main__':
    print("开始初始化数据库...")
    success = init_database()
    if success:
        print("数据库初始化完成！")
        sys.exit(0)
    else:
        print("数据库初始化失败！")
        sys.exit(1)
