# utils/order_service.py - 订单服务
from flask import request
from utils.models import Order, db
import json
from datetime import datetime

# utils/order_service.py - 订单服务
from flask import request
from utils.models import Order, Case, db
import json
from datetime import datetime

def create_order_record(params, output_path, device_id=None):
    """创建订单记录"""
    from flask import current_app, request
    
    order_no = Order.generate_order_no()
    
    # 计算价格
    quantity = params.get('quantity', 1)
    unit_price = current_app.config['DEFAULT_PRICE']
    total_price = unit_price * quantity
    
    # 创建数据库订单记录
    order = Order(
        order_no=order_no,
        device_id=device_id,
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent'),
        original_image_path=params['image']['original_path'],
        processed_image_path=output_path,
        preview_image_path=params['image'].get('preview_path', ''),
        quantity=quantity,
        unit_price=unit_price,
        total_price=total_price,
        status='processing',
        notes=json.dumps({
            'image': params['image'],
            'edit_params': params['edit_params'],
            'baji_specs': params['baji_specs'],
            'user_preferences': params['user_preferences']
        })
    )
    
    db.session.add(order)
    db.session.commit()
    
    # 记录操作日志
    from utils.logger import logger
    logger.log_operation('create_order', 'orders', order.id, {
        'order_no': order_no,
        'quantity': quantity,
        'total_price': float(total_price)
    }, request.remote_addr, request.headers.get('User-Agent'))
    
    return order.to_dict()

def create_case_from_order(order_id):
    """从订单创建案例"""
    order = Order.query.get(order_id)
    if not order:
        return None
    
    # 检查是否已经创建过案例
    existing_case = Case.query.filter_by(order_id=order_id).first()
    if existing_case:
        return existing_case
    
    # 创建案例
    case = Case.create_from_order(order)
    db.session.add(case)
    db.session.commit()
    
    # 记录操作日志
    from utils.logger import logger
    logger.log_operation('create_case', 'cases', case.id, {
        'case_no': case.case_no,
        'order_id': order_id,
        'title': case.title
    }, order.ip_address, order.user_agent)
    
    return case

def auto_create_case_on_completion(order_id):
    """订单完成时自动创建案例"""
    order = Order.query.get(order_id)
    if order and order.status == 'completed':
        return create_case_from_order(order_id)
    return None

def get_order_by_no(order_no):
    """根据订单号获取订单"""
    order = Order.query.filter_by(order_no=order_no).first()
    if order:
        order_data = order.to_dict()
        if order.notes:
            notes_data = json.loads(order.notes)
            order_data.update(notes_data)
        return order_data
    return None

def update_order_status(order_id, new_status):
    """更新订单状态"""
    order = Order.query.get(order_id)
    if order:
        old_status = order.status
        order.status = new_status
        order.updated_at = datetime.utcnow()
        
        # 记录操作日志
        from utils.logger import logger
        logger.log_operation('update_order_status', 'orders', order_id, {
            'old_status': old_status,
            'new_status': new_status
        }, order.ip_address, order.user_agent)
        
        # 如果订单完成，自动创建案例
        if new_status == 'completed':
            auto_create_case_on_completion(order_id)
        
        db.session.commit()
        return True
    return False
