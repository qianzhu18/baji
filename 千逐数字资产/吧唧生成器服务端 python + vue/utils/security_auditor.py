# utils/security_auditor.py - 安全审计工具
import os
import hashlib
import json
from datetime import datetime
from flask import request, current_app
from utils.models import db

class SecurityAuditor:
    """安全审计工具类"""
    
    def __init__(self):
        self.audit_log = []
    
    def log_security_event(self, event_type, details, severity='INFO'):
        """记录安全事件"""
        event = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': event_type,
            'severity': severity,
            'ip_address': request.remote_addr if request else 'unknown',
            'user_agent': request.headers.get('User-Agent') if request else 'unknown',
            'details': details
        }
        
        self.audit_log.append(event)
        
        # 记录到应用日志
        if current_app:
            current_app.logger.info(f"SECURITY_AUDIT: {event_type} - {details}")
    
    def log_file_upload(self, filename, file_size, validation_result):
        """记录文件上传事件"""
        self.log_security_event(
            'FILE_UPLOAD',
            {
                'filename': filename,
                'file_size': file_size,
                'validation_result': validation_result,
                'ip_address': request.remote_addr
            },
            'INFO'
        )
    
    def log_file_download(self, filename, file_path, user_type='admin'):
        """记录文件下载事件"""
        self.log_security_event(
            'FILE_DOWNLOAD',
            {
                'filename': filename,
                'file_path': file_path,
                'user_type': user_type,
                'ip_address': request.remote_addr
            },
            'INFO'
        )
    
    def log_admin_action(self, action, target, details=None):
        """记录管理员操作"""
        self.log_security_event(
            'ADMIN_ACTION',
            {
                'action': action,
                'target': target,
                'details': details,
                'ip_address': request.remote_addr
            },
            'INFO'
        )
    
    def log_security_violation(self, violation_type, details):
        """记录安全违规"""
        self.log_security_event(
            'SECURITY_VIOLATION',
            {
                'violation_type': violation_type,
                'details': details,
                'ip_address': request.remote_addr
            },
            'WARNING'
        )
    
    def log_rate_limit_hit(self, endpoint, limit):
        """记录频率限制触发"""
        self.log_security_event(
            'RATE_LIMIT_HIT',
            {
                'endpoint': endpoint,
                'limit': limit,
                'ip_address': request.remote_addr
            },
            'WARNING'
        )
    
    def audit_file_integrity(self):
        """审计文件完整性"""
        critical_files = [
            'main.py',
            'config/app_factory.py',
            'routes/api.py',
            'routes/admin.py',
            'utils/models.py',
            'utils/helpers.py'
        ]
        
        for file_path in critical_files:
            if os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    file_hash = hashlib.sha256(f.read()).hexdigest()
                
                self.audit_log.append({
                    'type': 'FILE_INTEGRITY',
                    'file': file_path,
                    'hash': file_hash,
                    'timestamp': datetime.utcnow().isoformat()
                })
    
    def audit_permissions(self):
        """审计文件权限"""
        sensitive_files = [
            'instance/baji_simple.db',
            'static/uploads/',
            'static/exports/'
        ]
        
        for file_path in sensitive_files:
            if os.path.exists(file_path):
                stat_info = os.stat(file_path)
                permissions = oct(stat_info.st_mode)[-3:]
                
                self.audit_log.append({
                    'type': 'PERMISSIONS',
                    'file': file_path,
                    'permissions': permissions,
                    'timestamp': datetime.utcnow().isoformat()
                })
    
    def generate_audit_report(self):
        """生成审计报告"""
        report = {
            'timestamp': datetime.utcnow().isoformat(),
            'audit_items': self.audit_log,
            'summary': {
                'total_events': len(self.audit_log),
                'security_violations': len([e for e in self.audit_log if e.get('severity') == 'WARNING']),
                'file_uploads': len([e for e in self.audit_log if e.get('event_type') == 'FILE_UPLOAD']),
                'admin_actions': len([e for e in self.audit_log if e.get('event_type') == 'ADMIN_ACTION'])
            }
        }
        
        # 保存报告到文件
        log_dir = 'static/logs'
        os.makedirs(log_dir, exist_ok=True)
        
        report_filename = f"security_audit_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        report_path = os.path.join(log_dir, report_filename)
        
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        return report

# 全局安全审计实例
security_auditor = SecurityAuditor()
