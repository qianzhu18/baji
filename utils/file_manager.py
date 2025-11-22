# utils/file_manager.py
import os
import hashlib
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from utils.models import db, FileManagement

class FileManager:
    """文件管理工具类"""
    
    def __init__(self, base_path='static'):
        self.base_path = Path(base_path)
        self.upload_path = self.base_path / 'uploads'
        self.export_path = self.base_path / 'exports'
        self.log_path = self.base_path / 'logs'
        
        # 确保目录存在
        self._ensure_directories()
    
    def _ensure_directories(self):
        """确保所有必要的目录存在"""
        directories = [
            self.upload_path,
            self.export_path / 'pdf',
            self.export_path / 'images',
            self.export_path / 'temp',
            self.log_path,
            self.log_path / 'error',
            self.log_path / 'access',
            self.log_path / 'archive'
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            # 创建.gitkeep文件（如果权限允许）
            try:
                (directory / '.gitkeep').touch(exist_ok=True)
            except PermissionError:
                # 如果权限不足，跳过.gitkeep文件创建
                pass
    
    def get_upload_path(self, filename=None):
        """获取上传文件路径"""
        now = datetime.now()
        year_dir = self.upload_path / str(now.year)
        month_dir = year_dir / f"{now.month:02d}"
        
        month_dir.mkdir(parents=True, exist_ok=True)
        
        if filename:
            # 生成唯一文件名 - 仅使用时间戳和GUID，不包含原文件名
            timestamp = now.strftime('%Y%m%d_%H%M%S')
            _, ext = os.path.splitext(filename)
            # 生成8位随机GUID
            import uuid
            guid = str(uuid.uuid4()).replace('-', '')[:8]
            unique_filename = f"{timestamp}_{guid}{ext}"
            full_path = month_dir / unique_filename
            
            # 返回相对路径（从项目根目录开始）
            try:
                relative_path = str(full_path.relative_to(Path.cwd()))
                # 确保使用正斜杠作为路径分隔符
                return relative_path.replace('\\', '/')
            except ValueError:
                # 如果无法计算相对路径，直接返回路径字符串
                return str(full_path).replace('\\', '/')
        
        try:
            relative_path = str(month_dir.relative_to(Path.cwd()))
            return relative_path.replace('\\', '/')
        except ValueError:
            return str(month_dir).replace('\\', '/')
    
    def get_export_path(self, file_type='pdf', filename=None):
        """获取导出文件路径"""
        now = datetime.now()
        year_dir = self.export_path / file_type / str(now.year)
        month_dir = year_dir / f"{now.month:02d}"
        
        month_dir.mkdir(parents=True, exist_ok=True)
        
        if filename:
            timestamp = now.strftime('%Y%m%d_%H%M%S')
            name, ext = os.path.splitext(filename)
            unique_filename = f"{timestamp}_{name}_{hashlib.md5(filename.encode()).hexdigest()[:8]}{ext}"
            full_path = month_dir / unique_filename
            
            # 返回相对路径（从项目根目录开始）
            try:
                relative_path = str(full_path.relative_to(Path.cwd()))
                return relative_path.replace('\\', '/')
            except ValueError:
                return str(full_path).replace('\\', '/')
        
        try:
            relative_path = str(month_dir.relative_to(Path.cwd()))
            return relative_path.replace('\\', '/')
        except ValueError:
            return str(month_dir).replace('\\', '/')
    
    def get_dated_export_path(self, filename=None, file_type='images'):
        """获取基于年月日的导出文件路径"""
        now = datetime.now()
        year_dir = self.export_path / str(now.year)
        month_dir = year_dir / f"{now.month:02d}"
        day_dir = month_dir / f"{now.day:02d}"
        
        day_dir.mkdir(parents=True, exist_ok=True)
        
        if filename:
            # 保持原始文件名，但添加时间戳前缀避免冲突
            timestamp = now.strftime('%Y%m%d_%H%M%S')
            name, ext = os.path.splitext(filename)
            unique_filename = f"{timestamp}_{name}{ext}"
            full_path = day_dir / unique_filename
            
            # 返回相对路径（从项目根目录开始）
            try:
                relative_path = str(full_path.relative_to(Path.cwd()))
                return relative_path.replace('\\', '/')
            except ValueError:
                return str(full_path).replace('\\', '/')
        
        try:
            return str(day_dir.relative_to(Path.cwd()))
        except ValueError:
            return str(day_dir)
    
    def get_log_path(self, log_type='operation'):
        """获取日志文件路径"""
        now = datetime.now()
        year_dir = self.log_path / str(now.year)
        month_dir = year_dir / f"{now.month:02d}"
        
        month_dir.mkdir(parents=True, exist_ok=True)
        
        log_filename = f"{now.strftime('%Y-%m-%d')}.log"
        return month_dir / log_filename
    
    def save_file(self, file_obj, file_type='upload', filename=None):
        """保存文件并记录到数据库"""
        if file_type == 'upload':
            file_path = self.get_upload_path(filename)
        elif file_type == 'export':
            file_path = self.get_export_path(filename=filename)
        else:
            raise ValueError(f"不支持的文件类型: {file_type}")
        
        # 保存文件
        file_obj.save(str(file_path))
        
        # 计算文件哈希
        file_hash = self._calculate_hash(file_path)
        
        # 记录到数据库
        file_record = FileManagement(
            file_type=file_type,
            file_path=str(file_path),
            original_filename=filename or file_obj.filename,
            file_size=file_path.stat().st_size,
            file_hash=file_hash,
            mime_type=file_obj.content_type,
            upload_date=datetime.now().date()
        )
        
        db.session.add(file_record)
        db.session.commit()
        
        return file_record
    
    def _calculate_hash(self, file_path):
        """计算文件MD5哈希"""
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    
    def cleanup_temp_files(self, days=7):
        """清理临时文件"""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # 清理数据库中的临时文件记录
        temp_files = FileManagement.query.filter(
            FileManagement.is_temp == True,
            FileManagement.expires_at < datetime.now()
        ).all()
        
        for file_record in temp_files:
            if os.path.exists(file_record.file_path):
                os.remove(file_record.file_path)
            db.session.delete(file_record)
        
        db.session.commit()
    
    def archive_old_logs(self, days=30):
        """归档旧日志文件"""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # 查找需要归档的日志文件
        old_logs = FileManagement.query.filter(
            FileManagement.file_type == 'log',
            FileManagement.upload_date < cutoff_date.date()
        ).all()
        
        for log_record in old_logs:
            source_path = Path(log_record.file_path)
            if source_path.exists():
                # 创建归档目录
                archive_dir = self.log_path / 'archive' / str(log_record.upload_date.year)
                archive_dir.mkdir(parents=True, exist_ok=True)
                
                # 移动文件到归档目录
                archive_path = archive_dir / source_path.name
                shutil.move(str(source_path), str(archive_path))
                
                # 更新记录
                log_record.file_path = str(archive_path)
                log_record.is_archived = True
                log_record.archived_at = datetime.now()
        
        db.session.commit()

# 全局文件管理器实例
file_manager = FileManager()
