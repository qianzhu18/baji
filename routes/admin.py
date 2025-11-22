# routes/admin.py - 管理端API路由
import os
import json
from flask import Blueprint, request, jsonify, session, current_app
from functools import wraps
from datetime import datetime, timedelta
from utils.models import Order, Coupon, SystemConfig, Case, CaseInteraction, DeviceSession, PrintJob, db
from utils.logger import logger
from utils.security_auditor import security_auditor
from utils.system_monitor import system_monitor
from utils.performance_optimizer import performance_optimizer

admin_bp = Blueprint('admin', __name__, url_prefix='/api/v1/admin')

def require_admin_login(f):
    """管理员登录验证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_logged_in' not in session:
            return jsonify({'error': '需要登录'}), 401
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/login', methods=['POST'])
def admin_login():
    """管理员登录"""
    try:
        data = request.get_json()
        password = data.get('password')
        
        admin_password = current_app.config['ADMIN_PASSWORD']
        if password == admin_password:
            session['admin_logged_in'] = True
            session['login_time'] = datetime.utcnow().isoformat()
            
            # 记录管理员登录
            security_auditor.log_admin_action('LOGIN', 'admin', {
                'login_time': session['login_time']
            })
            
            return jsonify({'success': True})
        else:
            # 记录登录失败
            security_auditor.log_security_violation('ADMIN_LOGIN_FAILED', {
                'attempted_password': password[:3] + '***' if password else 'None'
            })
            return jsonify({'error': '密码错误'}), 401
            
    except Exception as e:
        current_app.logger.error(f"管理员登录失败: {str(e)}")
        return jsonify({'error': '登录失败'}), 500

@admin_bp.route('/logout', methods=['POST'])
def admin_logout():
    """管理员登出"""
    session.pop('admin_logged_in', None)
    session.pop('login_time', None)
    return jsonify({'success': True})

@admin_bp.route('/check', methods=['GET'])
def check_admin_login():
    """检查登录状态"""
    if 'admin_logged_in' in session:
        return jsonify({'logged_in': True, 'login_time': session.get('login_time')})
    else:
        return jsonify({'logged_in': False})

@admin_bp.route('/orders', methods=['GET'])
@require_admin_login
def get_admin_orders():
    """获取订单列表"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        payment_status = request.args.get('payment_status')  # 添加支付状态筛选
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        ip_address = request.args.get('ip_address')
        device_id = request.args.get('device_id')  # 添加设备ID筛选
        
        query = Order.query
        if status:
            query = query.filter(Order.status == status)
        if payment_status:  # 添加支付状态筛选
            query = query.filter(Order.payment_status == payment_status)
        if start_date:
            query = query.filter(Order.created_at >= start_date)
        if end_date:
            query = query.filter(Order.created_at <= end_date)
        if ip_address:
            query = query.filter(Order.ip_address == ip_address)
        if device_id:  # 添加设备ID筛选
            query = query.filter(Order.device_id == device_id)
        
        orders = query.order_by(Order.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'orders': [order.to_dict() for order in orders.items],
            'total': orders.total,
            'pages': orders.pages,
            'current_page': page
        })
        
    except Exception as e:
        current_app.logger.error(f"获取订单列表失败: {str(e)}")
        return jsonify({'error': '获取订单列表失败'}), 500

@admin_bp.route('/orders/<int:order_id>/status', methods=['PUT'])
@require_admin_login
def update_order_status(order_id):
    """更新订单状态"""
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({'error': '缺少状态参数'}), 400
        
        order = Order.query.get_or_404(order_id)
        old_status = order.status
        order.status = new_status
        order.updated_at = datetime.utcnow()
        
        # 记录操作日志
        log_operation_local('update_order_status', 'orders', order_id, {
            'old_status': old_status,
            'new_status': new_status
        })
        
        db.session.commit()
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"更新订单状态失败: {str(e)}")
        return jsonify({'error': '更新订单状态失败'}), 500

@admin_bp.route('/coupons', methods=['POST'])
@require_admin_login
def generate_coupons():
    """生成券码"""
    try:
        data = request.get_json()
        quantity = data.get('quantity', 1)
        discount_type = data.get('discount_type', 'fixed')
        discount_value = data.get('discount_value')
        min_order_amount = data.get('min_order_amount', 0)
        valid_days = data.get('valid_days', 30)
        usage_limit = data.get('usage_limit', 1)
        
        if not discount_value:
            return jsonify({'error': '缺少折扣值'}), 400
        
        coupons = []
        for i in range(quantity):
            code = Coupon.generate_code()
            valid_until = datetime.utcnow() + timedelta(days=valid_days)
            
            coupon = Coupon(
                code=code,
                amount=discount_value,  # 设置 amount 字段
                discount_type=discount_type,
                discount_value=discount_value,
                min_order_amount=min_order_amount,
                usage_limit=usage_limit,
                valid_until=valid_until
            )
            coupons.append(coupon)
            db.session.add(coupon)
        
        db.session.commit()
        
        # 记录操作日志
        log_operation_local('generate_coupons', 'coupons', None, {
            'quantity': quantity,
            'discount_type': discount_type,
            'discount_value': float(discount_value)
        })
        
        return jsonify({
            'success': True,
            'coupons': [coupon.to_dict() for coupon in coupons]
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"生成券码失败: {str(e)}")
        return jsonify({'error': '生成券码失败'}), 500

@admin_bp.route('/coupons', methods=['GET'])
@require_admin_login
def get_coupons():
    """获取券码列表"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')  # active, used, expired
        
        query = Coupon.query
        if status == 'active':
            query = query.filter(Coupon.is_active == True)
        elif status == 'used':
            query = query.filter(Coupon.used_count > 0)
        elif status == 'expired':
            query = query.filter(Coupon.valid_until < datetime.utcnow())
        
        coupons = query.order_by(Coupon.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'coupons': [coupon.to_dict() for coupon in coupons.items],
            'total': coupons.total,
            'pages': coupons.pages,
            'current_page': page
        })
        
    except Exception as e:
        current_app.logger.error(f"获取券码列表失败: {str(e)}")
        return jsonify({'error': '获取券码列表失败'}), 500

@admin_bp.route('/export/pdf', methods=['POST'])
@require_admin_login
def export_pdf():
    """导出PDF"""
    try:
        data = request.get_json()
        order_ids = data.get('order_ids', [])
        pdf_format = data.get('format', 'a4_6')
        baji_size = data.get('size', '68x68')
        
        # 如果指定了筛选状态为printing，则只导出打印中状态的订单
        filter_status = data.get('filter_status')
        auto_complete = data.get('auto_complete', False)  # 是否自动标记为完成
        
        if filter_status == 'printing':
            # 获取所有打印中状态的打印任务对应的订单
            printing_jobs = PrintJob.query.filter(
                PrintJob.status == 'printing'
            ).all()
            order_ids = [job.order_id for job in printing_jobs]
            print(f"找到 {len(printing_jobs)} 个打印中的任务，对应订单ID: {order_ids}")
        elif not order_ids:
            # 如果没有指定订单ID且没有指定筛选状态，获取所有处理中且已支付的订单
            orders = Order.query.filter(
                Order.status == 'processing',
                Order.payment_status == 'paid'
            ).all()
            order_ids = [order.id for order in orders]
        
        # 获取对应的订单（打印中的订单可能是处理中或待打印状态）
        orders = Order.query.filter(
            Order.id.in_(order_ids),
            Order.payment_status == 'paid'  # 只要求已支付
        ).all()
        order_ids = [order.id for order in orders]
        
        # 检查是否有订单可以导出
        if not order_ids:
            if filter_status == 'printing':
                return jsonify({
                    'success': False,
                    'error': '没有找到打印中状态的订单。请先在打印管理页面将订单设置为打印中状态。'
                }), 400
            else:
                return jsonify({
                    'success': False,
                    'error': '没有符合条件的订单可以导出。请确保有已支付的订单。'
                }), 400
        
        # 生成PDF
        from utils.pdf_generator import PDFGenerator
        generator = PDFGenerator()
        pdf_path = generator.generate_baji_pdf(order_ids, pdf_format, baji_size)
        
        # 如果启用了自动完成，更新打印任务和订单状态
        exported_count = 0
        if auto_complete and filter_status == 'printing':
            for order_id in order_ids:
                # 更新打印任务状态为已完成
                print_jobs = PrintJob.query.filter(
                    PrintJob.order_id == order_id,
                    PrintJob.status == 'printing'
                ).all()
                
                for print_job in print_jobs:
                    print_job.status = 'completed'
                    print_job.completed_at = datetime.utcnow()
                    print_job.updated_at = datetime.utcnow()
                
                # 更新订单状态为已打印
                order = Order.query.get(order_id)
                if order:
                    order.status = 'printed'  # 新增已打印状态
                    order.updated_at = datetime.utcnow()
                    exported_count += 1
            
            db.session.commit()
        
        # 记录操作日志
        log_operation_local('export_pdf', 'orders', None, {
            'order_count': len(order_ids),
            'pdf_format': pdf_format,
            'baji_size': baji_size,
            'exported_count': exported_count if auto_complete else len(order_ids)
        })
        
        return jsonify({
            'success': True,
            'pdf_path': os.path.basename(pdf_path),
            'download_url': f'/api/v1/admin/download/{os.path.basename(pdf_path)}',
            'exported_count': exported_count if auto_complete else len(order_ids)
        })
        
    except Exception as e:
        current_app.logger.error(f"导出PDF失败: {str(e)}")
        import traceback
        current_app.logger.error(f"详细错误: {traceback.format_exc()}")
        return jsonify({'error': '导出PDF失败'}), 500

@admin_bp.route('/export/preview', methods=['POST'])
@require_admin_login
def export_preview():
    """导出预览"""
    try:
        data = request.get_json()
        order_ids = data.get('order_ids', [])
        pdf_format = data.get('format', 'a4_6')
        baji_size = data.get('size', '68x68')
        
        if not order_ids:
            # 获取所有待处理订单
            orders = Order.query.filter(Order.status == 'processing').all()
            order_ids = [order.id for order in orders]
        
        # 生成预览PDF
        from utils.pdf_generator import PDFGenerator
        generator = PDFGenerator()
        pdf_path = generator.generate_preview(order_ids, pdf_format)
        
        # 记录操作日志
        log_operation_local('export_preview', 'orders', None, {
            'order_count': len(order_ids),
            'pdf_format': pdf_format,
            'baji_size': baji_size
        })
        
        return jsonify({
            'success': True,
            'pdf_path': os.path.basename(pdf_path),
            'preview_url': f'/api/v1/admin/download/{os.path.basename(pdf_path)}'
        })
        
    except Exception as e:
        current_app.logger.error(f"导出预览失败: {str(e)}")
        import traceback
        current_app.logger.error(f"详细错误: {traceback.format_exc()}")
        return jsonify({'error': '导出预览失败'}), 500


@admin_bp.route('/download/<filename>')
@require_admin_login
def download_file(filename):
    """下载文件"""
    try:
        # 构建文件路径 - 修复路径问题
        # Flask的root_path是config目录，需要回到项目根目录
        project_root = os.path.dirname(current_app.root_path)
        file_path = os.path.join(project_root, 'static', 'exports', filename)
        
        # 检查文件是否存在
        if os.path.exists(file_path):
            # 记录文件下载事件
            security_auditor.log_file_download(filename, file_path, 'admin')
            
            from flask import send_file
            return send_file(file_path, as_attachment=True, download_name=filename)
        else:
            # 记录文件不存在事件
            security_auditor.log_security_violation('FILE_NOT_FOUND', {
                'filename': filename,
                'requested_path': file_path
            })
            return jsonify({'error': '文件不存在'}), 404
    except Exception as e:
        current_app.logger.error(f"下载文件失败: {str(e)}")
        return jsonify({'error': '下载文件失败'}), 500

@admin_bp.route('/orders/<int:order_id>', methods=['PUT'])
@require_admin_login
def update_order(order_id):
    """更新订单信息"""
    try:
        data = request.get_json()
        order = Order.query.get_or_404(order_id)
        
        # 更新订单信息
        if 'notes' in data:
            order.notes = data['notes']
        if 'quantity' in data:
            order.quantity = data['quantity']
        
        order.updated_at = datetime.utcnow()
        
        # 记录操作日志
        log_operation_local('update_order', 'orders', order_id, data)
        
        db.session.commit()
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"更新订单信息失败: {str(e)}")
        return jsonify({'error': '更新订单信息失败'}), 500

@admin_bp.route('/orders/batch', methods=['PUT'])
@require_admin_login
def batch_update_orders():
    """批量更新订单"""
    try:
        data = request.get_json()
        order_ids = data.get('order_ids', [])
        update_data = data.get('update_data', {})
        
        if not order_ids:
            return jsonify({'error': '缺少订单ID列表'}), 400
        
        # 批量更新订单
        updated_count = 0
        for order_id in order_ids:
            order = Order.query.get(order_id)
            if order:
                if 'status' in update_data:
                    order.status = update_data['status']
                if 'notes' in update_data:
                    order.notes = update_data['notes']
                if 'quantity' in update_data:
                    order.quantity = update_data['quantity']
                
                order.updated_at = datetime.utcnow()
                updated_count += 1
        
        # 记录操作日志
        log_operation_local('batch_update_orders', 'orders', None, {
            'order_count': len(order_ids),
            'updated_count': updated_count,
            'update_data': update_data
        })
        
        db.session.commit()
        return jsonify({
            'success': True,
            'updated_count': updated_count
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"批量更新订单失败: {str(e)}")
        return jsonify({'error': '批量更新订单失败'}), 500

@admin_bp.route('/orders/batch', methods=['DELETE'])
@require_admin_login
def batch_delete_orders():
    """批量删除订单"""
    try:
        data = request.get_json()
        order_ids = data.get('order_ids', [])
        
        if not order_ids:
            return jsonify({'error': '缺少订单ID列表'}), 400
        
        # 批量删除订单
        deleted_count = 0
        deleted_print_jobs_count = 0
        
        for order_id in order_ids:
            order = Order.query.get(order_id)
            if order:
                # 先删除相关的打印任务
                print_jobs = PrintJob.query.filter_by(order_id=order_id).all()
                for print_job in print_jobs:
                    db.session.delete(print_job)
                    deleted_print_jobs_count += 1
                
                # 删除相关文件
                if order.original_image_path and os.path.exists(order.original_image_path):
                    try:
                        os.remove(order.original_image_path)
                    except Exception as e:
                        current_app.logger.warning(f"删除原始图片失败: {str(e)}")
                
                if order.processed_image_path and os.path.exists(order.processed_image_path):
                    try:
                        os.remove(order.processed_image_path)
                    except Exception as e:
                        current_app.logger.warning(f"删除处理后图片失败: {str(e)}")
                
                if order.preview_image_path and os.path.exists(order.preview_image_path):
                    try:
                        os.remove(order.preview_image_path)
                    except Exception as e:
                        current_app.logger.warning(f"删除预览图片失败: {str(e)}")
                
                db.session.delete(order)
                deleted_count += 1
        
        # 记录操作日志
        log_operation_local('batch_delete_orders', 'orders', None, {
            'order_count': len(order_ids),
            'deleted_count': deleted_count,
            'deleted_print_jobs_count': deleted_print_jobs_count
        })
        
        db.session.commit()
        return jsonify({
            'success': True,
            'deleted_count': deleted_count,
            'deleted_print_jobs_count': deleted_print_jobs_count
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"批量删除订单失败: {str(e)}")
        return jsonify({'error': '批量删除订单失败'}), 500

@admin_bp.route('/orders/<int:order_id>/print', methods=['POST'])
@require_admin_login
def print_order(order_id):
    """创建打印任务"""
    try:
        data = request.get_json()
        order = Order.query.get_or_404(order_id)
        
        # 检查订单状态，只有已支付的订单才能打印
        if order.payment_status != 'paid':
            return jsonify({'error': '只有已支付的订单才能打印'}), 400
        
        # 检查是否已经有待处理的打印任务
        existing_job = PrintJob.query.filter(
            PrintJob.order_id == order_id,
            PrintJob.status.in_(['pending', 'printing'])
        ).first()
        
        if existing_job:
            return jsonify({'error': '该订单已有待处理的打印任务'}), 400
        
        # 创建打印任务
        print_job = PrintJob(
            print_job_no=PrintJob.generate_print_job_no(),
            order_id=order_id,
            order_no=order.order_no,
            device_id=order.device_id,
            quantity=data.get('quantity', order.quantity),
            status='pending',
            print_type='single',
            print_settings=json.dumps({
                'format': 'a4_6',
                'size': '68x68',
                'quality': 'high'
            }),
            created_by='admin',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        db.session.add(print_job)
        
        # 更新订单状态为处理中（如果还是待处理状态）
        if order.status == 'pending':
            order.status = 'processing'
            order.updated_at = datetime.utcnow()
        
        # 记录操作日志
        log_operation_local('create_print_job', 'print_jobs', print_job.id, {
            'order_no': order.order_no,
            'print_job_no': print_job.print_job_no,
            'quantity': print_job.quantity
        })
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'print_job': print_job.to_dict(),
            'message': '打印任务创建成功'
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"创建打印任务失败: {str(e)}")
        return jsonify({'error': '创建打印任务失败'}), 500

@admin_bp.route('/orders/<int:order_id>', methods=['DELETE'])
@require_admin_login
def delete_order(order_id):
    """删除订单"""
    try:
        order = Order.query.get_or_404(order_id)
        
        # 先删除相关的打印任务
        print_jobs = PrintJob.query.filter_by(order_id=order_id).all()
        for print_job in print_jobs:
            db.session.delete(print_job)
        
        # 删除相关文件
        if order.original_image_path and os.path.exists(order.original_image_path):
            try:
                os.remove(order.original_image_path)
            except Exception as e:
                current_app.logger.warning(f"删除原始图片失败: {str(e)}")
        
        if order.processed_image_path and os.path.exists(order.processed_image_path):
            try:
                os.remove(order.processed_image_path)
            except Exception as e:
                current_app.logger.warning(f"删除处理后图片失败: {str(e)}")
        
        if order.preview_image_path and os.path.exists(order.preview_image_path):
            try:
                os.remove(order.preview_image_path)
            except Exception as e:
                current_app.logger.warning(f"删除预览图片失败: {str(e)}")
        
        # 记录操作日志
        log_operation_local('delete_order', 'orders', order_id, {
            'order_no': order.order_no,
            'deleted_print_jobs': len(print_jobs)
        })
        
        # 删除订单
        db.session.delete(order)
        db.session.commit()
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"删除订单失败: {str(e)}")
        return jsonify({'error': '删除订单失败'}), 500

@admin_bp.route('/orders/batch', methods=['POST'])
@require_admin_login
def batch_orders():
    """批量操作订单"""
    try:
        data = request.get_json()
        action = data.get('action')
        order_ids = data.get('order_ids', [])
        
        if not action or not order_ids:
            return jsonify({'error': '缺少必要参数'}), 400
        
        affected_count = 0
        
        if action == 'delete':
            for order_id in order_ids:
                order = Order.query.get(order_id)
                if order:
                    # 先删除相关的打印任务
                    print_jobs = PrintJob.query.filter_by(order_id=order_id).all()
                    for print_job in print_jobs:
                        db.session.delete(print_job)
                    
                    # 删除相关文件
                    if order.original_image_path and os.path.exists(order.original_image_path):
                        try:
                            os.remove(order.original_image_path)
                        except Exception as e:
                            current_app.logger.warning(f"删除原始图片失败: {str(e)}")
                    
                    if order.processed_image_path and os.path.exists(order.processed_image_path):
                        try:
                            os.remove(order.processed_image_path)
                        except Exception as e:
                            current_app.logger.warning(f"删除处理后图片失败: {str(e)}")
                    
                    if order.preview_image_path and os.path.exists(order.preview_image_path):
                        try:
                            os.remove(order.preview_image_path)
                        except Exception as e:
                            current_app.logger.warning(f"删除预览图片失败: {str(e)}")
                    
                    db.session.delete(order)
                    affected_count += 1
        
        elif action == 'update_status':
            new_status = data.get('status')
            if not new_status:
                return jsonify({'error': '缺少状态参数'}), 400
            
            for order_id in order_ids:
                order = Order.query.get(order_id)
                if order:
                    order.status = new_status
                    order.updated_at = datetime.utcnow()
                    affected_count += 1
        
        # 记录操作日志
        log_operation_local('batch_orders', 'orders', None, {
            'action': action,
            'order_count': len(order_ids),
            'affected_count': affected_count
        })
        
        db.session.commit()
        return jsonify({
            'success': True,
            'affected_count': affected_count
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"批量操作订单失败: {str(e)}")
        return jsonify({'error': '批量操作订单失败'}), 500

@admin_bp.route('/coupons/<int:coupon_id>')
@require_admin_login
def get_coupon_detail(coupon_id):
    """获取券码详情"""
    try:
        coupon = Coupon.query.get(coupon_id)
        
        if coupon:
            return jsonify({
                'success': True,
                'coupon': coupon.to_dict()
            })
        else:
            return jsonify({'success': False, 'error': '券码不存在'}), 404
            
    except Exception as e:
        current_app.logger.error(f"获取券码详情失败: {str(e)}")
        return jsonify({'error': '获取券码详情失败'}), 500

@admin_bp.route('/coupons/<int:coupon_id>', methods=['PUT'])
@require_admin_login
def update_coupon(coupon_id):
    """更新券码信息"""
    try:
        data = request.get_json()
        coupon = Coupon.query.get_or_404(coupon_id)
        
        # 更新券码信息
        if 'is_active' in data:
            coupon.is_active = data['is_active']
        if 'discount_value' in data:
            coupon.discount_value = data['discount_value']
        if 'min_order_amount' in data:
            coupon.min_order_amount = data['min_order_amount']
        if 'usage_limit' in data:
            coupon.usage_limit = data['usage_limit']
        
        coupon.updated_at = datetime.utcnow()
        
        # 记录操作日志
        log_operation_local('update_coupon', 'coupons', coupon_id, data)
        
        db.session.commit()
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"更新券码信息失败: {str(e)}")
        return jsonify({'error': '更新券码信息失败'}), 500

@admin_bp.route('/coupons/<int:coupon_id>', methods=['DELETE'])
@require_admin_login
def delete_coupon(coupon_id):
    """删除券码"""
    try:
        coupon = Coupon.query.get_or_404(coupon_id)
        
        # 记录操作日志
        log_operation_local('delete_coupon', 'coupons', coupon_id, {
            'code': coupon.code
        })
        
        db.session.delete(coupon)
        db.session.commit()
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"删除券码失败: {str(e)}")
        return jsonify({'error': '删除券码失败'}), 500

@admin_bp.route('/coupons/batch', methods=['PUT'])
@require_admin_login
def batch_update_coupons():
    """批量更新券码"""
    try:
        data = request.get_json()
        coupon_ids = data.get('coupon_ids', [])
        update_data = data.get('update_data', {})
        
        if not coupon_ids:
            return jsonify({'error': '缺少券码ID列表'}), 400
        
        # 批量更新券码
        updated_count = 0
        for coupon_id in coupon_ids:
            coupon = Coupon.query.get(coupon_id)
            if coupon:
                if 'is_active' in update_data:
                    coupon.is_active = update_data['is_active']
                if 'discount_value' in update_data:
                    coupon.discount_value = update_data['discount_value']
                if 'min_order_amount' in update_data:
                    coupon.min_order_amount = update_data['min_order_amount']
                if 'usage_limit' in update_data:
                    coupon.usage_limit = update_data['usage_limit']
                
                updated_count += 1
        
        # 记录操作日志
        log_operation_local('batch_update_coupons', 'coupons', None, {
            'coupon_count': len(coupon_ids),
            'updated_count': updated_count,
            'update_data': update_data
        })
        
        db.session.commit()
        return jsonify({
            'success': True,
            'updated_count': updated_count
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"批量更新券码失败: {str(e)}")
        return jsonify({'error': '批量更新券码失败'}), 500

@admin_bp.route('/coupons/batch', methods=['DELETE'])
@require_admin_login
def batch_delete_coupons():
    """批量删除券码"""
    try:
        data = request.get_json()
        coupon_ids = data.get('coupon_ids', [])
        
        if not coupon_ids:
            return jsonify({'error': '缺少券码ID列表'}), 400
        
        # 批量删除券码
        deleted_count = 0
        for coupon_id in coupon_ids:
            coupon = Coupon.query.get(coupon_id)
            if coupon:
                # 记录操作日志
                log_operation_local('delete_coupon', 'coupons', coupon_id, {
                    'code': coupon.code
                })
                
                db.session.delete(coupon)
                deleted_count += 1
        
        # 记录批量操作日志
        log_operation_local('batch_delete_coupons', 'coupons', None, {
            'coupon_count': len(coupon_ids),
            'deleted_count': deleted_count
        })
        
        db.session.commit()
        return jsonify({
            'success': True,
            'deleted_count': deleted_count
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"批量删除券码失败: {str(e)}")
        return jsonify({'error': '批量删除券码失败'}), 500

@admin_bp.route('/coupons/stats')
@require_admin_login
def get_coupon_stats():
    """获取券码统计"""
    try:
        total = Coupon.query.count()
        used = Coupon.query.filter(Coupon.used_count > 0).count()
        active = Coupon.query.filter(Coupon.is_active == True).count()
        expired = Coupon.query.filter(Coupon.valid_until < datetime.utcnow()).count()
        
        return jsonify({
            'total': total,
            'used': used,
            'active': active,
            'expired': expired
        })
        
    except Exception as e:
        current_app.logger.error(f"获取券码统计失败: {str(e)}")
        return jsonify({'error': '获取券码统计失败'}), 500

@admin_bp.route('/export/preview', methods=['POST'])
@require_admin_login
def preview_export():
    """预览导出效果"""
    try:
        data = request.get_json()
        order_ids = data.get('order_ids', [])
        pdf_format = data.get('format', 'a4_6')
        
        if not order_ids:
            # 获取所有待处理订单
            orders = Order.query.filter(Order.status == 'processing').all()
            order_ids = [order.id for order in orders]
        
        # 生成预览PDF
        from utils.pdf_generator import PDFGenerator
        generator = PDFGenerator()
        preview_path = generator.generate_preview(order_ids, pdf_format)
        
        return jsonify({
            'success': True,
            'preview_url': f'/api/v1/admin/download/{os.path.basename(preview_path)}'
        })
        
    except Exception as e:
        current_app.logger.error(f"预览导出失败: {str(e)}")
        return jsonify({'error': '预览导出失败'}), 500

@admin_bp.route('/export/history')
@require_admin_login
def get_export_history():
    """获取导出历史"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # 获取导出文件夹中的文件（支持基于日期的文件夹结构）
        export_folder = current_app.config['EXPORT_FOLDER']
        files = []
        
        # 遍历导出文件夹及其子文件夹
        for root, dirs, filenames in os.walk(export_folder):
            for filename in filenames:
                if filename.endswith('.pdf'):
                    file_path = os.path.join(root, filename)
                    stat = os.stat(file_path)
                    # 计算相对路径用于下载
                    rel_path = os.path.relpath(file_path, export_folder)
                    files.append({
                        'filename': filename,
                        'path': rel_path,
                        'size': stat.st_size,
                        'created_at': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        'download_url': f'/api/v1/admin/download/{rel_path.replace(os.sep, "/")}'
                    })
        
        # 按创建时间排序
        files.sort(key=lambda x: x['created_at'], reverse=True)
        
        # 分页
        start = (page - 1) * per_page
        end = start + per_page
        paginated_files = files[start:end]
        
        return jsonify({
            'exports': paginated_files,
            'total': len(files),
            'pages': (len(files) + per_page - 1) // per_page
        })
        
    except Exception as e:
        current_app.logger.error(f"获取导出历史失败: {str(e)}")
        return jsonify({'error': '获取导出历史失败'}), 500

@admin_bp.route('/delivery')
@require_admin_login
def get_delivery_list():
    """获取配送列表"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        order_no = request.args.get('order_no')  # 新增订单号筛选参数
        
        from utils.models import Delivery, Order
        import os
        
        query = Delivery.query
        
        if status:
            query = query.filter(Delivery.status == status)
        
        # 如果指定了订单号，需要先找到对应的订单ID
        if order_no:
            order = Order.query.filter_by(order_no=order_no).first()
            if order:
                # 查找包含该订单ID的配送记录
                query = query.filter(Delivery.order_ids.contains(str(order.id)))
            else:
                # 如果订单不存在，返回空结果
                return jsonify({
                    'success': True,
                    'deliveries': [],
                    'total': 0,
                    'pages': 0,
                    'current_page': page
                })
        
        deliveries = query.order_by(Delivery.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # 为每个配送单添加预览图信息
        deliveries_data = []
        for delivery in deliveries.items:
            delivery_dict = delivery.to_dict()
            
            # 获取关联订单的预览图
            preview_images = []
            if delivery.order_ids:
                try:
                    order_ids = [int(id.strip()) for id in delivery.order_ids.split(',') if id.strip()]
                    orders = Order.query.filter(Order.id.in_(order_ids)).all()
                    for order in orders:
                        if order.processed_image_path:
                            # 获取图片文件名
                            image_filename = os.path.basename(order.processed_image_path)
                            preview_images.append(f'/api/v1/image/{image_filename}')
                        elif order.original_image_path:
                            # 如果没有处理后的图片，使用原始图片
                            image_filename = os.path.basename(order.original_image_path)
                            preview_images.append(f'/api/v1/image/{image_filename}')
                except Exception as e:
                    current_app.logger.warning(f"获取配送单 {delivery.id} 的预览图失败: {str(e)}")
            
            delivery_dict['preview_images'] = preview_images
            deliveries_data.append(delivery_dict)
        
        return jsonify({
            'success': True,
            'deliveries': deliveries_data,
            'total': deliveries.total,
            'pages': deliveries.pages,
            'current_page': page
        })
        
    except Exception as e:
        current_app.logger.error(f"获取配送列表失败: {str(e)}")
        return jsonify({'error': '获取配送列表失败'}), 500

@admin_bp.route('/delivery/<int:delivery_id>')
@require_admin_login
def get_delivery_detail(delivery_id):
    """获取配送详情"""
    try:
        from utils.models import Delivery
        delivery = Delivery.query.get(delivery_id)
        
        if delivery:
            return jsonify({
                'success': True,
                'delivery': delivery.to_dict()
            })
        else:
            return jsonify({'success': False, 'error': '配送记录不存在'}), 404
            
    except Exception as e:
        current_app.logger.error(f"获取配送详情失败: {str(e)}")
        return jsonify({'error': '获取配送详情失败'}), 500

@admin_bp.route('/delivery/<int:delivery_id>/status', methods=['PUT'])
@require_admin_login
def update_delivery_status(delivery_id):
    """更新配送状态"""
    try:
        data = request.get_json()
        from utils.models import Delivery
        delivery = Delivery.query.get_or_404(delivery_id)
        
        if 'status' in data:
            delivery.status = data['status']
        if 'tracking_number' in data:
            delivery.tracking_number = data['tracking_number']
        
        delivery.updated_at = datetime.utcnow()
        
        # 记录操作日志
        log_operation_local('update_delivery_status', 'delivery', delivery_id, data)
        
        db.session.commit()
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"更新配送状态失败: {str(e)}")
        return jsonify({'error': '更新配送状态失败'}), 500

@admin_bp.route('/delivery/<int:delivery_id>/label', methods=['POST'])
@require_admin_login
def print_delivery_label(delivery_id):
    """打印配送标签"""
    try:
        from utils.models import Delivery
        delivery = Delivery.query.get_or_404(delivery_id)
        
        # 生成配送标签PDF
        from utils.pdf_generator import PDFGenerator
        generator = PDFGenerator()
        label_path = generator.generate_delivery_label(delivery)
        
        # 记录操作日志
        log_operation_local('print_delivery_label', 'delivery', delivery_id, {
            'label_file': os.path.basename(label_path)
        })
        
        return jsonify({
            'success': True,
            'label_url': f'/api/v1/admin/download/{os.path.basename(label_path)}'
        })
        
    except Exception as e:
        current_app.logger.error(f"打印配送标签失败: {str(e)}")
        return jsonify({'error': '打印配送标签失败'}), 500

@admin_bp.route('/delivery/stats')
@require_admin_login
def get_delivery_stats():
    """获取配送统计"""
    try:
        from utils.models import Delivery
        total = Delivery.query.count()
        pending = Delivery.query.filter(Delivery.status == 'pending').count()
        shipped = Delivery.query.filter(Delivery.status == 'shipped').count()
        delivered = Delivery.query.filter(Delivery.status == 'delivered').count()
        
        return jsonify({
            'total': total,
            'pending': pending,
            'shipped': shipped,
            'delivered': delivered
        })
        
    except Exception as e:
        current_app.logger.error(f"获取配送统计失败: {str(e)}")
        return jsonify({'error': '获取配送统计失败'}), 500

@admin_bp.route('/delivery', methods=['POST'])
@require_admin_login
def create_delivery():
    """创建配送单"""
    try:
        data = request.get_json()
        from utils.models import Delivery
        
        # 验证必要字段
        required_fields = ['order_ids', 'recipient_name', 'phone', 'address']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'缺少必要字段: {field}'}), 400
        
        # 生成配送单号
        delivery_no = Delivery.generate_delivery_no()
        
        # 创建配送记录
        delivery = Delivery(
            delivery_no=delivery_no,
            order_ids=json.dumps(data['order_ids']),
            recipient_name=data['recipient_name'],
            phone=data['phone'],
            address=data['address'],
            email=data.get('email'),
            city=data.get('city'),
            province=data.get('province'),
            postal_code=data.get('postal_code'),
            delivery_method=data.get('delivery_method', 'standard'),
            delivery_fee=data.get('delivery_fee', 0),
            notes=data.get('notes')
        )
        
        db.session.add(delivery)
        db.session.commit()
        
        # 记录操作日志
        log_operation_local('create_delivery', 'delivery', delivery.id, {
            'delivery_no': delivery_no,
            'order_count': len(data['order_ids'])
        })
        
        return jsonify({
            'success': True,
            'delivery': delivery.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"创建配送单失败: {str(e)}")
        return jsonify({'error': '创建配送单失败'}), 500

@admin_bp.route('/delivery/<int:delivery_id>', methods=['PUT'])
@require_admin_login
def update_delivery(delivery_id):
    """更新配送信息"""
    try:
        data = request.get_json()
        from utils.models import Delivery
        delivery = Delivery.query.get_or_404(delivery_id)
        
        # 更新配送信息
        if 'recipient_name' in data:
            delivery.recipient_name = data['recipient_name']
        if 'phone' in data:
            delivery.phone = data['phone']
        if 'address' in data:
            delivery.address = data['address']
        if 'email' in data:
            delivery.email = data['email']
        if 'city' in data:
            delivery.city = data['city']
        if 'province' in data:
            delivery.province = data['province']
        if 'postal_code' in data:
            delivery.postal_code = data['postal_code']
        if 'delivery_method' in data:
            delivery.delivery_method = data['delivery_method']
        if 'delivery_fee' in data:
            delivery.delivery_fee = data['delivery_fee']
        if 'courier_company' in data:
            delivery.courier_company = data['courier_company']
        if 'tracking_number' in data:
            delivery.tracking_number = data['tracking_number']
        if 'status' in data:
            delivery.status = data['status']
            # 如果状态更新为已发货，设置发货时间
            if data['status'] == 'shipped' and not delivery.shipped_at:
                delivery.shipped_at = datetime.utcnow()
            # 如果状态更新为已送达，设置送达时间
            elif data['status'] == 'delivered' and not delivery.delivered_at:
                delivery.delivered_at = datetime.utcnow()
        if 'notes' in data:
            delivery.notes = data['notes']
        
        delivery.updated_at = datetime.utcnow()
        
        # 记录操作日志
        log_operation_local('update_delivery', 'delivery', delivery_id, data)
        
        db.session.commit()
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"更新配送信息失败: {str(e)}")
        return jsonify({'error': '更新配送信息失败'}), 500

@admin_bp.route('/delivery/<int:delivery_id>', methods=['DELETE'])
@require_admin_login
def delete_delivery(delivery_id):
    """删除配送单"""
    try:
        from utils.models import Delivery
        delivery = Delivery.query.get_or_404(delivery_id)
        
        # 记录删除操作
        log_operation_local('delete_delivery', 'delivery', delivery_id, {
            'delivery_no': delivery.delivery_no,
            'recipient_name': delivery.recipient_name
        })
        
        db.session.delete(delivery)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '配送单删除成功'
        })
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"删除配送单失败: {str(e)}")
        return jsonify({'error': '删除配送单失败'}), 500

@admin_bp.route('/delivery/batch', methods=['PUT'])
@require_admin_login
def batch_update_deliveries():
    """批量更新配送状态"""
    try:
        data = request.get_json()
        delivery_ids = data.get('delivery_ids', [])
        update_data = data.get('update_data', {})
        
        if not delivery_ids:
            return jsonify({'error': '缺少配送ID列表'}), 400
        
        from utils.models import Delivery
        
        # 批量更新配送
        updated_count = 0
        for delivery_id in delivery_ids:
            delivery = Delivery.query.get(delivery_id)
            if delivery:
                if 'status' in update_data:
                    delivery.status = update_data['status']
                    if update_data['status'] == 'shipped' and not delivery.shipped_at:
                        delivery.shipped_at = datetime.utcnow()
                    elif update_data['status'] == 'delivered' and not delivery.delivered_at:
                        delivery.delivered_at = datetime.utcnow()
                
                if 'tracking_number' in update_data:
                    delivery.tracking_number = update_data['tracking_number']
                
                delivery.updated_at = datetime.utcnow()
                updated_count += 1
        
        # 记录操作日志
        log_operation_local('batch_update_deliveries', 'delivery', None, {
            'delivery_count': len(delivery_ids),
            'updated_count': updated_count,
            'update_data': update_data
        })
        
        db.session.commit()
        return jsonify({
            'success': True,
            'updated_count': updated_count
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"批量更新配送失败: {str(e)}")
        return jsonify({'error': '批量更新配送失败'}), 500

@admin_bp.route('/delivery/export', methods=['POST'])
@require_admin_login
def export_delivery_list():
    """导出配送单"""
    try:
        data = request.get_json()
        delivery_ids = data.get('delivery_ids', [])
        
        from utils.models import Delivery
        
        if not delivery_ids:
            # 获取所有待发货的配送单
            deliveries = Delivery.query.filter(Delivery.status == 'pending').all()
            delivery_ids = [delivery.id for delivery in deliveries]
        
        # 生成配送单PDF
        from utils.pdf_generator import PDFGenerator
        generator = PDFGenerator()
        pdf_path = generator.generate_delivery_list_pdf(delivery_ids)
        
        # 记录操作日志
        log_operation_local('export_delivery_list', 'delivery', None, {
            'delivery_count': len(delivery_ids)
        })
        
        return jsonify({
            'success': True,
            'pdf_path': os.path.basename(pdf_path),
            'download_url': f'/api/v1/admin/download/{os.path.basename(pdf_path)}'
        })
        
    except Exception as e:
        current_app.logger.error(f"导出配送单失败: {str(e)}")
        return jsonify({'error': '导出配送单失败'}), 500

@admin_bp.route('/dashboard/stats')
@require_admin_login
def get_dashboard_stats():
    """获取仪表盘数据"""
    try:
        today = datetime.utcnow().date()
        
        # 今日订单数
        today_orders = Order.query.filter(
            db.func.date(Order.created_at) == today
        ).count()
        
        # 待处理订单数
        pending_orders = Order.query.filter(Order.status == 'processing').count()
        
        # 今日收入
        today_revenue = db.session.query(db.func.sum(Order.total_price)).filter(
            db.func.date(Order.created_at) == today,
            Order.payment_status == 'paid'
        ).scalar() or 0
        
        # 券码使用情况
        coupon_usage = Coupon.query.filter(Coupon.used_count > 0).count()
        
        return jsonify({
            'today_orders': today_orders,
            'pending_orders': pending_orders,
            'today_revenue': float(today_revenue),
            'coupon_usage': coupon_usage
        })
        
    except Exception as e:
        current_app.logger.error(f"获取仪表盘数据失败: {str(e)}")
        return jsonify({'error': '获取仪表盘数据失败'}), 500

@admin_bp.route('/logs')
@require_admin_login
def get_logs():
    """获取操作日志"""
    try:
        log_type = request.args.get('log_type', 'operation')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # 使用文件日志系统
        logs = logger.get_logs(log_type=log_type, limit=per_page)
        
        # 分页处理
        start = (page - 1) * per_page
        end = start + per_page
        paginated_logs = logs[start:end]
        
        return jsonify({
            'logs': paginated_logs,
            'total': len(logs),
            'pages': (len(logs) + per_page - 1) // per_page,
            'current_page': page
        })
        
    except Exception as e:
        logger.log_error('get_logs_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'error': '获取操作日志失败'}), 500

@admin_bp.route('/logs/stats')
@require_admin_login
def get_log_stats():
    """获取日志统计"""
    try:
        stats = logger.get_log_stats()
        
        return jsonify({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        logger.log_error('get_log_stats_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'error': '获取日志统计失败'}), 500

@admin_bp.route('/config')
@require_admin_login
def get_config():
    """获取系统配置"""
    try:
        configs = SystemConfig.query.all()
        config_dict = {config.key: config.value for config in configs}
        
        return jsonify({'configs': config_dict})
        
    except Exception as e:
        current_app.logger.error(f"获取系统配置失败: {str(e)}")
        return jsonify({'error': '获取系统配置失败'}), 500

@admin_bp.route('/config', methods=['PUT'])
@require_admin_login
def update_config():
    """更新系统配置"""
    try:
        data = request.get_json()
        configs = data.get('configs', {})
        
        for key, value in configs.items():
            config = SystemConfig.query.filter_by(key=key).first()
            if config:
                config.value = str(value)
                config.updated_at = datetime.utcnow()
            else:
                config = SystemConfig(key=key, value=str(value))
                db.session.add(config)
        
        # 记录操作日志
        log_operation_local('update_config', 'system_config', None, configs)
        
        db.session.commit()
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"更新系统配置失败: {str(e)}")
        return jsonify({'error': '更新系统配置失败'}), 500

# ==================== 案例管理API ====================

@admin_bp.route('/cases', methods=['GET'])
@require_admin_login
def get_admin_cases():
    """获取案例列表"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        case_type = request.args.get('type', 'all')
        status = request.args.get('status', 'all')
        category = request.args.get('category', '')
        search = request.args.get('search', '')
        
        query = Case.query
        
        if case_type != 'all':
            query = query.filter(Case.case_type == case_type)
        
        if status != 'all':
            if status == 'featured':
                query = query.filter(Case.is_featured == True)
            elif status == 'public':
                query = query.filter(Case.is_public == True)
            elif status == 'private':
                query = query.filter(Case.is_public == False)
        
        if category:
            query = query.filter(Case.category == category)
        
        if search:
            query = query.filter(
                db.or_(
                    Case.title.contains(search),
                    Case.description.contains(search)
                )
            )
        
        cases = query.order_by(Case.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'cases': [case.to_dict() for case in cases.items],
            'total': cases.total,
            'pages': cases.pages,
            'current_page': page
        })
        
    except Exception as e:
        logger.log_error('get_admin_cases_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'error': '获取案例列表失败'}), 500

@admin_bp.route('/cases/<int:case_id>', methods=['GET'])
@require_admin_login
def get_admin_case_detail(case_id):
    """获取案例详情"""
    try:
        case = Case.query.get_or_404(case_id)
        
        # 获取案例的互动统计
        interactions = CaseInteraction.query.filter_by(case_id=case_id).all()
        interaction_stats = {
            'likes': len([i for i in interactions if i.interaction_type == 'like']),
            'makes': len([i for i in interactions if i.interaction_type == 'make']),
            'views': len([i for i in interactions if i.interaction_type == 'view']),
            'shares': len([i for i in interactions if i.interaction_type == 'share'])
        }
        
        case_data = case.to_dict()
        case_data['interaction_stats'] = interaction_stats
        
        return jsonify({
            'success': True,
            'case': case_data
        })
        
    except Exception as e:
        logger.log_error('get_admin_case_detail_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'error': '获取案例详情失败'}), 500

@admin_bp.route('/cases/<int:case_id>', methods=['PUT'])
@require_admin_login
def update_case(case_id):
    """更新案例信息"""
    try:
        data = request.get_json()
        case = Case.query.get_or_404(case_id)
        
        # 更新案例信息
        if 'title' in data:
            case.title = data['title']
        if 'description' in data:
            case.description = data['description']
        if 'category' in data:
            case.category = data['category']
        if 'case_type' in data:
            case.case_type = data['case_type']
        if 'tags' in data:
            case.tags = json.dumps(data['tags'])
        if 'is_featured' in data:
            case.is_featured = data['is_featured']
            if data['is_featured'] and not case.featured_at:
                case.featured_at = datetime.utcnow()
        if 'is_public' in data:
            case.is_public = data['is_public']
        if 'status' in data:
            case.status = data['status']
        
        case.updated_at = datetime.utcnow()
        
        # 记录操作日志
        logger.log_operation('update_case', 'cases', case_id, {
            'case_title': case.title,
            'changes': data
        }, request.remote_addr, request.headers.get('User-Agent'))
        
        db.session.commit()
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        logger.log_error('update_case_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'error': '更新案例失败'}), 500

@admin_bp.route('/cases/<int:case_id>', methods=['DELETE'])
@require_admin_login
def delete_case(case_id):
    """删除案例"""
    try:
        case = Case.query.get_or_404(case_id)
        
        # 删除相关文件
        if case.original_image_path and os.path.exists(case.original_image_path):
            os.remove(case.original_image_path)
        if case.preview_image_path and os.path.exists(case.preview_image_path):
            os.remove(case.preview_image_path)
        if case.final_image_path and os.path.exists(case.final_image_path):
            os.remove(case.final_image_path)
        
        # 删除相关互动记录
        CaseInteraction.query.filter_by(case_id=case_id).delete()
        
        # 记录操作日志
        logger.log_operation('delete_case', 'cases', case_id, {
            'case_title': case.title,
            'case_no': case.case_no
        }, request.remote_addr, request.headers.get('User-Agent'))
        
        db.session.delete(case)
        db.session.commit()
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        logger.log_error('delete_case_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'error': '删除案例失败'}), 500

@admin_bp.route('/cases/batch', methods=['POST'])
@require_admin_login
def batch_cases():
    """批量操作案例"""
    try:
        data = request.get_json()
        action = data.get('action')
        case_ids = data.get('case_ids', [])
        
        if not action or not case_ids:
            return jsonify({'error': '缺少必要参数'}), 400
        
        affected_count = 0
        
        if action == 'delete':
            for case_id in case_ids:
                case = Case.query.get(case_id)
                if case:
                    # 删除相关文件
                    if case.original_image_path and os.path.exists(case.original_image_path):
                        os.remove(case.original_image_path)
                    if case.preview_image_path and os.path.exists(case.preview_image_path):
                        os.remove(case.preview_image_path)
                    if case.final_image_path and os.path.exists(case.final_image_path):
                        os.remove(case.final_image_path)
                    
                    # 删除相关互动记录
                    CaseInteraction.query.filter_by(case_id=case_id).delete()
                    
                    db.session.delete(case)
                    affected_count += 1
        
        elif action == 'feature':
            for case_id in case_ids:
                case = Case.query.get(case_id)
                if case:
                    case.is_featured = True
                    if not case.featured_at:
                        case.featured_at = datetime.utcnow()
                    affected_count += 1
        
        elif action == 'unfeature':
            for case_id in case_ids:
                case = Case.query.get(case_id)
                if case:
                    case.is_featured = False
                    affected_count += 1
        
        elif action == 'publish':
            for case_id in case_ids:
                case = Case.query.get(case_id)
                if case:
                    case.is_public = True
                    affected_count += 1
        
        elif action == 'unpublish':
            for case_id in case_ids:
                case = Case.query.get(case_id)
                if case:
                    case.is_public = False
                    affected_count += 1
        
        # 记录操作日志
        logger.log_operation('batch_cases', 'cases', None, {
            'action': action,
            'case_count': len(case_ids),
            'affected_count': affected_count
        }, request.remote_addr, request.headers.get('User-Agent'))
        
        db.session.commit()
        return jsonify({
            'success': True,
            'affected_count': affected_count
        })
        
    except Exception as e:
        db.session.rollback()
        logger.log_error('batch_cases_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'error': '批量操作案例失败'}), 500

@admin_bp.route('/cases/stats')
@require_admin_login
def get_case_stats():
    """获取案例统计"""
    try:
        total = Case.query.count()
        featured = Case.query.filter(Case.is_featured == True).count()
        public = Case.query.filter(Case.is_public == True).count()
        private = Case.query.filter(Case.is_public == False).count()
        
        # 按类型统计
        user_cases = Case.query.filter(Case.case_type == 'user').count()
        official_cases = Case.query.filter(Case.case_type == 'official').count()
        draft_cases = Case.query.filter(Case.case_type == 'draft').count()
        
        # 按分类统计
        categories = db.session.query(Case.category, db.func.count(Case.id)).group_by(Case.category).all()
        category_stats = {cat[0]: cat[1] for cat in categories if cat[0]}
        
        return jsonify({
            'total': total,
            'featured': featured,
            'public': public,
            'private': private,
            'by_type': {
                'user': user_cases,
                'official': official_cases,
                'draft': draft_cases
            },
            'by_category': category_stats
        })
        
    except Exception as e:
        logger.log_error('get_case_stats_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'error': '获取案例统计失败'}), 500

@admin_bp.route('/cases/interactions')
@require_admin_login
def get_case_interactions():
    """获取案例互动统计"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        interaction_type = request.args.get('type', 'all')
        
        query = CaseInteraction.query
        
        if interaction_type != 'all':
            query = query.filter(CaseInteraction.interaction_type == interaction_type)
        
        interactions = query.order_by(CaseInteraction.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # 获取案例信息
        interaction_data = []
        for interaction in interactions.items:
            case = Case.query.get(interaction.case_id)
            interaction_dict = interaction.to_dict()
            interaction_dict['case_title'] = case.title if case else '未知案例'
            interaction_data.append(interaction_dict)
        
        return jsonify({
            'interactions': interaction_data,
            'total': interactions.total,
            'pages': interactions.pages,
            'current_page': page
        })
        
    except Exception as e:
        logger.log_error('get_case_interactions_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'error': '获取案例互动统计失败'}), 500

@admin_bp.route('/cases/create', methods=['POST'])
@require_admin_login
def create_case():
    """创建案例"""
    try:
        data = request.get_json()
        
        # 验证必要参数
        required_fields = ['title', 'original_image_path', 'preview_image_path']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'缺少{field}参数'}), 400
        
        # 创建案例
        case = Case(
            case_no=Case.generate_case_no(),
            title=data['title'],
            description=data.get('description', ''),
            original_image_path=data['original_image_path'],
            preview_image_path=data['preview_image_path'],
            final_image_path=data.get('final_image_path'),
            case_type=data.get('case_type', 'official'),
            category=data.get('category', '官方设计'),
            tags=json.dumps(data.get('tags', [])),
            is_featured=data.get('is_featured', False),
            is_public=data.get('is_public', True),
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        if case.is_featured:
            case.featured_at = datetime.utcnow()
        
        db.session.add(case)
        db.session.commit()
        
        # 记录操作日志
        logger.log_operation('create_case', 'cases', case.id, {
            'case_title': case.title,
            'case_no': case.case_no
        }, request.remote_addr, request.headers.get('User-Agent'))
        
        return jsonify({
            'success': True,
            'case': case.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        logger.log_error('create_case_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'error': '创建案例失败'}), 500

@admin_bp.route('/orders/<int:order_id>/create-case', methods=['POST'])
@require_admin_login
def create_case_from_order(order_id):
    """从订单创建案例"""
    try:
        order = Order.query.get_or_404(order_id)
        
        # 检查是否已经有对应的案例
        existing_case = Case.query.filter_by(order_id=order_id).first()
        if existing_case:
            return jsonify({'error': '该订单已经创建过案例'}), 400
        
        # 检查订单是否有必要的图片
        if not order.original_image_path:
            return jsonify({'error': '订单缺少原始图片，无法创建案例'}), 400
        
        # 使用订单信息创建案例
        case = Case.create_from_order(order)
        
        # 设置案例信息
        case.title = f"吧唧作品 {order.order_no}"
        case.description = f"来自订单 {order.order_no} 的吧唧作品"
        case.category = "用户创作"
        case.tags = json.dumps(['用户作品', '吧唧'])
        case.is_public = True
        case.is_featured = False
        
        db.session.add(case)
        db.session.commit()
        
        # 记录操作日志
        logger.log_operation('create_case_from_order', 'cases', case.id, {
            'order_id': order_id,
            'order_no': order.order_no,
            'case_title': case.title,
            'case_no': case.case_no
        }, request.remote_addr, request.headers.get('User-Agent'))
        
        return jsonify({
            'success': True,
            'case': case.to_dict(),
            'message': f'成功从订单 {order.order_no} 创建案例'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.log_error('create_case_from_order_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'error': '从订单创建案例失败'}), 500

@admin_bp.route('/orders/batch-create-cases', methods=['POST'])
@require_admin_login
def batch_create_cases_from_orders():
    """批量从订单创建案例"""
    try:
        data = request.get_json()
        order_ids = data.get('order_ids', [])
        
        if not order_ids:
            return jsonify({'error': '缺少订单ID列表'}), 400
        
        # 获取订单列表
        orders = Order.query.filter(Order.id.in_(order_ids)).all()
        
        if not orders:
            return jsonify({'error': '没有找到有效的订单'}), 400
        
        created_cases = []
        skipped_orders = []
        failed_orders = []
        
        for order in orders:
            try:
                # 检查是否已经有对应的案例
                existing_case = Case.query.filter_by(order_id=order.id).first()
                if existing_case:
                    skipped_orders.append({
                        'order_id': order.id,
                        'order_no': order.order_no,
                        'reason': '已存在案例'
                    })
                    continue
                
                # 检查订单是否有必要的图片
                if not order.original_image_path:
                    skipped_orders.append({
                        'order_id': order.id,
                        'order_no': order.order_no,
                        'reason': '缺少原始图片'
                    })
                    continue
                
                # 创建案例
                case = Case.create_from_order(order)
                case.title = f"吧唧作品 {order.order_no}"
                case.description = f"来自订单 {order.order_no} 的吧唧作品"
                case.category = "用户创作"
                case.tags = json.dumps(['用户作品', '吧唧'])
                case.is_public = True
                case.is_featured = False
                
                db.session.add(case)
                created_cases.append(case)
                
            except Exception as e:
                failed_orders.append({
                    'order_id': order.id,
                    'order_no': order.order_no,
                    'reason': str(e)
                })
        
        # 提交数据库事务
        db.session.commit()
        
        # 记录操作日志
        logger.log_operation('batch_create_cases_from_orders', 'cases', None, {
            'order_count': len(order_ids),
            'created_count': len(created_cases),
            'skipped_count': len(skipped_orders),
            'failed_count': len(failed_orders)
        }, request.remote_addr, request.headers.get('User-Agent'))
        
        return jsonify({
            'success': True,
            'created_cases': [case.to_dict() for case in created_cases],
            'skipped_orders': skipped_orders,
            'failed_orders': failed_orders,
            'summary': {
                'total_orders': len(order_ids),
                'created_count': len(created_cases),
                'skipped_count': len(skipped_orders),
                'failed_count': len(failed_orders)
            }
        })
        
    except Exception as e:
        db.session.rollback()
        logger.log_error('batch_create_cases_from_orders_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'error': '批量创建案例失败'}), 500

# ==================== 系统监控API ====================

@admin_bp.route('/monitor/status')
@require_admin_login
def get_system_status():
    """获取系统状态"""
    try:
        status = system_monitor.get_system_status()
        return jsonify({
            'success': True,
            'status': status
        })
        
    except Exception as e:
        logger.log_error('get_system_status_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'error': '获取系统状态失败'}), 500

@admin_bp.route('/monitor/performance')
@require_admin_login
def get_performance_report():
    """获取性能报告"""
    try:
        days = request.args.get('days', 7, type=int)
        report = system_monitor.get_performance_report(days)
        
        return jsonify({
            'success': True,
            'report': report
        })
        
    except Exception as e:
        logger.log_error('get_performance_report_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'error': '获取性能报告失败'}), 500

@admin_bp.route('/monitor/metrics')
@require_admin_login
def get_performance_metrics():
    """获取性能指标"""
    try:
        metrics = performance_optimizer.get_performance_metrics()
        
        return jsonify({
            'success': True,
            'metrics': metrics
        })
        
    except Exception as e:
        logger.log_error('get_performance_metrics_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'error': '获取性能指标失败'}), 500

@admin_bp.route('/monitor/optimize', methods=['POST'])
@require_admin_login
def optimize_system():
    """执行系统优化"""
    try:
        # 执行数据库优化
        performance_optimizer.optimize_database_queries()
        
        # 清除缓存
        performance_optimizer.clear_cache()
        
        # 记录优化操作
        logger.log_operation('system_optimization', 'system', None, {
            'optimization_time': datetime.now().isoformat()
        }, request.remote_addr, request.headers.get('User-Agent'))
        
        return jsonify({
            'success': True,
            'message': '系统优化完成'
        })
        
    except Exception as e:
        logger.log_error('optimize_system_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'error': '系统优化失败'}), 500

@admin_bp.route('/monitor/alerts')
@require_admin_login
def get_system_alerts():
    """获取系统告警"""
    try:
        status = system_monitor.get_system_status()
        alerts = status.get('alerts', [])
        
        return jsonify({
            'success': True,
            'alerts': alerts,
            'alert_count': len(alerts)
        })
        
    except Exception as e:
        logger.log_error('get_system_alerts_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'error': '获取系统告警失败'}), 500

# ==================== 打印管理API ====================

@admin_bp.route('/print/jobs')
@require_admin_login
def get_print_jobs():
    """获取打印任务列表"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        
        query = PrintJob.query
        
        if status:
            query = query.filter(PrintJob.status == status)
        
        print_jobs = query.order_by(PrintJob.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # 为每个打印任务添加订单图片信息
        jobs_with_images = []
        for job in print_jobs.items:
            job_dict = job.to_dict()
            # 获取对应的订单信息
            order = Order.query.get(job.order_id)
            if order:
                # 优先使用处理后的图片，如果没有则使用原始图片
                job_dict['order_image'] = order.processed_image_path or order.original_image_path
                # 转换为URL路径
                if job_dict['order_image']:
                    # 处理Windows路径分隔符
                    job_dict['order_image'] = job_dict['order_image'].replace('\\', '/')
                    # 确保路径以/static/开头
                    if not job_dict['order_image'].startswith('/static/'):
                        job_dict['order_image'] = job_dict['order_image'].replace('static/', '/static/')
            else:
                job_dict['order_image'] = None
            jobs_with_images.append(job_dict)
        
        return jsonify({
            'print_jobs': jobs_with_images,
            'total': print_jobs.total,
            'pages': print_jobs.pages,
            'current_page': page
        })
        
    except Exception as e:
        current_app.logger.error(f"获取打印任务失败: {str(e)}")
        return jsonify({'error': '获取打印任务失败'}), 500

@admin_bp.route('/print/jobs/<int:job_id>/status', methods=['PUT'])
@require_admin_login
def update_print_job_status(job_id):
    """更新打印任务状态"""
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({'error': '缺少状态参数'}), 400
        
        print_job = PrintJob.query.get_or_404(job_id)
        old_status = print_job.status
        print_job.status = new_status
        print_job.updated_at = datetime.utcnow()
        
        # 根据状态更新相应的时间字段
        if new_status == 'printing' and not print_job.started_at:
            print_job.started_at = datetime.utcnow()
        elif new_status in ['completed', 'failed'] and not print_job.completed_at:
            print_job.completed_at = datetime.utcnow()
        
        # 如果打印失败，记录错误信息
        if new_status == 'failed' and 'error_message' in data:
            print_job.error_message = data['error_message']
        
        # 记录操作日志
        log_operation_local('update_print_job_status', 'print_jobs', job_id, {
            'old_status': old_status,
            'new_status': new_status,
            'print_job_no': print_job.print_job_no
        })
        
        db.session.commit()
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"更新打印任务状态失败: {str(e)}")
        return jsonify({'error': '更新打印任务状态失败'}), 500

@admin_bp.route('/print/stats')
@require_admin_login
def get_print_stats():
    """获取打印统计"""
    try:
        # 统计各种状态的打印任务
        total_jobs = PrintJob.query.count()
        pending_jobs = PrintJob.query.filter(PrintJob.status == 'pending').count()
        printing_jobs = PrintJob.query.filter(PrintJob.status == 'printing').count()
        completed_jobs = PrintJob.query.filter(PrintJob.status == 'completed').count()
        failed_jobs = PrintJob.query.filter(PrintJob.status == 'failed').count()
        
        # 统计今日打印任务
        today = datetime.utcnow().date()
        today_jobs = PrintJob.query.filter(
            db.func.date(PrintJob.created_at) == today
        ).count()
        
        return jsonify({
            'total_jobs': total_jobs,
            'pendingPrints': pending_jobs,
            'printing': printing_jobs,
            'completed': completed_jobs,
            'failed': failed_jobs,
            'today_jobs': today_jobs
        })
        
    except Exception as e:
        current_app.logger.error(f"获取打印统计失败: {str(e)}")
        return jsonify({'error': '获取打印统计失败'}), 500

@admin_bp.route('/print/jobs/<int:job_id>', methods=['DELETE'])
@require_admin_login
def delete_print_job(job_id):
    """删除打印任务"""
    try:
        print_job = PrintJob.query.get_or_404(job_id)
        
        # 记录操作日志
        log_operation_local('delete_print_job', 'print_jobs', job_id, {
            'print_job_no': print_job.print_job_no,
            'order_no': print_job.order_no
        })
        
        db.session.delete(print_job)
        db.session.commit()
        
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"删除打印任务失败: {str(e)}")
        return jsonify({'error': '删除打印任务失败'}), 500

@admin_bp.route('/print/jobs/<int:job_id>/download')
@require_admin_login
def download_print_result(job_id):
    """下载打印结果"""
    try:
        print_job = PrintJob.query.get_or_404(job_id)
        
        # 检查打印任务状态
        if print_job.status != 'completed':
            return jsonify({'error': '只有已完成的打印任务才能下载'}), 400
        
        # 获取对应的订单
        order = Order.query.get(print_job.order_id)
        if not order:
            return jsonify({'error': '找不到对应的订单'}), 404
        
        # 生成打印结果PDF
        from utils.pdf_generator import PDFGenerator
        generator = PDFGenerator()
        
        # 使用打印任务的设置
        print_settings = json.loads(print_job.print_settings) if print_job.print_settings else {}
        pdf_format = print_settings.get('format', 'a4_6')
        baji_size = print_settings.get('size', '68x68')
        
        # 生成PDF
        pdf_path = generator.generate_baji_pdf([order.id], pdf_format, baji_size)
        
        # 记录下载操作
        log_operation_local('download_print_result', 'print_jobs', job_id, {
            'print_job_no': print_job.print_job_no,
            'order_no': print_job.order_no,
            'pdf_file': os.path.basename(pdf_path)
        })
        
        # 返回文件下载
        from flask import send_file
        return send_file(
            pdf_path,
            as_attachment=True,
            download_name=f"print_result_{print_job.print_job_no}.pdf",
            mimetype='application/pdf'
        )
        
    except Exception as e:
        current_app.logger.error(f"下载打印结果失败: {str(e)}")
        return jsonify({'error': '下载打印结果失败'}), 500

def log_operation_local(operation_type, target_table, target_id, operation_data):
    """记录操作日志"""
    try:
        logger.log_operation(
            operation_type=operation_type,
            target_table=target_table,
            target_id=target_id,
            operation_data=operation_data,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
    except Exception as e:
        # 日志记录失败不应该影响主要功能
        current_app.logger.error(f"记录操作日志失败: {str(e)}")

# 设备管理API
@admin_bp.route('/devices', methods=['GET'])
@require_admin_login
def get_devices():
    """获取设备列表"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        is_active = request.args.get('is_active')
        device_id = request.args.get('device_id')
        ip_address = request.args.get('ip_address')
        
        query = DeviceSession.query
        if is_active is not None:
            query = query.filter(DeviceSession.is_active == (is_active.lower() == 'true'))
        if device_id:
            query = query.filter(DeviceSession.device_id.contains(device_id))
        if ip_address:
            query = query.filter(DeviceSession.ip_address.contains(ip_address))
        
        devices = query.order_by(DeviceSession.last_seen.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # 为每个设备计算订单数
        devices_data = []
        for device in devices.items:
            device_dict = device.to_dict()
            # 计算该设备的订单数
            orders_count = Order.query.filter_by(device_id=device.device_id).count()
            device_dict['orders_count'] = orders_count
            devices_data.append(device_dict)
        
        return jsonify({
            'devices': devices_data,
            'total': devices.total,
            'pages': devices.pages,
            'current_page': page
        })
        
    except Exception as e:
        current_app.logger.error(f"获取设备列表失败: {str(e)}")
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/devices/<device_id>', methods=['GET'])
@require_admin_login
def get_device(device_id):
    """获取设备详情"""
    try:
        device = DeviceSession.query.filter_by(device_id=device_id).first()
        if not device:
            return jsonify({'error': '设备不存在'}), 404
        
        # 获取设备的订单统计
        orders_count = Order.query.filter_by(device_id=device_id).count()
        cases_count = Case.query.filter_by(device_id=device_id).count()
        
        device_data = device.to_dict()
        device_data['orders_count'] = orders_count
        device_data['cases_count'] = cases_count
        
        return jsonify({
            'device': device_data
        })
        
    except Exception as e:
        current_app.logger.error(f"获取设备详情失败: {str(e)}")
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/devices/<device_id>/orders', methods=['GET'])
@require_admin_login
def get_device_orders(device_id):
    """获取设备的订单列表"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        orders = Order.query.filter_by(device_id=device_id).order_by(
            Order.created_at.desc()
        ).paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'orders': [order.to_dict() for order in orders.items],
            'total': orders.total,
            'pages': orders.pages,
            'current_page': page
        })
        
    except Exception as e:
        current_app.logger.error(f"获取设备订单失败: {str(e)}")
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/devices/<device_id>/status', methods=['PUT'])
@require_admin_login
def update_device_status(device_id):
    """更新设备状态"""
    try:
        data = request.get_json()
        is_active = data.get('is_active')
        
        if is_active is None:
            return jsonify({'error': '缺少状态参数'}), 400
        
        device = DeviceSession.query.filter_by(device_id=device_id).first()
        if not device:
            return jsonify({'error': '设备不存在'}), 404
        
        device.is_active = is_active
        device.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        # 记录操作日志
        log_operation_local('update_device_status', 'device_sessions', device.id, {
            'device_id': device_id,
            'is_active': is_active
        })
        
        return jsonify({'success': True})
        
    except Exception as e:
        current_app.logger.error(f"更新设备状态失败: {str(e)}")
        return jsonify({'error': str(e)}), 500
