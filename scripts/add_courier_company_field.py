#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
添加courier_company字段到deliveries表
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.app_factory import create_app
from utils.models import db
from sqlalchemy import text

def add_courier_company_field():
    """添加courier_company字段"""
    app = create_app()
    
    with app.app_context():
        try:
            # 检查字段是否已存在
            result = db.session.execute(text("PRAGMA table_info(deliveries)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'courier_company' not in columns:
                print("添加courier_company字段...")
                db.session.execute(text("ALTER TABLE deliveries ADD COLUMN courier_company VARCHAR(50)"))
                db.session.commit()
                print("✅ courier_company字段添加成功")
            else:
                print("✅ courier_company字段已存在")
                
        except Exception as e:
            print(f"❌ 添加字段失败: {e}")
            db.session.rollback()
            return False
            
    return True

if __name__ == '__main__':
    print("🔧 添加courier_company字段到deliveries表")
    print("=" * 50)
    
    if add_courier_company_field():
        print("✅ 数据库迁移完成")
    else:
        print("❌ 数据库迁移失败")
        sys.exit(1)
