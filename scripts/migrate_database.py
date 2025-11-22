# scripts/migrate_database.py
"""
数据库迁移脚本 - 添加案例展示系统相关表
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.app_factory import create_app
from utils.models import db, Case, CaseInteraction, FileManagement, PrintJob

def migrate_database():
    """执行数据库迁移"""
    app = create_app()
    
    with app.app_context():
        try:
            # 创建新表
            db.create_all()
            print("✅ 数据库表创建成功")
            
            # 检查表是否创建成功
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            tables = ['cases', 'case_interactions', 'file_management', 'print_jobs']
            for table in tables:
                if inspector.has_table(table):
                    print(f"✅ 表 {table} 创建成功")
                else:
                    print(f"❌ 表 {table} 创建失败")
            
            print("\n🎉 数据库迁移完成！")
            print("📝 注意: 日志系统已改为文件日志，不再使用数据库存储")
            
        except Exception as e:
            print(f"❌ 数据库迁移失败: {str(e)}")
            return False
    
    return True

if __name__ == '__main__':
    migrate_database()
