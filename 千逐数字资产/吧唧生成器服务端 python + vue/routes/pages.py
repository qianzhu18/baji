# routes/pages.py - 页面路由
from flask import Blueprint, render_template, send_from_directory, send_file
import os

pages_bp = Blueprint('pages', __name__)

@pages_bp.route('/')
def index():
    """首页"""
    return render_template('index.html')

@pages_bp.route('/design')
def design():
    """设计页面"""
    return render_template('design.html')

@pages_bp.route('/order/<order_no>')
def order(order_no):
    """订单页面"""
    from utils.models import Order
    import json
    import os
    
    order = Order.query.filter_by(order_no=order_no).first()
    
    if order:
        # 解析订单详情
        order_data = order.to_dict()
        if order.notes:
            notes_data = json.loads(order.notes)
            order_data.update(notes_data)
        
        # 处理图片文件名
        if order.processed_image_path:
            order_data['processed_image_filename'] = os.path.basename(order.processed_image_path)
        else:
            order_data['processed_image_filename'] = None
            
        # 处理预览图片文件名
        if order.preview_image_path:
            order_data['preview_image_filename'] = os.path.basename(order.preview_image_path)
        else:
            order_data['preview_image_filename'] = None
            
        return render_template('order.html', order=order_data)
    else:
        return "订单不存在", 404

@pages_bp.route('/orders')
def orders():
    """订单列表页面"""
    return render_template('orders.html')

@pages_bp.route('/invoice/<order_no>')
def invoice(order_no):
    """发票页面"""
    from utils.models import Order
    order = Order.query.filter_by(order_no=order_no).first()
    
    if order:
        return render_template('invoice.html', order_no=order_no, order=order.to_dict())
    else:
        return "订单不存在", 404

@pages_bp.route('/delivery')
def delivery():
    """配送页面"""
    return render_template('delivery.html')

@pages_bp.route('/view/<baji_id>')
def view_baji(baji_id):
    """吧唧查看页面"""
    from utils.models import Order, Case
    order = Order.query.get(baji_id)
    
    if order and order.status == 'completed':
        return render_template('view.html', baji_id=baji_id, order=order.to_dict())
    else:
        return "作品不存在", 404

@pages_bp.route('/case/<int:case_id>')
def view_case(case_id):
    """案例详情页面"""
    from utils.models import Case
    case = Case.query.get(case_id)
    
    if case and case.is_public:
        return render_template('case_detail.html', case=case.to_dict())
    else:
        return "案例不存在", 404

@pages_bp.route('/gallery')
def gallery():
    """作品列表页面"""
    return render_template('gallery.html')

@pages_bp.route('/history')
def history():
    """用户制作历史页面"""
    return render_template('history.html')

@pages_bp.route('/error')
def error():
    """错误页面"""
    return render_template('error.html')

@pages_bp.route('/payment')
def payment():
    """支付页面"""
    from flask import request
    from utils.models import Order
    
    order_no = request.args.get('order_no')
    device_id = request.args.get('device_id')  # 从URL参数获取设备ID
    
    if order_no:
        # 查询指定订单（如果提供了设备ID，则基于设备ID过滤）
        if device_id:
            order = Order.query.filter_by(order_no=order_no, device_id=device_id).first()
        else:
            order = Order.query.filter_by(order_no=order_no).first()
            
        if order and order.status in ['pending', 'processing']:  # 允许processing状态的订单进入支付页面
            order_info = {
                'quantity': order.quantity,
                'unit_price': order.unit_price,
                'total_price': order.total_price
            }
            return render_template('payment.html', 
                                  orderInfo=order_info,
                                  orderNo=order_no,
                                  couponInfo=None)
        else:
            # 订单不存在或状态不正确
            return "订单不存在或状态不正确", 404
    else:
        # 提供默认的订单信息
        default_order_info = {
            'quantity': 1,
            'unit_price': 15.00,
            'total_price': 15.00
        }
        return render_template('payment.html', 
                              orderInfo=default_order_info,
                              orderNo='DEMO001',
                              couponInfo=None)

# 管理端页面路由
@pages_bp.route('/admin/login')
def admin_login_page():
    """管理员登录页面"""
    return render_template('admin/login.html')

@pages_bp.route('/admin/dashboard')
def admin_dashboard():
    """管理员仪表盘"""
    from utils.models import Order
    # 获取一些示例数据
    recent_orders = Order.query.order_by(Order.created_at.desc()).limit(5).all()
    # 转换为字典格式供前端使用
    orders_data = [order.to_dict() for order in recent_orders] if recent_orders else []
    return render_template('admin/dashboard.html', recentOrders=orders_data)

@pages_bp.route('/admin/orders')
def admin_orders():
    """管理端订单管理页面"""
    return render_template('admin/orders.html')

@pages_bp.route('/admin/coupons')
def admin_coupons():
    """管理端券码管理页面"""
    return render_template('admin/coupons.html')

@pages_bp.route('/admin/print')
def admin_print():
    """管理端打印管理页面"""
    return render_template('admin/print.html')

@pages_bp.route('/admin/delivery')
def admin_delivery():
    """管理端配送管理页面"""
    return render_template('admin/delivery.html')

@pages_bp.route('/admin/devices')
def admin_devices():
    """管理端设备管理页面"""
    return render_template('admin/devices.html')

@pages_bp.route('/admin/cases')
def admin_cases():
    """管理端案例管理页面"""
    from utils.models import Case
    # 获取案例统计数据
    stats = {
        'total': Case.query.count(),
        'featured': Case.query.filter(Case.is_featured == True).count(),
        'public': Case.query.filter(Case.is_public == True).count(),
        'private': Case.query.filter(Case.is_public == False).count()
    }
    # 获取案例列表
    cases = Case.query.order_by(Case.created_at.desc()).limit(10).all()
    cases_data = [case.to_dict() for case in cases] if cases else []
    return render_template('admin/cases.html', stats=stats, cases=cases_data)

@pages_bp.route('/download/<order_no>')
def download_baji(order_no):
    """下载吧唧文件"""
    from utils.models import Order
    from flask import current_app, abort
    import os
    
    # 查找订单
    order = Order.query.filter_by(order_no=order_no).first()
    if not order:
        abort(404)
    
    # 检查订单状态 - 允许processing状态的订单下载（支付完成后）
    if order.status not in ['completed', 'processing']:
        abort(404, "订单尚未完成")
    
    # 检查支付状态
    if order.payment_status != 'paid':
        abort(404, "订单尚未支付")
    
    # 检查文件是否存在
    if not order.processed_image_path:
        abort(404, "文件不存在")
    
    # 规范化文件路径
    file_path = order.processed_image_path.replace('\\', '/')
    
    # 如果是相对路径，转换为绝对路径
    if not os.path.isabs(file_path):
        from flask import current_app
        # Flask的root_path是config目录，需要回到项目根目录
        project_root = os.path.dirname(current_app.root_path)
        file_path = os.path.join(project_root, file_path)
    
    if not os.path.exists(file_path):
        abort(404, "文件不存在")
    
    # 记录下载事件
    from utils.logger import logger
    logger.log_operation('download_baji', 'orders', order.id, {
        'order_no': order_no,
        'file_path': file_path
    })
    
    # 返回文件
    filename = f"baji_{order_no}.png"
    return send_file(file_path, as_attachment=True, download_name=filename)

@pages_bp.route('/favicon.ico')
def favicon():
    """网站图标"""
    try:
        # 使用绝对路径
        import os
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        static_images_path = os.path.join(project_root, 'static', 'icons')
        return send_from_directory(static_images_path, 'favicon.ico', mimetype='image/vnd.microsoft.icon')
    except Exception:
        # 如果找不到文件，返回404
        return "Not Found", 404
