#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试文件路径处理逻辑
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.app_factory import create_app

def test_path_processing():
    """测试API路径处理逻辑"""
    print("🔍 测试API路径处理逻辑")
    print("=" * 60)
    
    app = create_app()
    with app.app_context():
        upload_folder = app.config['UPLOAD_FOLDER']
        print(f"📁 UPLOAD_FOLDER: {upload_folder}")
        print(f"📁 UPLOAD_FOLDER绝对路径: {os.path.abspath(upload_folder)}")
        
        # 测试不同的路径格式
        test_paths = [
            'static/uploads/2025/10/20251011_203311_7db49fdc.jpg',
            'static\\uploads\\2025\\10\\20251011_203311_7db49fdc.jpg',
            'uploads/2025/10/20251011_203311_7db49fdc.jpg',
            '2025/10/20251011_203311_7db49fdc.jpg'
        ]
        
        for test_path in test_paths:
            print(f"\\n🔍 测试路径: {test_path}")
            
            # 模拟API中的路径处理
            image_path = test_path.replace('\\', '/')
            print(f"  标准化后: {image_path}")
            
            if not os.path.isabs(image_path):
                if image_path.startswith('static/uploads/'):
                    relative_path = image_path[len('static/uploads/'):]
                    print(f"  相对路径: {relative_path}")
                    final_path = os.path.join(upload_folder, relative_path)
                    print(f"  最终路径: {final_path}")
                    print(f"  绝对路径: {os.path.abspath(final_path)}")
                    
                    if os.path.exists(final_path):
                        print("  ✅ 文件存在")
                    else:
                        print("  ❌ 文件不存在")
                else:
                    print("  ❌ 路径不以static/uploads/开头")
            else:
                print("  ✅ 已经是绝对路径")

if __name__ == '__main__':
    test_path_processing()
