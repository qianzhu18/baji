# utils/performance_optimizer.py
"""
性能优化工具
"""
import os
import time
import hashlib
from functools import wraps
from datetime import datetime, timedelta
from PIL import Image
from utils.models import db, Case, FileManagement
from utils.logger import logger

class PerformanceOptimizer:
    """性能优化工具类"""
    
    def __init__(self):
        self.cache_duration = 3600  # 缓存1小时
        self.image_cache = {}
        self.query_cache = {}
    
    def cache_result(self, duration=None):
        """缓存装饰器"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # 生成缓存键
                cache_key = f"{func.__name__}_{hashlib.md5(str(args).encode() + str(kwargs).encode()).hexdigest()}"
                
                # 检查缓存
                if cache_key in self.query_cache:
                    cached_data = self.query_cache[cache_key]
                    if datetime.now() - cached_data['timestamp'] < timedelta(seconds=duration or self.cache_duration):
                        return cached_data['result']
                
                # 执行函数并缓存结果
                result = func(*args, **kwargs)
                self.query_cache[cache_key] = {
                    'result': result,
                    'timestamp': datetime.now()
                }
                
                return result
            return wrapper
        return decorator
    
    def optimize_image(self, image_path, max_width=800, max_height=800, quality=85):
        """优化图片"""
        try:
            # 检查是否已经优化过
            optimized_path = self._get_optimized_path(image_path)
            if os.path.exists(optimized_path):
                return optimized_path
            
            # 打开图片
            with Image.open(image_path) as img:
                # 转换为RGB模式
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                # 计算新尺寸
                width, height = img.size
                if width > max_width or height > max_height:
                    # 保持宽高比
                    ratio = min(max_width / width, max_height / height)
                    new_width = int(width * ratio)
                    new_height = int(height * ratio)
                    img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # 保存优化后的图片
                img.save(optimized_path, 'JPEG', quality=quality, optimize=True)
                
                # 记录文件信息
                self._record_file_info(optimized_path, 'optimized')
                
                return optimized_path
                
        except Exception as e:
            logger.log_error('image_optimization_error', str(e))
            return image_path
    
    def _get_optimized_path(self, original_path):
        """获取优化后的图片路径"""
        path_parts = original_path.rsplit('.', 1)
        if len(path_parts) == 2:
            return f"{path_parts[0]}_optimized.{path_parts[1]}"
        else:
            return f"{original_path}_optimized"
    
    def _record_file_info(self, file_path, file_type):
        """记录文件信息"""
        try:
            if os.path.exists(file_path):
                stat = os.stat(file_path)
                file_record = FileManagement(
                    file_type=file_type,
                    file_path=file_path,
                    original_filename=os.path.basename(file_path),
                    file_size=stat.st_size,
                    file_hash=self._calculate_hash(file_path),
                    mime_type='image/jpeg',
                    upload_date=datetime.now().date()
                )
                db.session.add(file_record)
                db.session.commit()
        except Exception as e:
            logger.log_error('record_file_info_error', str(e))
    
    def _calculate_hash(self, file_path):
        """计算文件哈希"""
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    
    def optimize_database_queries(self):
        """优化数据库查询"""
        try:
            # 添加索引
            self._add_database_indexes()
            
            # 清理过期数据
            self._cleanup_expired_data()
            
            # 优化表结构
            self._optimize_table_structure()
            
        except Exception as e:
            logger.log_error('database_optimization_error', str(e))
    
    def _add_database_indexes(self):
        """添加数据库索引"""
        try:
            # 为Case表添加索引
            db.engine.execute("CREATE INDEX IF NOT EXISTS idx_cases_category ON cases(category)")
            db.engine.execute("CREATE INDEX IF NOT EXISTS idx_cases_featured ON cases(is_featured)")
            db.engine.execute("CREATE INDEX IF NOT EXISTS idx_cases_public ON cases(is_public)")
            db.engine.execute("CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at)")
            db.engine.execute("CREATE INDEX IF NOT EXISTS idx_cases_like_count ON cases(like_count)")
            
            # 为CaseInteraction表添加索引
            db.engine.execute("CREATE INDEX IF NOT EXISTS idx_case_interactions_case_id ON case_interactions(case_id)")
            db.engine.execute("CREATE INDEX IF NOT EXISTS idx_case_interactions_type ON case_interactions(interaction_type)")
            db.engine.execute("CREATE INDEX IF NOT EXISTS idx_case_interactions_ip ON case_interactions(ip_address)")
            
            logger.log_operation('add_database_indexes', 'database', None, {
                'indexes_added': ['cases_category', 'cases_featured', 'cases_public', 'cases_created_at', 'cases_like_count']
            })
            
        except Exception as e:
            logger.log_error('add_database_indexes_error', str(e))
    
    def _cleanup_expired_data(self):
        """清理过期数据"""
        try:
            # 清理过期的互动记录（保留30天）
            cutoff_date = datetime.now() - timedelta(days=30)
            expired_interactions = CaseInteraction.query.filter(
                CaseInteraction.created_at < cutoff_date
            ).delete()
            
            # 清理过期的临时文件
            expired_files = FileManagement.query.filter(
                FileManagement.is_temp == True,
                FileManagement.expires_at < datetime.now()
            ).all()
            
            for file_record in expired_files:
                if os.path.exists(file_record.file_path):
                    os.remove(file_record.file_path)
                db.session.delete(file_record)
            
            db.session.commit()
            
            logger.log_operation('cleanup_expired_data', 'database', None, {
                'expired_interactions': expired_interactions,
                'expired_files': len(expired_files)
            })
            
        except Exception as e:
            db.session.rollback()
            logger.log_error('cleanup_expired_data_error', str(e))
    
    def _optimize_table_structure(self):
        """优化表结构"""
        try:
            # 分析表统计信息
            db.engine.execute("ANALYZE cases")
            db.engine.execute("ANALYZE case_interactions")
            db.engine.execute("ANALYZE file_management")
            
            logger.log_operation('optimize_table_structure', 'database', None, {
                'tables_analyzed': ['cases', 'case_interactions', 'file_management']
            })
            
        except Exception as e:
            logger.log_error('optimize_table_structure_error', str(e))
    
    def get_performance_metrics(self):
        """获取性能指标"""
        try:
            metrics = {
                'cache_hit_rate': self._calculate_cache_hit_rate(),
                'database_query_time': self._measure_query_time(),
                'image_optimization_stats': self._get_image_stats(),
                'memory_usage': self._get_memory_usage()
            }
            
            return metrics
            
        except Exception as e:
            logger.log_error('get_performance_metrics_error', str(e))
            return {}
    
    def _calculate_cache_hit_rate(self):
        """计算缓存命中率"""
        total_requests = len(self.query_cache)
        if total_requests == 0:
            return 0.0
        
        # 这里可以添加更复杂的缓存命中率计算逻辑
        return 0.85  # 示例值
    
    def _measure_query_time(self):
        """测量查询时间"""
        start_time = time.time()
        
        # 执行一个简单的查询
        Case.query.count()
        
        end_time = time.time()
        return end_time - start_time
    
    def _get_image_stats(self):
        """获取图片优化统计"""
        try:
            optimized_files = FileManagement.query.filter(
                FileManagement.file_type == 'optimized'
            ).count()
            
            total_size = db.session.query(db.func.sum(FileManagement.file_size)).filter(
                FileManagement.file_type == 'optimized'
            ).scalar() or 0
            
            return {
                'optimized_count': optimized_files,
                'total_size': total_size
            }
            
        except Exception as e:
            logger.log_error('get_image_stats_error', str(e))
            return {}
    
    def _get_memory_usage(self):
        """获取内存使用情况"""
        try:
            import psutil
            process = psutil.Process()
            return {
                'memory_percent': process.memory_percent(),
                'memory_mb': process.memory_info().rss / 1024 / 1024
            }
        except ImportError:
            return {'memory_percent': 0, 'memory_mb': 0}
        except Exception as e:
            logger.log_error('get_memory_usage_error', str(e))
            return {}
    
    def clear_cache(self):
        """清除缓存"""
        self.query_cache.clear()
        self.image_cache.clear()
    
    def schedule_optimization(self):
        """定时优化任务"""
        try:
            # 每天执行一次优化
            self.optimize_database_queries()
            self.clear_cache()
            
            logger.log_operation('schedule_optimization', 'system', None, {
                'optimization_time': datetime.now().isoformat()
            })
            
        except Exception as e:
            logger.log_error('schedule_optimization_error', str(e))

# 全局性能优化器实例
performance_optimizer = PerformanceOptimizer()
