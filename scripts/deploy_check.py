#!/usr/bin/env python3
"""
新服务器部署数据库检查脚本
确保数据库结构完整，避免空数据库问题
"""

import os
import sys
import sqlite3
from pathlib import Path

def check_database_integrity():
    """检查数据库完整性"""
    print("🔍 检查数据库完整性")
    print("=" * 50)
    
    # 检查数据库文件
    instance_dir = Path('instance')
    db_files = {
        'baji_simple.db': '主数据库',
        'baji_simple_serverside.db': '服务器数据库',
        'baji.db': '备用数据库'
    }
    
    issues = []
    
    for db_file, description in db_files.items():
        db_path = instance_dir / db_file
        print(f"\n📁 检查 {description} ({db_file}):")
        
        if not db_path.exists():
            print(f"  ❌ 文件不存在")
            issues.append(f"{description} 文件不存在")
            continue
        
        size = db_path.stat().st_size
        print(f"  📏 文件大小: {size} 字节")
        
        if size == 0:
            print(f"  ❌ 文件为空")
            issues.append(f"{description} 文件为空")
            continue
        
        # 检查数据库结构
        try:
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            
            # 检查表数量
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            table_count = len(tables)
            
            print(f"  📋 表数量: {table_count}")
            
            if table_count == 0:
                print(f"  ❌ 没有表结构")
                issues.append(f"{description} 缺少表结构")
            elif table_count < 9:
                print(f"  ⚠️ 表数量不足 (需要9个，实际{table_count}个)")
                issues.append(f"{description} 表结构不完整")
            else:
                print(f"  ✅ 表结构完整")
            
            # 检查系统配置
            if 'system_configs' in [t[0] for t in tables]:
                cursor.execute("SELECT COUNT(*) FROM system_configs")
                config_count = cursor.fetchone()[0]
                print(f"  📋 系统配置: {config_count} 条")
                
                if config_count == 0:
                    print(f"  ⚠️ 缺少系统配置")
                    issues.append(f"{description} 缺少系统配置")
                else:
                    print(f"  ✅ 系统配置完整")
            
            conn.close()
            
        except Exception as e:
            print(f"  ❌ 数据库检查失败: {e}")
            issues.append(f"{description} 检查失败: {e}")
    
    return issues

def fix_empty_databases():
    """修复空数据库"""
    print("\n🔧 修复空数据库")
    print("=" * 50)
    
    instance_dir = Path('instance')
    
    # 找到正常的数据库作为模板
    template_db = None
    for db_file in ['baji_simple.db', 'baji.db']:
        db_path = instance_dir / db_file
        if db_path.exists() and db_path.stat().st_size > 0:
            try:
                conn = sqlite3.connect(str(db_path))
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = cursor.fetchall()
                if len(tables) >= 9:
                    template_db = db_path
                    conn.close()
                    break
                conn.close()
            except:
                continue
    
    if not template_db:
        print("❌ 没有找到可用的数据库模板")
        return False
    
    print(f"📋 使用模板数据库: {template_db.name}")
    
    # 修复空数据库
    fixed_count = 0
    for db_file in ['baji_simple_serverside.db', 'baji_simple.db', 'baji.db']:
        db_path = instance_dir / db_file
        
        if not db_path.exists() or db_path.stat().st_size == 0:
            print(f"🔨 修复 {db_file}...")
            
            try:
                # 复制模板数据库
                import shutil
                shutil.copy2(template_db, db_path)
                print(f"✅ {db_file} 修复完成")
                fixed_count += 1
            except Exception as e:
                print(f"❌ {db_file} 修复失败: {e}")
    
    return fixed_count > 0

def main():
    """主函数"""
    print("🚀 新服务器部署数据库检查")
    print("=" * 60)
    
    # 检查数据库完整性
    issues = check_database_integrity()
    
    if not issues:
        print("\n✅ 所有数据库都正常，无需修复")
        return True
    
    print(f"\n⚠️ 发现 {len(issues)} 个问题:")
    for issue in issues:
        print(f"  - {issue}")
    
    # 询问是否修复
    print("\n🔧 是否自动修复这些问题？")
    print("这将复制正常数据库的结构到空数据库中")
    
    # 自动修复（在生产环境中可以改为交互式）
    if issues:
        print("🔨 开始自动修复...")
        success = fix_empty_databases()
        
        if success:
            print("\n✅ 数据库修复完成")
            
            # 重新检查
            print("\n🔍 重新检查数据库完整性...")
            new_issues = check_database_integrity()
            
            if not new_issues:
                print("\n🎉 所有数据库问题已解决！")
                return True
            else:
                print(f"\n⚠️ 仍有 {len(new_issues)} 个问题未解决")
                return False
        else:
            print("\n❌ 数据库修复失败")
            return False
    
    return False

if __name__ == '__main__':
    success = main()
    if success:
        print("\n✅ 新服务器部署检查完成，数据库已准备就绪")
        sys.exit(0)
    else:
        print("\n❌ 数据库检查发现问题，请手动处理")
        sys.exit(1)
