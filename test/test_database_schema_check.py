# test_database_schema_check.py - 数据库结构检查测试

import sqlite3
import os
db_path = 'baji_simple.db'
if not os.path.exists(db_path):
    print(f"数据库文件不存在: {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute('SELECT name FROM sqlite_master WHERE type="table"')
tables = [row[0] for row in cursor.fetchall()]
print("数据库中的表:", tables)

for table in tables:
    cursor.execute(f'PRAGMA table_info({table})')
    columns = [column[1] for column in cursor.fetchall()]
    print(f"表 {table} 的字段:", columns)

conn.close()
