# models.py - 数据库模型定义
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class Order(db.Model):
    """订单模型"""
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    order_no = db.Column(db.String(32), unique=True, nullable=False)
    device_id = db.Column(db.String(50))  # 设备ID字段
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    original_image_path = db.Column(db.String(255))
    processed_image_path = db.Column(db.String(255))
    preview_image_path = db.Column(db.String(255))
    quantity = db.Column(db.Integer, default=1)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    total_price = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(db.String(20), default='pending')
    payment_method = db.Column(db.String(20))
    payment_status = db.Column(db.String(20), default='unpaid')
    payment_time = db.Column(db.DateTime)
    delivery_status = db.Column(db.String(20), default='no_delivery')  # no_delivery, address_filled, unknown, delivered
    coupon_id = db.Column(db.Integer, db.ForeignKey('coupons.id'))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    coupon = db.relationship('Coupon', foreign_keys=[coupon_id], backref='orders')
    
    def to_dict(self):
        # 查询与该订单相关的配送信息
        delivery_info = None
        try:
            # 查找包含该订单ID的配送记录
            deliveries = Delivery.query.filter(Delivery.order_ids.contains(str(self.id))).all()
            if deliveries:
                # 如果有多个配送记录，取最新的一个
                latest_delivery = max(deliveries, key=lambda d: d.created_at)
                if latest_delivery.tracking_number:
                    delivery_info = f"{latest_delivery.courier_company or '快递'} - {latest_delivery.tracking_number}"
                elif latest_delivery.status == 'delivered':
                    delivery_info = "已送达"
                elif latest_delivery.status == 'shipped':
                    delivery_info = "已发货"
                elif latest_delivery.status == 'pending':
                    delivery_info = "待发货"
        except Exception:
            # 如果查询配送信息失败，不影响主要功能
            pass
        
        return {
            'id': self.id,
            'order_no': self.order_no,
            'device_id': self.device_id,
            'ip_address': self.ip_address,
            'original_image_path': self.original_image_path,
            'processed_image_path': self.processed_image_path,
            'preview_image_path': self.preview_image_path,
            'quantity': self.quantity,
            'unit_price': float(self.unit_price),
            'total_price': float(self.total_price),
            'status': self.status,
            'payment_method': self.payment_method,
            'payment_status': self.payment_status,
            'payment_time': self.payment_time.isoformat() if self.payment_time else None,
            'delivery_status': self.delivery_status,
            'delivery_info': delivery_info,  # 新增物流信息字段
            'coupon_id': self.coupon_id,
            'notes': self.notes,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @staticmethod
    def generate_order_no():
        """生成订单号"""
        from datetime import datetime
        import uuid
        prefix = 'BJI'
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        unique_id = str(uuid.uuid4())[:8].upper()
        return f"{prefix}{timestamp}{unique_id}"

class Coupon(db.Model):
    """券码模型"""
    __tablename__ = 'coupons'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(32), unique=True, nullable=False)
    device_id = db.Column(db.String(50))  # 设备ID字段
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    discount_type = db.Column(db.String(20), default='fixed')  # fixed, percentage
    discount_value = db.Column(db.Numeric(10, 2), nullable=False)
    min_order_amount = db.Column(db.Numeric(10, 2), default=0)
    max_discount_amount = db.Column(db.Numeric(10, 2))
    usage_limit = db.Column(db.Integer, default=1)
    used_count = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    valid_from = db.Column(db.DateTime, default=datetime.utcnow)
    valid_until = db.Column(db.DateTime)
    used_at = db.Column(db.DateTime)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'device_id': self.device_id,
            'amount': float(self.amount),
            'discount_type': self.discount_type,
            'discount_value': float(self.discount_value),
            'min_order_amount': float(self.min_order_amount),
            'max_discount_amount': float(self.max_discount_amount) if self.max_discount_amount else None,
            'usage_limit': self.usage_limit,
            'used_count': self.used_count,
            'is_active': self.is_active,
            'valid_from': self.valid_from.isoformat(),
            'valid_until': self.valid_until.isoformat() if self.valid_until else None,
            'used_at': self.used_at.isoformat() if self.used_at else None,
            'order_id': self.order_id,
            'created_at': self.created_at.isoformat()
        }
    
    def is_valid(self):
        """检查券码是否有效"""
        now = datetime.utcnow()
        return (
            self.is_active and
            self.used_count < self.usage_limit and
            self.valid_from <= now and
            (self.valid_until is None or self.valid_until >= now)
        )
    
    def calculate_discount(self, order_amount):
        """计算折扣金额"""
        if not self.is_valid():
            return 0
        
        if order_amount < self.min_order_amount:
            return 0
        
        if self.discount_type == 'fixed':
            discount = self.discount_value
        else:  # percentage
            discount = order_amount * (self.discount_value / 100)
        
        if self.max_discount_amount:
            discount = min(discount, self.max_discount_amount)
        
        return min(discount, order_amount)
    
    @staticmethod
    def generate_code():
        """生成券码"""
        import random
        import string
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

class Delivery(db.Model):
    """配送模型"""
    __tablename__ = 'deliveries'
    
    id = db.Column(db.Integer, primary_key=True)
    delivery_no = db.Column(db.String(32), unique=True, nullable=False)
    device_id = db.Column(db.String(50))  # 设备ID字段
    order_ids = db.Column(db.Text, nullable=False)  # JSON格式存储订单ID列表
    recipient_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(100))
    address = db.Column(db.Text, nullable=False)
    city = db.Column(db.String(50))
    province = db.Column(db.String(50))
    postal_code = db.Column(db.String(20))
    delivery_method = db.Column(db.String(20), default='standard')
    delivery_fee = db.Column(db.Numeric(10, 2), default=0)
    status = db.Column(db.String(20), default='pending')
    courier_company = db.Column(db.String(50))  # 快递公司
    tracking_number = db.Column(db.String(100))  # 快递单号
    shipped_at = db.Column(db.DateTime)
    delivered_at = db.Column(db.DateTime)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'delivery_no': self.delivery_no,
            'device_id': self.device_id,
            'order_ids': [int(id.strip()) for id in self.order_ids.split(',') if id.strip()] if self.order_ids else [],
            'recipient_name': self.recipient_name,
            'phone': self.phone,
            'email': self.email,
            'address': self.address,
            'city': self.city,
            'province': self.province,
            'postal_code': self.postal_code,
            'delivery_method': self.delivery_method,
            'delivery_fee': float(self.delivery_fee),
            'status': self.status,
            'courier_company': self.courier_company,
            'tracking_number': self.tracking_number,
            'shipped_at': self.shipped_at.isoformat() if self.shipped_at else None,
            'delivered_at': self.delivered_at.isoformat() if self.delivered_at else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @staticmethod
    def generate_delivery_no():
        """生成配送单号"""
        from datetime import datetime
        import uuid
        prefix = 'DLV'
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        unique_id = str(uuid.uuid4())[:6].upper()
        return f"{prefix}{timestamp}{unique_id}"

class SystemConfig(db.Model):
    """系统配置模型"""
    __tablename__ = 'system_configs'
    
    id = db.Column(db.Integer, primary_key=True)
    config_key = db.Column(db.String(100), unique=True, nullable=False)
    config_value = db.Column(db.Text)
    config_type = db.Column(db.String(20), default='string')
    description = db.Column(db.Text)
    is_public = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'config_key': self.config_key,
            'config_value': self.config_value,
            'config_type': self.config_type,
            'description': self.description,
            'is_public': self.is_public,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Case(db.Model):
    """案例模型"""
    __tablename__ = 'cases'
    
    id = db.Column(db.Integer, primary_key=True)
    case_no = db.Column(db.String(32), unique=True, nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'))
    device_id = db.Column(db.String(50))  # 设备ID字段
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    original_image_path = db.Column(db.String(255), nullable=False)
    preview_image_path = db.Column(db.String(255), nullable=False)
    final_image_path = db.Column(db.String(255))
    case_type = db.Column(db.String(20), default='user')
    status = db.Column(db.String(20), default='active')
    is_featured = db.Column(db.Boolean, default=False)
    is_public = db.Column(db.Boolean, default=True)
    tags = db.Column(db.Text)  # JSON格式
    category = db.Column(db.String(50))
    like_count = db.Column(db.Integer, default=0)
    make_count = db.Column(db.Integer, default=0)
    view_count = db.Column(db.Integer, default=0)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    featured_at = db.Column(db.DateTime)
    
    # 关系
    order = db.relationship('Order', foreign_keys=[order_id], backref='cases')
    interactions = db.relationship('CaseInteraction', backref='case', lazy='dynamic')
    
    @staticmethod
    def generate_case_no():
        """生成案例编号"""
        from datetime import datetime
        import uuid
        prefix = 'CS'
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        unique_id = str(uuid.uuid4())[:6].upper()
        return f"{prefix}{timestamp}{unique_id}"
    
    def to_dict(self):
        return {
            'id': self.id,
            'case_no': self.case_no,
            'order_id': self.order_id,
            'device_id': self.device_id,
            'title': self.title,
            'description': self.description,
            'original_image_path': self.original_image_path,
            'preview_image_path': self.preview_image_path,
            'final_image_path': self.final_image_path,
            'case_type': self.case_type,
            'status': self.status,
            'is_featured': self.is_featured,
            'is_public': self.is_public,
            'tags': json.loads(self.tags) if self.tags else [],
            'category': self.category,
            'like_count': self.like_count,
            'make_count': self.make_count,
            'view_count': self.view_count,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'featured_at': self.featured_at.isoformat() if self.featured_at else None
        }
    
    @classmethod
    def create_from_order(cls, order):
        """从订单创建案例"""
        # 优先使用处理后的图片作为预览图片，因为这才是真正的吧唧效果图
        # 如果没有处理后的图片，则使用预览图片，最后才回退到原始图片
        preview_image = order.processed_image_path or order.preview_image_path or order.original_image_path
        final_image = order.processed_image_path or order.original_image_path
        
        case = cls(
            case_no=cls.generate_case_no(),
            order_id=order.id,
            device_id=order.device_id,
            title=f"吧唧作品 {order.order_no}",
            description="用户创作的吧唧作品",
            original_image_path=order.original_image_path,
            preview_image_path=preview_image,  # 优先使用处理后的图片作为预览图
            final_image_path=final_image,  # 最终图片路径
            case_type='user',
            status='active',
            is_public=True,
            tags=json.dumps(['用户作品']),
            category='用户创作',
            ip_address=order.ip_address,
            user_agent=order.user_agent
        )
        return case

class CaseInteraction(db.Model):
    """案例互动模型"""
    __tablename__ = 'case_interactions'
    
    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.id'), nullable=False)
    device_id = db.Column(db.String(50))  # 设备ID字段
    interaction_type = db.Column(db.String(20), nullable=False)  # like, make, view, share
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'case_id': self.case_id,
            'device_id': self.device_id,
            'interaction_type': self.interaction_type,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'created_at': self.created_at.isoformat()
        }

class DeviceSession(db.Model):
    """设备会话模型"""
    __tablename__ = 'device_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.String(50), unique=True, nullable=False)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    first_seen = db.Column(db.DateTime, default=datetime.utcnow)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'first_seen': self.first_seen.isoformat(),
            'last_seen': self.last_seen.isoformat(),
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @staticmethod
    def validate_device_id(device_id):
        """验证设备ID格式"""
        if not device_id:
            return False
        
        # 设备ID格式：DEV + 13位时间戳 + 9位随机字符
        if not device_id.startswith('DEV'):
            return False
        
        if len(device_id) != 25:  # DEV + 13 + 9 = 25
            return False
        
        # 检查时间戳部分是否为数字
        timestamp_part = device_id[3:16]
        if not timestamp_part.isdigit():
            return False
        
        return True
    
    @staticmethod
    def generate_device_id():
        """生成设备ID"""
        import time
        import random
        import string
        
        timestamp = str(int(time.time() * 1000))  # 13位毫秒时间戳
        random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=9))
        return f"DEV{timestamp}{random_part}"

class PrintJob(db.Model):
    """打印任务模型"""
    __tablename__ = 'print_jobs'
    
    id = db.Column(db.Integer, primary_key=True)
    print_job_no = db.Column(db.String(32), unique=True, nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    order_no = db.Column(db.String(32), nullable=False)
    device_id = db.Column(db.String(50))
    quantity = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, printing, completed, failed
    print_type = db.Column(db.String(20), default='single')  # single, batch
    printer_name = db.Column(db.String(100))
    print_settings = db.Column(db.Text)  # JSON格式存储打印设置
    error_message = db.Column(db.Text)
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    created_by = db.Column(db.String(50), default='admin')  # 创建者
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    order = db.relationship('Order', foreign_keys=[order_id], backref='print_jobs')
    
    def to_dict(self):
        return {
            'id': self.id,
            'print_job_no': self.print_job_no,
            'order_id': self.order_id,
            'order_no': self.order_no,
            'device_id': self.device_id,
            'quantity': self.quantity,
            'status': self.status,
            'print_type': self.print_type,
            'printer_name': self.printer_name,
            'print_settings': json.loads(self.print_settings) if self.print_settings else {},
            'error_message': self.error_message,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_by': self.created_by,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @staticmethod
    def generate_print_job_no():
        """生成打印任务号"""
        from datetime import datetime
        import uuid
        prefix = 'PRT'
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        unique_id = str(uuid.uuid4())[:6].upper()
        return f"{prefix}{timestamp}{unique_id}"

class FileManagement(db.Model):
    """文件管理模型"""
    __tablename__ = 'file_management'
    
    id = db.Column(db.Integer, primary_key=True)
    file_type = db.Column(db.String(20), nullable=False)  # upload, export, log
    file_path = db.Column(db.String(500), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    file_hash = db.Column(db.String(32), nullable=False)
    mime_type = db.Column(db.String(100), nullable=False)
    upload_date = db.Column(db.Date, nullable=False)
    access_count = db.Column(db.Integer, default=0)
    last_accessed = db.Column(db.DateTime)
    is_temp = db.Column(db.Boolean, default=False)
    expires_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'file_type': self.file_type,
            'file_path': self.file_path,
            'original_filename': self.original_filename,
            'file_size': self.file_size,
            'file_hash': self.file_hash,
            'mime_type': self.mime_type,
            'upload_date': self.upload_date.isoformat(),
            'access_count': self.access_count,
            'last_accessed': self.last_accessed.isoformat() if self.last_accessed else None,
            'is_temp': self.is_temp,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

