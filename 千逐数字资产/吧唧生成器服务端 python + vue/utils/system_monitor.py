# utils/system_monitor.py
"""
系统监控工具
"""
import os
import time
import psutil
from datetime import datetime, timedelta
from utils.models import db, Case, CaseInteraction, Order, FileManagement
from utils.logger import logger

class SystemMonitor:
    """系统监控工具类"""
    
    def __init__(self):
        self.monitoring_data = {}
        self.alert_thresholds = {
            'cpu_usage': 80.0,
            'memory_usage': 85.0,
            'disk_usage': 90.0,
            'response_time': 5.0
        }
    
    def get_system_status(self):
        """获取系统状态"""
        try:
            status = {
                'timestamp': datetime.now().isoformat(),
                'system': self._get_system_info(),
                'database': self._get_database_status(),
                'application': self._get_application_status(),
                'alerts': self._check_alerts()
            }
            
            return status
            
        except Exception as e:
            logger.log_error('get_system_status_error', str(e))
            return {'error': str(e)}
    
    def _get_system_info(self):
        """获取系统信息"""
        try:
            return {
                'cpu_percent': psutil.cpu_percent(interval=1),
                'memory': {
                    'total': psutil.virtual_memory().total,
                    'available': psutil.virtual_memory().available,
                    'percent': psutil.virtual_memory().percent,
                    'used': psutil.virtual_memory().used
                },
                'disk': {
                    'total': psutil.disk_usage('/').total,
                    'used': psutil.disk_usage('/').used,
                    'free': psutil.disk_usage('/').free,
                    'percent': psutil.disk_usage('/').percent
                },
                'load_average': os.getloadavg() if hasattr(os, 'getloadavg') else [0, 0, 0]
            }
        except Exception as e:
            logger.log_error('get_system_info_error', str(e))
            return {}
    
    def _get_database_status(self):
        """获取数据库状态"""
        try:
            # 数据库连接测试
            start_time = time.time()
            db.session.execute('SELECT 1')
            db_time = time.time() - start_time
            
            # 数据库统计
            case_count = Case.query.count()
            interaction_count = CaseInteraction.query.count()
            order_count = Order.query.count()
            file_count = FileManagement.query.count()
            
            return {
                'connection_time': db_time,
                'status': 'healthy' if db_time < 1.0 else 'slow',
                'statistics': {
                    'cases': case_count,
                    'interactions': interaction_count,
                    'orders': order_count,
                    'files': file_count
                }
            }
            
        except Exception as e:
            logger.log_error('get_database_status_error', str(e))
            return {'status': 'error', 'error': str(e)}
    
    def _get_application_status(self):
        """获取应用状态"""
        try:
            # 获取最近的活动统计
            now = datetime.now()
            today = now.date()
            week_ago = now - timedelta(days=7)
            
            # 今日统计
            today_cases = Case.query.filter(
                db.func.date(Case.created_at) == today
            ).count()
            
            today_interactions = CaseInteraction.query.filter(
                db.func.date(CaseInteraction.created_at) == today
            ).count()
            
            # 本周统计
            week_cases = Case.query.filter(
                Case.created_at >= week_ago
            ).count()
            
            week_interactions = CaseInteraction.query.filter(
                CaseInteraction.created_at >= week_ago
            ).count()
            
            return {
                'today': {
                    'cases_created': today_cases,
                    'interactions': today_interactions
                },
                'week': {
                    'cases_created': week_cases,
                    'interactions': week_interactions
                },
                'uptime': self._get_uptime()
            }
            
        except Exception as e:
            logger.log_error('get_application_status_error', str(e))
            return {}
    
    def _get_uptime(self):
        """获取运行时间"""
        try:
            uptime_seconds = time.time() - psutil.boot_time()
            uptime_hours = uptime_seconds / 3600
            uptime_days = uptime_hours / 24
            
            return {
                'seconds': uptime_seconds,
                'hours': uptime_hours,
                'days': uptime_days
            }
        except Exception as e:
            logger.log_error('get_uptime_error', str(e))
            return {}
    
    def _check_alerts(self):
        """检查告警"""
        alerts = []
        
        try:
            system_info = self._get_system_info()
            
            # CPU使用率告警
            if system_info.get('cpu_percent', 0) > self.alert_thresholds['cpu_usage']:
                alerts.append({
                    'type': 'cpu_usage',
                    'level': 'warning',
                    'message': f"CPU使用率过高: {system_info['cpu_percent']:.1f}%",
                    'value': system_info['cpu_percent']
                })
            
            # 内存使用率告警
            memory_percent = system_info.get('memory', {}).get('percent', 0)
            if memory_percent > self.alert_thresholds['memory_usage']:
                alerts.append({
                    'type': 'memory_usage',
                    'level': 'warning',
                    'message': f"内存使用率过高: {memory_percent:.1f}%",
                    'value': memory_percent
                })
            
            # 磁盘使用率告警
            disk_percent = system_info.get('disk', {}).get('percent', 0)
            if disk_percent > self.alert_thresholds['disk_usage']:
                alerts.append({
                    'type': 'disk_usage',
                    'level': 'critical',
                    'message': f"磁盘使用率过高: {disk_percent:.1f}%",
                    'value': disk_percent
                })
            
            # 数据库响应时间告警
            db_status = self._get_database_status()
            db_time = db_status.get('connection_time', 0)
            if db_time > self.alert_thresholds['response_time']:
                alerts.append({
                    'type': 'database_response',
                    'level': 'warning',
                    'message': f"数据库响应时间过长: {db_time:.2f}秒",
                    'value': db_time
                })
            
        except Exception as e:
            logger.log_error('check_alerts_error', str(e))
            alerts.append({
                'type': 'system_error',
                'level': 'critical',
                'message': f"系统监控错误: {str(e)}",
                'value': 0
            })
        
        return alerts
    
    def get_performance_report(self, days=7):
        """获取性能报告"""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # 获取时间范围内的数据
            cases = Case.query.filter(
                Case.created_at >= start_date,
                Case.created_at <= end_date
            ).all()
            
            interactions = CaseInteraction.query.filter(
                CaseInteraction.created_at >= start_date,
                CaseInteraction.created_at <= end_date
            ).all()
            
            # 按天统计
            daily_stats = {}
            for i in range(days):
                date = (start_date + timedelta(days=i)).date()
                daily_stats[date.isoformat()] = {
                    'cases': 0,
                    'interactions': 0,
                    'likes': 0,
                    'makes': 0,
                    'views': 0,
                    'shares': 0
                }
            
            # 统计案例
            for case in cases:
                date_str = case.created_at.date().isoformat()
                if date_str in daily_stats:
                    daily_stats[date_str]['cases'] += 1
            
            # 统计互动
            for interaction in interactions:
                date_str = interaction.created_at.date().isoformat()
                if date_str in daily_stats:
                    daily_stats[date_str]['interactions'] += 1
                    daily_stats[date_str][interaction.interaction_type] += 1
            
            # 计算趋势
            trends = self._calculate_trends(daily_stats)
            
            return {
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat(),
                    'days': days
                },
                'daily_stats': daily_stats,
                'trends': trends,
                'summary': self._calculate_summary(daily_stats)
            }
            
        except Exception as e:
            logger.log_error('get_performance_report_error', str(e))
            return {'error': str(e)}
    
    def _calculate_trends(self, daily_stats):
        """计算趋势"""
        try:
            dates = sorted(daily_stats.keys())
            if len(dates) < 2:
                return {}
            
            trends = {}
            for metric in ['cases', 'interactions', 'likes', 'makes', 'views', 'shares']:
                values = [daily_stats[date][metric] for date in dates]
                if len(values) >= 2:
                    # 计算增长率
                    growth_rate = (values[-1] - values[0]) / values[0] if values[0] > 0 else 0
                    trends[metric] = {
                        'growth_rate': growth_rate,
                        'trend': 'increasing' if growth_rate > 0.1 else 'decreasing' if growth_rate < -0.1 else 'stable'
                    }
            
            return trends
            
        except Exception as e:
            logger.log_error('calculate_trends_error', str(e))
            return {}
    
    def _calculate_summary(self, daily_stats):
        """计算汇总统计"""
        try:
            total_cases = sum(stats['cases'] for stats in daily_stats.values())
            total_interactions = sum(stats['interactions'] for stats in daily_stats.values())
            total_likes = sum(stats['likes'] for stats in daily_stats.values())
            total_makes = sum(stats['makes'] for stats in daily_stats.values())
            total_views = sum(stats['views'] for stats in daily_stats.values())
            total_shares = sum(stats['shares'] for stats in daily_stats.values())
            
            return {
                'total_cases': total_cases,
                'total_interactions': total_interactions,
                'total_likes': total_likes,
                'total_makes': total_makes,
                'total_views': total_views,
                'total_shares': total_shares,
                'avg_daily_cases': total_cases / len(daily_stats) if daily_stats else 0,
                'avg_daily_interactions': total_interactions / len(daily_stats) if daily_stats else 0
            }
            
        except Exception as e:
            logger.log_error('calculate_summary_error', str(e))
            return {}
    
    def log_system_metrics(self):
        """记录系统指标"""
        try:
            status = self.get_system_status()
            
            logger.log_operation('system_metrics', 'monitoring', None, {
                'cpu_percent': status.get('system', {}).get('cpu_percent', 0),
                'memory_percent': status.get('system', {}).get('memory', {}).get('percent', 0),
                'disk_percent': status.get('system', {}).get('disk', {}).get('percent', 0),
                'alerts_count': len(status.get('alerts', []))
            })
            
        except Exception as e:
            logger.log_error('log_system_metrics_error', str(e))

# 全局系统监控器实例
system_monitor = SystemMonitor()
