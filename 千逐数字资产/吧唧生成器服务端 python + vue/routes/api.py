# routes/api.py - API路由
import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, send_file, current_app
from utils.device_middleware import require_device_id, optional_device_id, get_device_id_from_request, validate_device_access
from utils.logger import logger
from utils.recommendation_engine import recommendation_engine
from utils.helpers import validate_image_file, generate_unique_filename, get_file_info, save_file_with_permissions
from utils.baji_processor import BajiProcessor
from utils.security_auditor import security_auditor
from utils.order_service import create_order_record
from utils.models import Order, Coupon, Case, CaseInteraction, db

api_bp = Blueprint('api', __name__, url_prefix='/api/v1')

@api_bp.route('/')
def api_info():
    """API信息"""
    return jsonify({
        'success': True,
        'message': '吧唧生成器 API v1.0',
        'endpoints': {
            'upload': '/api/v1/upload',
            'preview': '/api/v1/preview',
            'orders': '/api/v1/orders',
            'cases': '/api/v1/cases',
            'gallery': '/api/v1/gallery',
            'payment': '/api/v1/payment'
        },
        'version': '1.0.0'
    })

@api_bp.route('/upload', methods=['POST'])
def upload_image():
    """上传图片API"""
    try:
        # 应用频率限制 - 大幅提高限制
        if hasattr(current_app, 'limiter'):
            current_app.limiter.limit("1000 per minute")(lambda: None)()
        
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': '没有文件'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'success': False, 'error': '没有选择文件'}), 400
        
        # 验证文件
        is_valid, error_msg = validate_image_file(file)
        if not is_valid:
            # 记录安全违规
            security_auditor.log_security_violation('INVALID_FILE_UPLOAD', {
                'filename': file.filename,
                'error': error_msg
            })
            return jsonify({'success': False, 'error': error_msg}), 400
        
        # 使用文件管理器获取分目录的路径
        from utils.file_manager import file_manager
        filepath = file_manager.get_upload_path(file.filename)
        
        # 保存文件并设置安全权限
        save_file_with_permissions(file, filepath)
        
        # 获取图片信息
        image_info = get_file_info(filepath)
        
        # 从文件路径中提取文件名
        filename_only = os.path.basename(filepath)
        
        # 记录文件上传事件
        security_auditor.log_file_upload(
            filename_only, 
            image_info['size'] if image_info else 0, 
            'SUCCESS'
        )
        
        return jsonify({
            'success': True,
            'file_path': filepath,
            'image_info': image_info
        })
        
    except Exception as e:
        current_app.logger.error(f"上传失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/preview', methods=['POST'])
def generate_preview():
    """生成预览API"""
    try:
        data = request.get_json()
        
        # 验证参数
        if not data.get('image_path'):
            return jsonify({'success': False, 'error': '缺少图片路径'}), 400
        
        # 创建预览参数，提供默认值
        preview_params = {
            'image': {
                'original_path': data['image_path'],
                'width': data.get('width', 0),
                'height': data.get('height', 0),
                'format': data.get('format', 'jpg')
            },
            'edit_params': {
                'scale': data.get('scale', 1.0),
                'rotation': data.get('rotation', 0),
                'offset_x': data.get('offset_x', 0),
                'offset_y': data.get('offset_y', 0)
            },
            'baji_specs': {
                'size': 68,
                'dpi': 300,
                'format': 'png',
                'quality': 95
            },
            'user_preferences': {
                'auto_enhance': True,
                'smart_crop': False,
                'color_correction': True,
                'sharpening': False
            }
        }
        
        # 处理图片
        processor = BajiProcessor(preview_params)
        preview_image = processor.process_image()
        
        # 保存预览图片
        preview_filename = f"preview_{uuid.uuid4().hex[:8]}.png"
        preview_path = os.path.join(current_app.config['EXPORT_FOLDER'], preview_filename)
        preview_image.save(preview_path, 'PNG')
        
        return jsonify({
            'success': True,
            'preview_path': preview_path
        })
        
    except Exception as e:
        current_app.logger.error(f"生成预览失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/orders', methods=['GET'])
@require_device_id
def get_orders():
    """获取用户订单列表API"""
    try:
        device_id = get_device_id_from_request()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        status = request.args.get('status')
        payment_status = request.args.get('payment_status')
        delivery_status = request.args.get('delivery_status')
        exclude_delivered = request.args.get('exclude_delivered', 'false').lower() == 'true'
        
        # 构建查询 - 只查询当前设备的订单
        query = Order.query.filter(Order.device_id == device_id)
        
        # 处理状态筛选 - 支持多个状态值（逗号分隔）
        if status:
            if ',' in status:
                # 多个状态值
                status_list = [s.strip() for s in status.split(',')]
                query = query.filter(Order.status.in_(status_list))
            else:
                # 单个状态值
                query = query.filter(Order.status == status)
        
        # 处理支付状态筛选
        if payment_status:
            query = query.filter(Order.payment_status == payment_status)
        
        # 处理配送状态筛选
        if delivery_status:
            query = query.filter(Order.delivery_status == delivery_status)
        
        # 过滤已配送的订单（兼容旧参数）
        if exclude_delivered:
            # 使用新的配送状态字段过滤
            query = query.filter(Order.delivery_status.in_(['no_delivery', 'address_filled', 'unknown']))
        
        # 分页查询
        orders = query.order_by(Order.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'orders': [order.to_dict() for order in orders.items],
            'total': orders.total,
            'pages': orders.pages,
            'current_page': page
        })
        
    except Exception as e:
        current_app.logger.error(f"获取订单列表失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/orders', methods=['POST'])
@require_device_id
def create_order():
    """创建订单API"""
    try:
        device_id = get_device_id_from_request()
        
        # 获取参数
        params = request.get_json()
        
        # 验证参数
        if not params.get('image') or not params.get('edit_params'):
            return jsonify({'success': False, 'error': '缺少必要参数'}), 400
        
        # 确保edit_params有所有必需的字段
        edit_params = params.get('edit_params', {})
        if 'scale' not in edit_params:
            edit_params['scale'] = 1.0
        if 'rotation' not in edit_params:
            edit_params['rotation'] = 0
        if 'offset_x' not in edit_params:
            edit_params['offset_x'] = 0
        if 'offset_y' not in edit_params:
            edit_params['offset_y'] = 0
        
        # 处理图片数据 - 支持文件路径和base64格式
        image_data = params.get('image')
        image_path = None
        
        if isinstance(image_data, dict):
            # 处理图片路径对象格式
            image_path = image_data.get('original_path') or image_data.get('processed_path')
            if not image_path:
                return jsonify({'success': False, 'error': '缺少图片路径'}), 400
            
            # 标准化路径分隔符（处理Windows反斜杠）
            image_path = image_path.replace('\\', '/')
            
            # 确保路径是绝对路径
            if not os.path.isabs(image_path):
                # 使用UPLOAD_FOLDER的父目录作为基础路径
                upload_folder = current_app.config['UPLOAD_FOLDER']
                # 如果路径以static/uploads开头，直接使用UPLOAD_FOLDER
                if image_path.startswith('static/uploads/'):
                    relative_path = image_path[len('static/uploads/'):]
                    image_path = os.path.join(upload_folder, relative_path)
                else:
                    image_path = os.path.join(upload_folder, image_path)
            
            # 检查文件是否存在
            if not os.path.exists(image_path):
                # 记录调试信息
                current_app.logger.error(f"图片文件不存在: {image_path}")
                current_app.logger.error(f"原始路径: {image_data.get('original_path')}")
                current_app.logger.error(f"UPLOAD_FOLDER: {current_app.config['UPLOAD_FOLDER']}")
                current_app.logger.error(f"当前工作目录: {os.getcwd()}")
                return jsonify({'success': False, 'error': f'图片文件不存在: {image_path}'}), 400
                
        elif isinstance(image_data, str):
            if image_data.startswith('data:image'):
                # 处理data URL格式
                import base64
                header, data = image_data.split(',', 1)
                image_bytes = base64.b64decode(data)
                
                # 保存临时图片文件
                import tempfile
                import uuid
                temp_filename = f"temp_{uuid.uuid4().hex[:8]}.png"
                temp_path = os.path.join(current_app.config['UPLOAD_FOLDER'], temp_filename)
                
                # 确保目录存在
                os.makedirs(os.path.dirname(temp_path), exist_ok=True)
                
                with open(temp_path, 'wb') as f:
                    f.write(image_bytes)
                
                image_path = temp_path
                
            elif os.path.exists(image_data):
                # 处理文件路径字符串
                image_path = image_data
            else:
                # 处理纯base64数据
                import base64
                image_bytes = base64.b64decode(image_data)
                
                # 保存临时图片文件
                import tempfile
                import uuid
                temp_filename = f"temp_{uuid.uuid4().hex[:8]}.png"
                temp_path = os.path.join(current_app.config['UPLOAD_FOLDER'], temp_filename)
                
                # 确保目录存在
                os.makedirs(os.path.dirname(temp_path), exist_ok=True)
                
                with open(temp_path, 'wb') as f:
                    f.write(image_bytes)
                
                image_path = temp_path
        else:
            return jsonify({'success': False, 'error': '无效的图片数据格式'}), 400
        
        # 构建BajiProcessor需要的参数格式
        processor_params = {
            'image': {
                'original_path': image_path,
                'width': image_data.get('width', 0) if isinstance(image_data, dict) else 0,
                'height': image_data.get('height', 0) if isinstance(image_data, dict) else 0,
                'format': image_data.get('format', 'png') if isinstance(image_data, dict) else 'png'
            },
            'edit_params': edit_params,
            'baji_specs': {
                'size': 68,
                'dpi': 300,
                'format': 'png',
                'quality': 95
            },
            'user_preferences': {
                'auto_enhance': True,
                'smart_crop': False,
                'color_correction': True,
                'sharpening': False
            }
        }
        
        # 处理图片
        processor = BajiProcessor(processor_params)
        processed_image = processor.process_image()
        
        # 保存处理后的图片
        order_no = Order.generate_order_no()
        output_filename = f"{order_no}.png"
        
        # 使用文件管理器获取基于日期的导出路径
        from utils.file_manager import file_manager
        output_path = file_manager.get_dated_export_path(output_filename)
        
        processor.save_processed_image(output_path)
        
        # 创建订单记录
        order = create_order_record(processor_params, output_path, device_id)
        
        # 获取预览图片路径
        preview_filename = f"preview_{output_filename.split('.')[0]}.png"
        preview_path = file_manager.get_dated_export_path(preview_filename)
        
        # 更新订单记录，添加预览图片路径
        if os.path.exists(preview_path):
            # 从数据库获取Order对象
            order_obj = Order.query.filter_by(order_no=order['order_no']).first()
            if order_obj:
                order_obj.preview_image_path = preview_path
                db.session.commit()
                print(f"🔍 订单预览图片路径已更新: {preview_path}")
            else:
                print(f"❌ 找不到订单对象: {order['order_no']}")
        
        # 清理临时文件（仅当是base64数据创建的临时文件时）
        if isinstance(image_data, str) and (image_data.startswith('data:image') or not os.path.exists(image_data)):
            try:
                if 'temp_path' in locals() and os.path.exists(temp_path):
                    os.remove(temp_path)
            except:
                pass
        
        
        return jsonify({
            'success': True,
            'order': order
        })
        
    except Exception as e:
        current_app.logger.error(f"创建订单失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/orders/<order_no>')
@require_device_id
def get_order(order_no):
    """获取订单信息API"""
    try:
        device_id = get_device_id_from_request()
        
        order = Order.query.filter_by(order_no=order_no, device_id=device_id).first()
        
        if not order:
            return jsonify({'success': False, 'error': '订单不存在或无权限访问'}), 404
        
        order_data = order.to_dict()
        if order.notes:
            import json
            notes_data = json.loads(order.notes)
            order_data.update(notes_data)
        
        return jsonify({
            'success': True,
            'order': order_data
        })
        
    except Exception as e:
        current_app.logger.error(f"获取订单失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/image/<filename>')
def get_image(filename):
    """获取图片文件"""
    try:
        from flask import send_file
        
        # 首先检查文件是否存在于uploads或exports目录的根目录（向后兼容）
        upload_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        export_path = os.path.join(current_app.config['EXPORT_FOLDER'], filename)
        
        if os.path.exists(upload_path):
            return send_file(upload_path)
        elif os.path.exists(export_path):
            return send_file(export_path)
        
        # 如果根目录找不到，则在子文件夹中搜索（支持基于日期的文件夹结构）
        # 搜索uploads目录的子文件夹
        upload_folder = current_app.config['UPLOAD_FOLDER']
        if os.path.exists(upload_folder):
            for root, dirs, files in os.walk(upload_folder):
                if filename in files:
                    file_path = os.path.join(root, filename)
                    return send_file(file_path)
        
        # 搜索exports目录的子文件夹
        export_folder = current_app.config['EXPORT_FOLDER']
        if os.path.exists(export_folder):
            for root, dirs, files in os.walk(export_folder):
                if filename in files:
                    file_path = os.path.join(root, filename)
                    return send_file(file_path)
        
        # 如果都找不到，返回404
        return jsonify({'success': False, 'error': '图片不存在'}), 404
            
    except Exception as e:
        current_app.logger.error(f"获取图片失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/image/<filename>', methods=['DELETE'])
def delete_image(filename):
    """删除图片"""
    try:
        # 首先检查文件是否存在于uploads或exports目录的根目录（向后兼容）
        upload_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        export_path = os.path.join(current_app.config['EXPORT_FOLDER'], filename)
        
        deleted = False
        if os.path.exists(upload_path):
            os.remove(upload_path)
            deleted = True
        if os.path.exists(export_path):
            os.remove(export_path)
            deleted = True
        
        # 如果根目录找不到，则在子文件夹中搜索并删除
        if not deleted:
            # 搜索uploads目录的子文件夹
            upload_folder = current_app.config['UPLOAD_FOLDER']
            if os.path.exists(upload_folder):
                for root, dirs, files in os.walk(upload_folder):
                    if filename in files:
                        file_path = os.path.join(root, filename)
                        os.remove(file_path)
                        deleted = True
                        break
            
            # 搜索exports目录的子文件夹
            if not deleted:
                export_folder = current_app.config['EXPORT_FOLDER']
                if os.path.exists(export_folder):
                    for root, dirs, files in os.walk(export_folder):
                        if filename in files:
                            file_path = os.path.join(root, filename)
                            os.remove(file_path)
                            deleted = True
                            break
            
        if deleted:
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': '图片不存在'}), 404
            
    except Exception as e:
        current_app.logger.error(f"删除图片失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/orders/<order_no>/status')
@require_device_id
def get_order_status(order_no):
    """获取订单状态"""
    try:
        order = Order.query.filter_by(order_no=order_no).first()
        
        if order:
            return jsonify({
                'success': True,
                'order_no': order.order_no,
                'status': order.status,
                'payment_status': order.payment_status,
                'created_at': order.created_at.isoformat()
            })
        else:
            return jsonify({'success': False, 'error': '订单不存在'}), 404
            
    except Exception as e:
        current_app.logger.error(f"获取订单状态失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/orders/<order_no>', methods=['PUT'])
@require_device_id
def update_order(order_no):
    """更新订单"""
    try:
        data = request.get_json()
        order = Order.query.filter_by(order_no=order_no).first()
        
        if not order:
            return jsonify({'success': False, 'error': '订单不存在'}), 404
        
        # 更新订单信息
        if 'quantity' in data:
            order.quantity = data['quantity']
        if 'notes' in data:
            order.notes = data['notes']
        
        order.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"更新订单失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/orders/<order_no>', methods=['DELETE'])
@require_device_id
def delete_order(order_no):
    """删除订单"""
    try:
        order = Order.query.filter_by(order_no=order_no).first()
        
        if not order:
            return jsonify({'success': False, 'error': '订单不存在'}), 404
        
        # 删除相关文件
        if order.processed_image_path and os.path.exists(order.processed_image_path):
            os.remove(order.processed_image_path)
        
        db.session.delete(order)
        db.session.commit()
        
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"删除订单失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/coupons/validate', methods=['POST'])
@require_device_id
def validate_coupon():
    """验证券码API"""
    try:
        device_id = get_device_id_from_request()
        data = request.get_json()
        code = data.get('code')
        order_amount = data.get('order_amount', 0)
        
        if not code:
            return jsonify({'success': False, 'error': '券码不能为空'}), 400
        
        # 查找券码（优先查找设备专用券码，其次查找全局券码）
        coupon = Coupon.query.filter_by(code=code, device_id=device_id).first()
        if not coupon:
            # 如果没找到设备专用券码，尝试查找全局券码（device_id为None）
            coupon = Coupon.query.filter_by(code=code, device_id=None).first()
        
        if not coupon:
            return jsonify({'success': False, 'error': '券码不存在'}), 400
        
        # 检查券码是否激活
        if not coupon.is_active:
            return jsonify({'success': False, 'error': '券码已禁用'}), 400
        
        # 检查券码是否过期
        now = datetime.utcnow()
        if coupon.valid_until and coupon.valid_until < now:
            return jsonify({'success': False, 'error': '券码已过期'}), 400
        
        # 检查券码是否已用完
        if coupon.used_count >= coupon.usage_limit:
            return jsonify({'success': False, 'error': '券码已用完'}), 400
        
        # 检查券码是否在有效期内
        if coupon.valid_from > now:
            return jsonify({'success': False, 'error': '券码尚未生效'}), 400
        
        # 计算折扣
        discount = coupon.calculate_discount(float(order_amount))
        
        return jsonify({
            'success': True,
            'discount': discount,
            'discount_type': coupon.discount_type,
            'coupon_code': coupon.code,
            'min_order_amount': float(coupon.min_order_amount)
        })
        
    except Exception as e:
        current_app.logger.error(f"验证券码失败: {str(e)}")
        return jsonify({'success': False, 'error': '验证券码失败'}), 500

@api_bp.route('/payment', methods=['POST'])
@require_device_id
def process_payment():
    """处理支付"""
    try:
        device_id = get_device_id_from_request()
        data = request.get_json()
        order_no = data.get('order_no')
        payment_method = data.get('payment_method')
        coupon_code = data.get('coupon_code')
        
        if not order_no:
            return jsonify({'error': '缺少订单号'}), 400
        
        # 获取订单（基于设备ID过滤）
        order = Order.query.filter_by(order_no=order_no, device_id=device_id).first()
        if not order:
            return jsonify({'error': '订单不存在'}), 404
        
        if order.payment_status == 'paid':
            return jsonify({'error': '订单已支付'}), 400
        
        # 处理券码
        if payment_method == 'coupon':
            # 使用优惠券支付方式时，必须提供优惠券代码
            if not coupon_code:
                return jsonify({'error': '使用优惠券支付必须提供券码'}), 400
            
            # 优先查找设备专用券码，其次查找全局券码
            coupon = Coupon.query.filter_by(code=coupon_code, device_id=device_id).first()
            if not coupon:
                # 如果没找到设备专用券码，尝试查找全局券码（device_id为None）
                coupon = Coupon.query.filter_by(code=coupon_code, device_id=None).first()
            
            if not coupon:
                return jsonify({'error': '券码不存在'}), 400
            
            if not coupon.is_valid():
                return jsonify({'error': '券码无效'}), 400
            
            # 检查订单金额是否满足最低消费要求
            if float(order.total_price) < float(coupon.min_order_amount):
                return jsonify({'error': f'订单金额不满足最低消费要求，最低消费{float(coupon.min_order_amount)}元'}), 400
            
            # 计算折扣
            discount = coupon.calculate_discount(float(order.total_price))
            if discount <= 0:
                return jsonify({'error': '优惠券无法使用，请检查订单金额和优惠券条件'}), 400
            
            # 应用折扣
            order.total_price = order.total_price - discount
            order.coupon_id = coupon.id
            coupon.used_count += 1
            coupon.used_at = datetime.utcnow()
        elif coupon_code:
            # 其他支付方式下，如果提供了优惠券代码，也进行验证和应用
            # 优先查找设备专用券码，其次查找全局券码
            coupon = Coupon.query.filter_by(code=coupon_code, device_id=device_id).first()
            if not coupon:
                # 如果没找到设备专用券码，尝试查找全局券码（device_id为None）
                coupon = Coupon.query.filter_by(code=coupon_code, device_id=None).first()
            
            if not coupon:
                return jsonify({'error': '券码不存在'}), 400
            
            if not coupon.is_valid():
                return jsonify({'error': '券码无效'}), 400
            
            # 检查订单金额是否满足最低消费要求
            if float(order.total_price) < float(coupon.min_order_amount):
                return jsonify({'error': f'订单金额不满足最低消费要求，最低消费{float(coupon.min_order_amount)}元'}), 400
            
            # 计算折扣
            discount = coupon.calculate_discount(float(order.total_price))
            if discount > 0:
                order.total_price = order.total_price - discount
                order.coupon_id = coupon.id
                coupon.used_count += 1
                coupon.used_at = datetime.utcnow()
        
        # 更新订单状态
        order.payment_method = payment_method
        order.payment_status = 'paid'
        order.payment_time = datetime.utcnow()
        order.status = 'processing'
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'order': order.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"支付处理失败: {str(e)}")
        return jsonify({'error': '支付处理失败'}), 500

@api_bp.route('/payment/<order_no>/status')
@require_device_id
def get_payment_status(order_no):
    """查询支付状态"""
    try:
        device_id = get_device_id_from_request()
        order = Order.query.filter_by(order_no=order_no, device_id=device_id).first()
        
        if order:
            return jsonify({
                'success': True,
                'payment_status': order.payment_status,
                'payment_time': order.payment_time.isoformat() if order.payment_time else None
            })
        else:
            return jsonify({'success': False, 'error': '订单不存在'}), 404
            
    except Exception as e:
        current_app.logger.error(f"查询支付状态失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/payment/<order_no>/refund', methods=['POST'])
@require_device_id
def request_refund(order_no):
    """申请退款"""
    try:
        device_id = get_device_id_from_request()
        data = request.get_json()
        reason = data.get('reason', '')
        
        order = Order.query.filter_by(order_no=order_no, device_id=device_id).first()
        if not order:
            return jsonify({'success': False, 'error': '订单不存在'}), 404
        
        if order.payment_status != 'paid':
            return jsonify({'success': False, 'error': '订单未支付'}), 400
        
        # 更新订单状态为退款申请
        order.status = 'refund_requested'
        order.refund_reason = reason
        order.refund_requested_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"申请退款失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/invoice/<order_no>')
def get_invoice(order_no):
    """获取发票"""
    try:
        order = Order.query.filter_by(order_no=order_no).first()
        if not order:
            return jsonify({'success': False, 'error': '订单不存在'}), 404
        
        # 生成发票PDF
        from utils.pdf_generator import PDFGenerator
        generator = PDFGenerator()
        invoice_path = generator.generate_invoice(order)
        
        return send_file(invoice_path, as_attachment=True, download_name=f'invoice_{order_no}.pdf')
        
    except Exception as e:
        current_app.logger.error(f"获取发票失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/invoice/<order_no>/qr')
def get_invoice_qr(order_no):
    """获取发票二维码"""
    try:
        order = Order.query.filter_by(order_no=order_no).first()
        if not order:
            return jsonify({'success': False, 'error': '订单不存在'}), 404
        
        # 生成二维码
        import qrcode
        from io import BytesIO
        
        qr_data = f"订单号: {order_no}\n金额: {order.total_price}\n时间: {order.created_at}"
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        img_buffer = BytesIO()
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        return send_file(img_buffer, mimetype='image/png')
        
    except Exception as e:
        current_app.logger.error(f"获取发票二维码失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/invoice/<order_no>/download', methods=['POST'])
def download_invoice(order_no):
    """下载发票"""
    try:
        order = Order.query.filter_by(order_no=order_no).first()
        if not order:
            return jsonify({'success': False, 'error': '订单不存在'}), 404
        
        # 生成发票PDF
        from utils.pdf_generator import PDFGenerator
        generator = PDFGenerator()
        invoice_path = generator.generate_invoice(order)
        
        return send_file(invoice_path, as_attachment=True, download_name=f'invoice_{order_no}.pdf')
        
    except Exception as e:
        current_app.logger.error(f"下载发票失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/delivery', methods=['GET'])
@require_device_id
def get_user_deliveries():
    """获取用户配送列表"""
    try:
        device_id = get_device_id_from_request()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        from utils.models import Delivery
        deliveries = Delivery.query.filter_by(device_id=device_id).order_by(Delivery.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'deliveries': [delivery.to_dict() for delivery in deliveries.items],
            'total': deliveries.total,
            'pages': deliveries.pages,
            'current_page': page
        })
        
    except Exception as e:
        current_app.logger.error(f"获取配送列表失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/delivery', methods=['POST'])
@require_device_id
def create_delivery():
    """创建配送"""
    try:
        device_id = get_device_id_from_request()
        data = request.get_json()
        
        # 验证必要参数
        required_fields = ['order_ids', 'recipient_name', 'phone', 'address', 'delivery_method']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'缺少{field}参数'}), 400
        
        # 创建配送记录
        from utils.models import Delivery
        delivery_no = Delivery.generate_delivery_no()
        delivery = Delivery(
            delivery_no=delivery_no,
            device_id=device_id,
            order_ids=','.join(map(str, data['order_ids'])),
            recipient_name=data['recipient_name'],
            phone=data['phone'],
            address=data['address'],
            delivery_method=data['delivery_method'],
            status='pending'
        )
        
        db.session.add(delivery)
        
        # 更新关联订单的配送状态
        for order_id in data['order_ids']:
            order = Order.query.get(order_id)
            if order and order.device_id == device_id:
                order.delivery_status = 'address_filled'
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'delivery': delivery.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"创建配送失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/delivery/<int:delivery_id>')
@require_device_id
def get_delivery(delivery_id):
    """获取配送信息"""
    try:
        device_id = get_device_id_from_request()
        from utils.models import Delivery
        delivery = Delivery.query.filter_by(id=delivery_id, device_id=device_id).first()
        
        if delivery:
            return jsonify({
                'success': True,
                'delivery': delivery.to_dict()
            })
        else:
            return jsonify({'success': False, 'error': '配送记录不存在'}), 404
            
    except Exception as e:
        current_app.logger.error(f"获取配送信息失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/delivery/<int:delivery_id>/orders')
@require_device_id
def get_delivery_orders(delivery_id):
    """获取配送关联的订单详情"""
    try:
        device_id = get_device_id_from_request()
        from utils.models import Delivery, Order
        
        # 获取配送记录
        delivery = Delivery.query.filter_by(id=delivery_id, device_id=device_id).first()
        if not delivery:
            return jsonify({'success': False, 'error': '配送记录不存在'}), 404
        
        # 解析订单ID列表
        order_ids = [int(id.strip()) for id in delivery.order_ids.split(',') if id.strip()]
        
        # 获取订单详情
        orders = Order.query.filter(Order.id.in_(order_ids), Order.device_id == device_id).all()
        
        # 构建订单详情数据
        orders_data = []
        for order in orders:
            order_data = order.to_dict()
            # 添加预览图文件名
            if order.processed_image_path:
                order_data['preview_image_filename'] = os.path.basename(order.processed_image_path)
            else:
                order_data['preview_image_filename'] = None
            orders_data.append(order_data)
        
        return jsonify({
            'success': True,
            'orders': orders_data,
            'delivery': delivery.to_dict()
        })
        
    except Exception as e:
        current_app.logger.error(f"获取配送订单详情失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/delivery/<int:delivery_id>/status', methods=['PUT'])
@require_device_id
def update_delivery_status(delivery_id):
    """更新配送状态"""
    try:
        device_id = get_device_id_from_request()
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({'success': False, 'error': '缺少状态参数'}), 400
        
        from utils.models import Delivery, Order
        delivery = Delivery.query.filter_by(id=delivery_id, device_id=device_id).first()
        
        if not delivery:
            return jsonify({'success': False, 'error': '配送记录不存在'}), 404
        
        # 更新配送状态
        delivery.status = new_status
        
        # 如果配送完成，更新关联订单的配送状态
        if new_status == 'delivered':
            order_ids = [int(id.strip()) for id in delivery.order_ids.split(',') if id.strip()]
            for order_id in order_ids:
                order = Order.query.get(order_id)
                if order and order.device_id == device_id:
                    order.delivery_status = 'delivered'
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'delivery': delivery.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"更新配送状态失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/delivery/<int:delivery_id>', methods=['PUT'])
@require_device_id
def update_delivery(delivery_id):
    """更新配送信息"""
    try:
        device_id = get_device_id_from_request()
        data = request.get_json()
        from utils.models import Delivery
        delivery = Delivery.query.filter_by(id=delivery_id, device_id=device_id).first()
        
        if not delivery:
            return jsonify({'success': False, 'error': '配送记录不存在'}), 404
        
        # 更新配送信息
        if 'status' in data:
            delivery.status = data['status']
        if 'tracking_number' in data:
            delivery.tracking_number = data['tracking_number']
        
        delivery.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"更新配送信息失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/delivery/<int:delivery_id>/tracking')
@require_device_id
def get_delivery_tracking(delivery_id):
    """查询物流"""
    try:
        from utils.models import Delivery
        delivery = Delivery.query.get(delivery_id)
        
        if not delivery:
            return jsonify({'success': False, 'error': '配送记录不存在'}), 404
        
        # 模拟物流查询
        tracking_info = {
            'status': delivery.status,
            'tracking_number': delivery.tracking_number,
            'updates': [
                {
                    'time': delivery.created_at.isoformat(),
                    'status': '已发货',
                    'location': '发货地'
                }
            ]
        }
        
        return jsonify({
            'success': True,
            'tracking_info': tracking_info
        })
        
    except Exception as e:
        current_app.logger.error(f"查询物流失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/gallery')
@optional_device_id
def get_gallery():
    """获取作品列表"""
    try:
        tag = request.args.get('tag')
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        
        # 获取已完成的订单作为作品
        query = Order.query.filter(Order.status == 'completed')
        if tag:
            query = query.filter(Order.tags.contains(tag))
        
        orders = query.order_by(Order.created_at.desc()).paginate(
            page=page, per_page=limit, error_out=False
        )
        
        items = []
        for order in orders.items:
            items.append({
                'id': order.id,
                'order_no': order.order_no,
                'image_path': order.processed_image_path,
                'created_at': order.created_at.isoformat(),
                'tags': order.tags.split(',') if order.tags else []
            })
        
        return jsonify({
            'success': True,
            'items': items,
            'total': orders.total,
            'page': page
        })
        
    except Exception as e:
        current_app.logger.error(f"获取作品列表失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/gallery/<int:baji_id>')
@optional_device_id
def get_baji_detail(baji_id):
    """获取作品详情"""
    try:
        order = Order.query.get(baji_id)
        
        if order and order.status == 'completed':
            return jsonify({
                'success': True,
                'baji': {
                    'id': order.id,
                    'order_no': order.order_no,
                    'image_path': order.processed_image_path,
                    'created_at': order.created_at.isoformat(),
                    'tags': order.tags.split(',') if order.tags else [],
                    'like_count': getattr(order, 'like_count', 0)
                }
            })
        else:
            return jsonify({'success': False, 'error': '作品不存在'}), 404
            
    except Exception as e:
        current_app.logger.error(f"获取作品详情失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/gallery/<int:baji_id>/like', methods=['POST'])
@require_device_id
def like_baji(baji_id):
    """点赞作品"""
    try:
        order = Order.query.get(baji_id)
        
        if order and order.status == 'completed':
            # 增加点赞数
            if not hasattr(order, 'like_count'):
                order.like_count = 0
            order.like_count += 1
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'like_count': order.like_count
            })
        else:
            return jsonify({'success': False, 'error': '作品不存在'}), 404
            
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"点赞作品失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/gallery/<int:baji_id>/make', methods=['POST'])
@require_device_id
def make_same_baji(baji_id):
    """制作同款"""
    try:
        order = Order.query.get(baji_id)
        
        if order and order.status == 'completed':
            # 重定向到设计页面，携带原图信息
            redirect_url = f"/design?template={order.id}"
            return jsonify({
                'success': True,
                'redirect_url': redirect_url
            })
        else:
            return jsonify({'success': False, 'error': '作品不存在'}), 404
            
    except Exception as e:
        current_app.logger.error(f"制作同款失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== 案例展示API ====================

@api_bp.route('/cases', methods=['GET'])
def get_cases():
    """获取案例列表"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 12, type=int)
        case_type = request.args.get('type', 'all')
        category = request.args.get('category', '')
        search = request.args.get('search', '')
        
        query = Case.query.filter(Case.is_public == True)
        
        if case_type != 'all':
            query = query.filter(Case.case_type == case_type)
        
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
            'success': True,
            'cases': [case.to_dict() for case in cases.items],
            'total': cases.total,
            'pages': cases.pages,
            'current_page': page
        })
        
    except Exception as e:
        logger.log_error('get_cases_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/cases/<int:case_id>', methods=['GET'])
def get_case_detail(case_id):
    """获取案例详情"""
    try:
        case = Case.query.get_or_404(case_id)
        
        # 增加浏览次数
        case.view_count += 1
        db.session.commit()
        
        # 记录浏览行为（可选，不强制要求device_id）
        device_id = request.headers.get('X-Device-ID')
        interaction = CaseInteraction(
            case_id=case_id,
            device_id=device_id,
            interaction_type='view',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        db.session.add(interaction)
        db.session.commit()
        
        logger.log_operation(
            'view_case',
            'cases',
            case_id,
            {'case_title': case.title},
            request.remote_addr,
            request.headers.get('User-Agent')
        )
        
        return jsonify({
            'success': True,
            'case': case.to_dict()
        })
        
    except Exception as e:
        logger.log_error('get_case_detail_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/cases/<int:case_id>/like', methods=['POST'])
@require_device_id
def like_case(case_id):
    """点赞案例"""
    try:
        device_id = get_device_id_from_request()
        case = Case.query.get_or_404(case_id)
        
        # 检查是否已经点赞（基于设备ID）
        existing_like = CaseInteraction.query.filter_by(
            case_id=case_id,
            device_id=device_id,
            interaction_type='like'
        ).first()
        
        if existing_like:
            return jsonify({
                'success': False,
                'message': '您已经点赞过这个案例了'
            })
        
        # 增加点赞数
        case.like_count += 1
        db.session.commit()
        
        # 记录点赞行为
        interaction = CaseInteraction(
            case_id=case_id,
            device_id=device_id,
            interaction_type='like',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        db.session.add(interaction)
        db.session.commit()
        
        logger.log_operation(
            'like_case',
            'cases',
            case_id,
            {'case_title': case.title},
            request.remote_addr,
            request.headers.get('User-Agent')
        )
        
        return jsonify({
            'success': True,
            'like_count': case.like_count
        })
        
    except Exception as e:
        db.session.rollback()
        logger.log_error('like_case_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/cases/<int:case_id>/make', methods=['POST'])
@require_device_id
def make_same_case(case_id):
    """制作同款"""
    try:
        device_id = get_device_id_from_request()
        case = Case.query.get_or_404(case_id)
        
        # 增加制作数
        case.make_count += 1
        db.session.commit()
        
        # 记录制作行为
        interaction = CaseInteraction(
            case_id=case_id,
            device_id=device_id,
            interaction_type='make',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        db.session.add(interaction)
        db.session.commit()
        
        logger.log_operation(
            'make_same_case',
            'cases',
            case_id,
            {'case_title': case.title},
            request.remote_addr,
            request.headers.get('User-Agent')
        )
        
        return jsonify({
            'success': True,
            'make_count': case.make_count,
            'redirect_url': f'/design?case_id={case_id}'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.log_error('make_same_case_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/cases/<int:case_id>/share', methods=['POST'])
@require_device_id
def share_case(case_id):
    """分享案例"""
    try:
        device_id = get_device_id_from_request()
        case = Case.query.get_or_404(case_id)
        
        # 记录分享行为
        interaction = CaseInteraction(
            case_id=case_id,
            device_id=device_id,
            interaction_type='share',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        db.session.add(interaction)
        db.session.commit()
        
        logger.log_operation(
            'share_case',
            'cases',
            case_id,
            {'case_title': case.title},
            request.remote_addr,
            request.headers.get('User-Agent')
        )
        
        return jsonify({
            'success': True,
            'share_url': f'/view/{case_id}',
            'case_title': case.title
        })
        
    except Exception as e:
        db.session.rollback()
        logger.log_error('share_case_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/cases/featured', methods=['GET'])
def get_featured_cases():
    """获取推荐案例"""
    try:
        limit = request.args.get('limit', 8, type=int)
        
        cases = Case.query.filter(
            Case.is_featured == True,
            Case.is_public == True
        ).order_by(Case.featured_at.desc()).limit(limit).all()
        
        return jsonify({
            'success': True,
            'cases': [case.to_dict() for case in cases]
        })
        
    except Exception as e:
        logger.log_error('get_featured_cases_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/cases/popular', methods=['GET'])
def get_popular_cases():
    """获取热门案例"""
    try:
        limit = request.args.get('limit', 8, type=int)
        
        cases = Case.query.filter(
            Case.is_public == True
        ).order_by(Case.like_count.desc(), Case.make_count.desc()).limit(limit).all()
        
        return jsonify({
            'success': True,
            'cases': [case.to_dict() for case in cases]
        })
        
    except Exception as e:
        logger.log_error('get_popular_cases_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/cases/latest', methods=['GET'])
def get_latest_cases():
    """获取最新案例"""
    try:
        limit = request.args.get('limit', 8, type=int)
        
        cases = Case.query.filter(
            Case.is_public == True
        ).order_by(Case.created_at.desc()).limit(limit).all()
        
        return jsonify({
            'success': True,
            'cases': [case.to_dict() for case in cases]
        })
        
    except Exception as e:
        logger.log_error('get_latest_cases_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== 个性化推荐API ====================

@api_bp.route('/cases/recommended', methods=['GET'])
@require_device_id
def get_recommended_cases():
    """获取个性化推荐案例"""
    try:
        limit = request.args.get('limit', 8, type=int)
        
        # 获取个性化推荐
        recommendations = recommendation_engine.get_recommendations(request.remote_addr, limit)
        
        return jsonify({
            'success': True,
            'cases': recommendations
        })
        
    except Exception as e:
        logger.log_error('get_recommended_cases_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/cases/trending', methods=['GET'])
@optional_device_id
def get_trending_cases():
    """获取趋势案例"""
    try:
        limit = request.args.get('limit', 8, type=int)
        
        # 获取趋势案例
        trending_cases = recommendation_engine.get_trending_cases(limit)
        
        return jsonify({
            'success': True,
            'cases': trending_cases
        })
        
    except Exception as e:
        logger.log_error('get_trending_cases_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/cases/similar/<int:case_id>', methods=['GET'])
def get_similar_cases(case_id):
    """获取相似案例"""
    try:
        limit = request.args.get('limit', 6, type=int)
        
        # 获取参考案例
        reference_case = Case.query.get_or_404(case_id)
        
        # 获取相似案例
        similar_cases = Case.query.filter(
            Case.category == reference_case.category,
            Case.id != case_id,
            Case.is_public == True
        ).order_by(Case.like_count.desc()).limit(limit).all()
        
        # 计算相似度分数
        similar_data = []
        for case in similar_cases:
            score = recommendation_engine._calculate_content_score(case, reference_case)
            case_dict = case.to_dict()
            case_dict['similarity_score'] = score
            similar_data.append(case_dict)
        
        # 按相似度排序
        similar_data.sort(key=lambda x: x['similarity_score'], reverse=True)
        
        return jsonify({
            'success': True,
            'cases': similar_data
        })
        
    except Exception as e:
        logger.log_error('get_similar_cases_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/cases/search', methods=['GET'])
def search_cases():
    """智能搜索案例"""
    try:
        query = request.args.get('q', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 12, type=int)
        
        if not query:
            return jsonify({
                'success': True,
                'cases': [],
                'total': 0,
                'page': page
            })
        
        # 智能搜索：标题、描述、标签
        search_results = Case.query.filter(
            Case.is_public == True,
            db.or_(
                Case.title.contains(query),
                Case.description.contains(query),
                Case.tags.contains(query)
            )
        ).order_by(Case.like_count.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # 计算搜索相关性分数
        cases_with_score = []
        for case in search_results.items:
            score = 0.0
            
            # 标题匹配
            if query.lower() in case.title.lower():
                score += 1.0
            
            # 描述匹配
            if query.lower() in case.description.lower():
                score += 0.5
            
            # 标签匹配
            if case.tags and query.lower() in case.tags.lower():
                score += 0.3
            
            # 案例质量分数
            score += case.like_count * 0.001
            score += case.make_count * 0.002
            
            case_dict = case.to_dict()
            case_dict['search_score'] = score
            cases_with_score.append(case_dict)
        
        # 按搜索分数排序
        cases_with_score.sort(key=lambda x: x['search_score'], reverse=True)
        
        return jsonify({
            'success': True,
            'cases': cases_with_score,
            'total': search_results.total,
            'page': page,
            'query': query
        })
        
    except Exception as e:
        logger.log_error('search_cases_error', str(e), request.remote_addr, request.headers.get('User-Agent'))
        return jsonify({'success': False, 'error': str(e)}), 500
