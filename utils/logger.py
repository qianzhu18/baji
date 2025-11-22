# utils/logger.py
import os
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path

class Logger:
    """文件日志处理工具类"""
    
    def __init__(self, log_dir='static/logs'):
        self.log_dir = Path(log_dir)
        self._ensure_log_directories()
        
        # 设置日志文件路径
        self.operation_log_path = self.log_dir / 'operation.log'
        self.error_log_path = self.log_dir / 'error.log'
        self.access_log_path = self.log_dir / 'access.log'
        self.system_log_path = self.log_dir / 'system.log'
        
        # 配置Python标准日志
        self._setup_standard_logging()
    
    def _ensure_log_directories(self):
        """确保日志目录存在"""
        self.log_dir.mkdir(parents=True, exist_ok=True)
        # 创建.gitkeep文件
        (self.log_dir / '.gitkeep').touch(exist_ok=True)
    
    def _setup_standard_logging(self):
        """设置Python标准日志"""
        # 创建日志格式
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # 系统日志处理器
        system_handler = logging.FileHandler(self.system_log_path, encoding='utf-8')
        system_handler.setFormatter(formatter)
        system_handler.setLevel(logging.INFO)
        
        # 错误日志处理器
        error_handler = logging.FileHandler(self.error_log_path, encoding='utf-8')
        error_handler.setFormatter(formatter)
        error_handler.setLevel(logging.ERROR)
        
        # 配置根日志器
        root_logger = logging.getLogger()
        root_logger.setLevel(logging.INFO)
        root_logger.addHandler(system_handler)
        root_logger.addHandler(error_handler)
    
    def log_operation(self, operation_type, target_table=None, target_id=None, 
                     operation_data=None, ip_address=None, user_agent=None):
        """记录操作日志"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'level': 'INFO',
            'type': 'operation',
            'operation_type': operation_type,
            'target_table': target_table,
            'target_id': target_id,
            'operation_data': operation_data,
            'ip_address': ip_address,
            'user_agent': user_agent
        }
        
        self._write_log(self.operation_log_path, log_entry)
    
    def log_error(self, error_type, error_message, error_data=None, 
                 ip_address=None, user_agent=None):
        """记录错误日志"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'level': 'ERROR',
            'type': 'error',
            'error_type': error_type,
            'error_message': error_message,
            'error_data': error_data,
            'ip_address': ip_address,
            'user_agent': user_agent
        }
        
        self._write_log(self.error_log_path, log_entry)
        
        # 同时写入Python标准日志
        logging.error(f"{error_type}: {error_message}")
    
    def log_access(self, request_path, method, status_code, response_time,
                  ip_address=None, user_agent=None):
        """记录访问日志"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'level': 'INFO',
            'type': 'access',
            'request_path': request_path,
            'method': method,
            'status_code': status_code,
            'response_time': response_time,
            'ip_address': ip_address,
            'user_agent': user_agent
        }
        
        self._write_log(self.access_log_path, log_entry)
    
    def log_system(self, message, level='INFO', extra_data=None):
        """记录系统日志"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'level': level,
            'type': 'system',
            'message': message,
            'extra_data': extra_data
        }
        
        self._write_log(self.system_log_path, log_entry)
        
        # 同时写入Python标准日志
        if level == 'ERROR':
            logging.error(message)
        elif level == 'WARNING':
            logging.warning(message)
        else:
            logging.info(message)
    
    def _write_log(self, log_file_path, log_entry):
        """写入日志文件"""
        try:
            with open(log_file_path, 'a', encoding='utf-8') as f:
                f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
        except Exception as e:
            # 如果写入失败，尝试写入系统日志
            logging.error(f"Failed to write log: {str(e)}")
    
    def get_logs(self, log_type='operation', start_date=None, end_date=None, limit=100):
        """获取日志记录"""
        try:
            # 确定日志文件路径
            if log_type == 'operation':
                log_file_path = self.operation_log_path
            elif log_type == 'error':
                log_file_path = self.error_log_path
            elif log_type == 'access':
                log_file_path = self.access_log_path
            elif log_type == 'system':
                log_file_path = self.system_log_path
            else:
                return []
            
            if not os.path.exists(log_file_path):
                return []
            
            logs = []
            with open(log_file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    try:
                        log_entry = json.loads(line.strip())
                        
                        # 过滤日期范围
                        if start_date or end_date:
                            log_date = datetime.fromisoformat(log_entry['timestamp']).date()
                            if start_date and log_date < start_date:
                                continue
                            if end_date and log_date > end_date:
                                continue
                        
                        logs.append(log_entry)
                        
                        # 限制数量
                        if len(logs) >= limit:
                            break
                            
                    except json.JSONDecodeError:
                        continue
            
            # 按时间倒序排列
            logs.sort(key=lambda x: x['timestamp'], reverse=True)
            return logs
            
        except Exception as e:
            logging.error(f"Failed to get logs: {str(e)}")
            return []
    
    def get_log_stats(self):
        """获取日志统计信息"""
        try:
            stats = {}
            
            for log_type in ['operation', 'error', 'access', 'system']:
                if log_type == 'operation':
                    log_file_path = self.operation_log_path
                elif log_type == 'error':
                    log_file_path = self.error_log_path
                elif log_type == 'access':
                    log_file_path = self.access_log_path
                elif log_type == 'system':
                    log_file_path = self.system_log_path
                
                if os.path.exists(log_file_path):
                    file_size = os.path.getsize(log_file_path)
                    with open(log_file_path, 'r', encoding='utf-8') as f:
                        record_count = sum(1 for line in f)
                    
                    stats[log_type] = {
                        'file_size': file_size,
                        'record_count': record_count,
                        'file_path': str(log_file_path)
                    }
                else:
                    stats[log_type] = {
                        'file_size': 0,
                        'record_count': 0,
                        'file_path': str(log_file_path)
                    }
            
            return stats
            
        except Exception as e:
            logging.error(f"Failed to get log stats: {str(e)}")
            return {}
    
    def cleanup_old_logs(self, days=30):
        """清理旧日志文件"""
        try:
            cutoff_date = datetime.now().date() - timedelta(days=days)
            
            for log_file_path in [self.operation_log_path, self.error_log_path, 
                                self.access_log_path, self.system_log_path]:
                if os.path.exists(log_file_path):
                    # 创建备份文件
                    backup_path = f"{log_file_path}.backup"
                    os.rename(log_file_path, backup_path)
                    
                    # 重新创建空文件
                    with open(log_file_path, 'w', encoding='utf-8') as f:
                        pass
                    
                    logging.info(f"Cleaned up log file: {log_file_path}")
            
        except Exception as e:
            logging.error(f"Failed to cleanup old logs: {str(e)}")

# 全局日志记录器实例
logger = Logger()
