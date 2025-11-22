# utils/device_middleware.py
"""
设备ID验证中间件
"""

from functools import wraps
from flask import request, jsonify, current_app
from utils.models import DeviceSession, db
from utils.logger import logger

def require_device_id(f):
    """设备ID验证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        device_id = request.headers.get('X-Device-ID')
        
        if not device_id:
            logger.log_error('device_id_missing', 'Missing device ID in request headers')
            return jsonify({'success': False, 'error': '缺少设备ID'}), 400
        
        # 验证设备ID格式
        if not DeviceSession.validate_device_id(device_id):
            logger.log_error('device_id_invalid', f'Invalid device ID format: {device_id}')
            return jsonify({'success': False, 'error': '无效的设备ID格式'}), 400
        
        # 更新或创建设备会话
        try:
            device_session = DeviceSession.query.filter_by(device_id=device_id).first()
            
            if device_session:
                # 更新现有会话
                device_session.last_seen = db.func.now()
                device_session.is_active = True
            else:
                # 创建新会话
                device_session = DeviceSession(
                    device_id=device_id,
                    ip_address=request.remote_addr,
                    user_agent=request.headers.get('User-Agent'),
                    first_seen=db.func.now(),
                    last_seen=db.func.now(),
                    is_active=True
                )
                db.session.add(device_session)
            
            db.session.commit()
            
            # 检查设备是否活跃
            if not device_session.is_active:
                logger.log_error('device_inactive', f'Inactive device: {device_id}')
                return jsonify({'success': False, 'error': '设备已停用'}), 403
            
        except Exception as e:
            logger.log_error('device_session_error', str(e))
            return jsonify({'success': False, 'error': '设备会话管理失败'}), 500
        
        # 将设备ID添加到请求上下文
        request.device_id = device_id
        
        return f(*args, **kwargs)
    
    return decorated_function

def optional_device_id(f):
    """可选设备ID验证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        device_id = request.headers.get('X-Device-ID')
        
        if device_id:
            # 验证设备ID格式
            if not DeviceSession.validate_device_id(device_id):
                logger.log_error('device_id_invalid', f'Invalid device ID format: {device_id}')
                return jsonify({'success': False, 'error': '无效的设备ID格式'}), 400
            
            # 更新或创建设备会话
            try:
                device_session = DeviceSession.query.filter_by(device_id=device_id).first()
                
                if device_session:
                    # 更新现有会话
                    device_session.last_seen = db.func.now()
                    device_session.is_active = True
                else:
                    # 创建新会话
                    device_session = DeviceSession(
                        device_id=device_id,
                        ip_address=request.remote_addr,
                        user_agent=request.headers.get('User-Agent'),
                        first_seen=db.func.now(),
                        last_seen=db.func.now(),
                        is_active=True
                    )
                    db.session.add(device_session)
                
                db.session.commit()
                
                # 检查设备是否活跃
                if not device_session.is_active:
                    logger.log_error('device_inactive', f'Inactive device: {device_id}')
                    return jsonify({'success': False, 'error': '设备已停用'}), 403
                
            except Exception as e:
                logger.log_error('device_session_error', str(e))
                return jsonify({'success': False, 'error': '设备会话管理失败'}), 500
        
        # 将设备ID添加到请求上下文
        request.device_id = device_id
        
        return f(*args, **kwargs)
    
    return decorated_function

def get_device_id_from_request():
    """从请求中获取设备ID"""
    return getattr(request, 'device_id', None)

def validate_device_access(model_class, record_id, device_id):
    """验证设备对记录的访问权限"""
    try:
        record = model_class.query.get(record_id)
        if not record:
            return False, "记录不存在"
        
        if hasattr(record, 'device_id') and record.device_id != device_id:
            return False, "无权访问此记录"
        
        return True, "访问权限验证通过"
    
    except Exception as e:
        logger.log_error('device_access_validation_error', str(e))
        return False, "访问权限验证失败"
