# test_device_based_user_isolation.py
"""
基于设备ID的用户绑定功能测试用例
测试用户隔离、设备ID验证、后台管理等功能
"""

import os
import sys
import json
import unittest
import requests
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import create_app
from utils.models import db, Order, Case, CaseInteraction, Coupon, Delivery, DeviceSession
from utils.logger import logger

class DeviceIdUserIsolationTest(unittest.TestCase):
    """设备ID用户隔离测试"""
    
    @classmethod
    def setUpClass(cls):
        """测试类初始化"""
        cls.app = create_app()
        cls.app.config['TESTING'] = True
        cls.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        cls.client = cls.app.test_client()
        
        with cls.app.app_context():
            db.create_all()
            cls.setup_test_data()
    
    @classmethod
    def tearDownClass(cls):
        """测试类清理"""
        with cls.app.app_context():
            db.drop_all()
    
    @classmethod
    def setup_test_data(cls):
        """设置测试数据"""
        # 创建设备会话
        devices = [
            DeviceSession(
                device_id="DEV1703123456789ABC123DEF",
                ip_address="192.168.1.100",
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                first_seen=datetime.utcnow(),
                last_seen=datetime.utcnow(),
                is_active=True
            ),
            DeviceSession(
                device_id="DEV1703123456790XYZ789GHI",
                ip_address="192.168.1.101",
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                first_seen=datetime.utcnow(),
                last_seen=datetime.utcnow(),
                is_active=True
            ),
            DeviceSession(
                device_id="DEV1703123456791MNO456JKL",
                ip_address="192.168.1.102",
                user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
                first_seen=datetime.utcnow(),
                last_seen=datetime.utcnow(),
                is_active=False
            )
        ]
        
        for device in devices:
            db.session.add(device)
        
        # 创建测试订单
        orders = [
            Order(
                order_no="BJI20240101100001ABC123",
                device_id="DEV1703123456789ABC123DEF",
                ip_address="192.168.1.100",
                original_image_path="/uploads/2025/01/test_image_1.jpg",
                processed_image_path="/static/exports/BJI20240101100001ABC123.png",
                preview_image_path="/static/exports/preview_BJI20240101100001ABC123.png",
                quantity=1,
                unit_price=15.00,
                total_price=15.00,
                status="completed",
                payment_method="coupon",
                payment_status="paid",
                payment_time=datetime.utcnow(),
                notes='{"edit_params": {"scale": 1.0, "rotation": 0, "offset_x": 0, "offset_y": 0}}',
                created_at=datetime.utcnow()
            ),
            Order(
                order_no="BJI20240101100002ABC124",
                device_id="DEV1703123456789ABC123DEF",
                ip_address="192.168.1.100",
                original_image_path="/uploads/2025/01/test_image_2.jpg",
                processed_image_path="/static/exports/BJI20240101100002ABC124.png",
                preview_image_path="/static/exports/preview_BJI20240101100002ABC124.png",
                quantity=2,
                unit_price=15.00,
                total_price=30.00,
                status="pending",
                payment_method="coupon",
                payment_status="unpaid",
                notes='{"edit_params": {"scale": 1.2, "rotation": 15, "offset_x": 10, "offset_y": -5}}',
                created_at=datetime.utcnow()
            ),
            Order(
                order_no="BJI20240101100003XYZ789",
                device_id="DEV1703123456790XYZ789GHI",
                ip_address="192.168.1.101",
                original_image_path="/uploads/2025/01/test_image_3.jpg",
                processed_image_path="/static/exports/BJI20240101100003XYZ789.png",
                preview_image_path="/static/exports/preview_BJI20240101100003XYZ789.png",
                quantity=1,
                unit_price=15.00,
                total_price=15.00,
                status="completed",
                payment_method="coupon",
                payment_status="paid",
                payment_time=datetime.utcnow(),
                notes='{"edit_params": {"scale": 0.8, "rotation": -10, "offset_x": -5, "offset_y": 10}}',
                created_at=datetime.utcnow()
            ),
            Order(
                order_no="BJI20240101100004MNO456",
                device_id="DEV1703123456791MNO456JKL",
                ip_address="192.168.1.102",
                original_image_path="/uploads/2025/01/test_image_4.jpg",
                processed_image_path=None,
                preview_image_path="/static/exports/preview_BJI20240101100004MNO456.png",
                quantity=1,
                unit_price=15.00,
                total_price=15.00,
                status="processing",
                payment_method="coupon",
                payment_status="paid",
                payment_time=datetime.utcnow(),
                notes='{"edit_params": {"scale": 1.5, "rotation": 30, "offset_x": 20, "offset_y": -10}}',
                created_at=datetime.utcnow()
            )
        ]
        
        for order in orders:
            db.session.add(order)
        
        # 创建测试案例
        cases = [
            Case(
                case_no="CS20240101100001ABC123",
                order_id=1,
                device_id="DEV1703123456789ABC123DEF",
                title="测试案例1",
                description="设备1的第一个测试案例",
                original_image_path="/uploads/2025/01/test_image_1.jpg",
                preview_image_path="/static/exports/preview_BJI20240101100001ABC123.png",
                final_image_path="/static/exports/BJI20240101100001ABC123.png",
                case_type="user",
                status="active",
                is_featured=False,
                is_public=True,
                tags='["测试", "设备1"]',
                category="用户创作",
                like_count=5,
                make_count=2,
                view_count=15,
                ip_address="192.168.1.100",
                created_at=datetime.utcnow()
            )
        ]
        
        for case in cases:
            db.session.add(case)
        
        # 创建测试券码
        coupons = [
            Coupon(
                code="TEST001",
                device_id="DEV1703123456789ABC123DEF",
                amount=15.00,
                discount_type="fixed",
                discount_value=5.00,
                min_order_amount=10.00,
                usage_limit=1,
                used_count=1,
                is_active=True,
                valid_from=datetime.utcnow(),
                valid_until=datetime.utcnow() + timedelta(days=365),
                used_at=datetime.utcnow(),
                order_id=1,
                created_at=datetime.utcnow()
            ),
            Coupon(
                code="TEST002",
                device_id="DEV1703123456790XYZ789GHI",
                amount=15.00,
                discount_type="percentage",
                discount_value=20.00,
                min_order_amount=15.00,
                max_discount_amount=10.00,
                usage_limit=1,
                used_count=1,
                is_active=True,
                valid_from=datetime.utcnow(),
                valid_until=datetime.utcnow() + timedelta(days=365),
                used_at=datetime.utcnow(),
                order_id=3,
                created_at=datetime.utcnow()
            )
        ]
        
        for coupon in coupons:
            db.session.add(coupon)
        
        # 创建测试配送
        deliveries = [
            Delivery(
                delivery_no="DLV20240101100001ABC123",
                order_ids="1,2",
                device_id="DEV1703123456789ABC123DEF",
                recipient_name="张三",
                phone="13800138000",
                email="zhangsan@example.com",
                address="北京市朝阳区测试街道123号",
                city="北京",
                province="北京",
                postal_code="100000",
                delivery_method="standard",
                delivery_fee=0.00,
                status="pending",
                notes="设备1的配送订单",
                created_at=datetime.utcnow()
            )
        ]
        
        for delivery in deliveries:
            db.session.add(delivery)
        
        # 创建测试案例互动
        interactions = [
            CaseInteraction(
                case_id=1,
                device_id="DEV1703123456789ABC123DEF",
                interaction_type="like",
                ip_address="192.168.1.100",
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                created_at=datetime.utcnow()
            ),
            CaseInteraction(
                case_id=1,
                device_id="DEV1703123456790XYZ789GHI",
                interaction_type="view",
                ip_address="192.168.1.101",
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                created_at=datetime.utcnow()
            ),
            CaseInteraction(
                case_id=1,
                device_id="DEV1703123456791MNO456JKL",
                interaction_type="make",
                ip_address="192.168.1.102",
                user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
                created_at=datetime.utcnow()
            )
        ]
        
        for interaction in interactions:
            db.session.add(interaction)
        
        db.session.commit()
    
    def test_device_id_validation(self):
        """测试设备ID验证"""
        # 测试有效设备ID
        response = self.client.get('/api/v1/orders', 
                                 headers={'X-Device-ID': 'DEV1703123456789ABC123DEF'})
        self.assertEqual(response.status_code, 200)
        
        # 测试无效设备ID格式
        response = self.client.get('/api/v1/orders', 
                                 headers={'X-Device-ID': 'INVALID_ID'})
        self.assertEqual(response.status_code, 400)
        
        # 测试缺失设备ID
        response = self.client.get('/api/v1/orders')
        self.assertEqual(response.status_code, 400)
    
    def test_user_isolation_orders(self):
        """测试用户订单隔离"""
        # 设备1查询订单
        response = self.client.get('/api/v1/orders', 
                                 headers={'X-Device-ID': 'DEV1703123456789ABC123DEF'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data['orders']), 2)  # 设备1有2个订单
        
        # 设备2查询订单
        response = self.client.get('/api/v1/orders', 
                                 headers={'X-Device-ID': 'DEV1703123456790XYZ789GHI'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data['orders']), 1)  # 设备2有1个订单
        
        # 设备3查询订单
        response = self.client.get('/api/v1/orders', 
                                 headers={'X-Device-ID': 'DEV1703123456791MNO456JKL'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data['orders']), 1)  # 设备3有1个订单
    
    def test_user_isolation_cases(self):
        """测试用户案例隔离"""
        # 设备1查询案例
        response = self.client.get('/api/v1/cases', 
                                 headers={'X-Device-ID': 'DEV1703123456789ABC123DEF'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data['cases']), 1)  # 设备1有1个案例
        
        # 设备2查询案例
        response = self.client.get('/api/v1/cases', 
                                 headers={'X-Device-ID': 'DEV1703123456790XYZ789GHI'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data['cases']), 0)  # 设备2没有案例
    
    def test_user_isolation_coupons(self):
        """测试用户券码隔离"""
        # 设备1查询券码
        response = self.client.get('/api/v1/coupons', 
                                 headers={'X-Device-ID': 'DEV1703123456789ABC123DEF'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data['coupons']), 1)  # 设备1有1个券码
        
        # 设备2查询券码
        response = self.client.get('/api/v1/coupons', 
                                 headers={'X-Device-ID': 'DEV1703123456790XYZ789GHI'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data['coupons']), 1)  # 设备2有1个券码
    
    def test_user_isolation_deliveries(self):
        """测试用户配送隔离"""
        # 设备1查询配送
        response = self.client.get('/api/v1/deliveries', 
                                 headers={'X-Device-ID': 'DEV1703123456789ABC123DEF'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data['deliveries']), 1)  # 设备1有1个配送
        
        # 设备2查询配送
        response = self.client.get('/api/v1/deliveries', 
                                 headers={'X-Device-ID': 'DEV1703123456790XYZ789GHI'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data['deliveries']), 0)  # 设备2没有配送
    
    def test_user_isolation_case_interactions(self):
        """测试用户案例互动隔离"""
        # 设备1查询案例互动
        response = self.client.get('/api/v1/cases/1/interactions', 
                                 headers={'X-Device-ID': 'DEV1703123456789ABC123DEF'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data['interactions']), 1)  # 设备1有1个互动
        
        # 设备2查询案例互动
        response = self.client.get('/api/v1/cases/1/interactions', 
                                 headers={'X-Device-ID': 'DEV1703123456790XYZ789GHI'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data['interactions']), 1)  # 设备2有1个互动
    
    def test_admin_access_all_data(self):
        """测试管理员访问所有数据"""
        # 模拟管理员登录
        with self.client.session_transaction() as sess:
            sess['admin_logged_in'] = True
        
        # 管理员查询所有订单
        response = self.client.get('/api/v1/admin/orders')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data['orders']), 4)  # 管理员可以看到所有4个订单
        
        # 管理员按设备ID筛选订单
        response = self.client.get('/api/v1/admin/orders?device_id=DEV1703123456789ABC123DEF')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data['orders']), 2)  # 设备1的2个订单
    
    def test_device_session_management(self):
        """测试设备会话管理"""
        # 查询设备会话
        response = self.client.get('/api/v1/admin/devices')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data['devices']), 3)  # 3个设备
        
        # 查询特定设备会话
        response = self.client.get('/api/v1/admin/devices/DEV1703123456789ABC123DEF')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['device']['device_id'], 'DEV1703123456789ABC123DEF')
    
    def test_order_creation_with_device_id(self):
        """测试带设备ID的订单创建"""
        order_data = {
            'image': '/uploads/test.jpg',
            'edit_params': {
                'scale': 1.0,
                'rotation': 0,
                'offset_x': 0,
                'offset_y': 0
            },
            'quantity': 1
        }
        
        # 带设备ID创建订单
        response = self.client.post('/api/v1/orders', 
                                  json=order_data,
                                  headers={'X-Device-ID': 'DEV1703123456789ABC123DEF'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        
        # 验证订单包含设备ID
        order = Order.query.filter_by(order_no=data['order_no']).first()
        self.assertEqual(order.device_id, 'DEV1703123456789ABC123DEF')
    
    def test_case_creation_with_device_id(self):
        """测试带设备ID的案例创建"""
        case_data = {
            'title': '测试案例',
            'description': '测试描述',
            'order_id': 1
        }
        
        # 带设备ID创建案例
        response = self.client.post('/api/v1/cases', 
                                  json=case_data,
                                  headers={'X-Device-ID': 'DEV1703123456789ABC123DEF'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        
        # 验证案例包含设备ID
        case = Case.query.filter_by(case_no=data['case_no']).first()
        self.assertEqual(case.device_id, 'DEV1703123456789ABC123DEF')
    
    def test_coupon_creation_with_device_id(self):
        """测试带设备ID的券码创建"""
        coupon_data = {
            'amount': 15.00,
            'discount_type': 'fixed',
            'discount_value': 5.00,
            'min_order_amount': 10.00,
            'usage_limit': 1
        }
        
        # 带设备ID创建券码
        response = self.client.post('/api/v1/admin/coupons', 
                                   json=coupon_data,
                                   headers={'X-Device-ID': 'DEV1703123456789ABC123DEF'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        
        # 验证券码包含设备ID
        coupon = Coupon.query.filter_by(code=data['code']).first()
        self.assertEqual(coupon.device_id, 'DEV1703123456789ABC123DEF')
    
    def test_delivery_creation_with_device_id(self):
        """测试带设备ID的配送创建"""
        delivery_data = {
            'order_ids': '1,2',
            'recipient_name': '李四',
            'phone': '13900139000',
            'email': 'lisi@example.com',
            'address': '上海市浦东新区测试路456号',
            'city': '上海',
            'province': '上海',
            'postal_code': '200000'
        }
        
        # 带设备ID创建配送
        response = self.client.post('/api/v1/admin/deliveries', 
                                  json=delivery_data,
                                  headers={'X-Device-ID': 'DEV1703123456789ABC123DEF'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        
        # 验证配送包含设备ID
        delivery = Delivery.query.filter_by(delivery_no=data['delivery_no']).first()
        self.assertEqual(delivery.device_id, 'DEV1703123456789ABC123DEF')
    
    def test_case_interaction_with_device_id(self):
        """测试带设备ID的案例互动"""
        interaction_data = {
            'interaction_type': 'like'
        }
        
        # 带设备ID创建案例互动
        response = self.client.post('/api/v1/cases/1/interactions', 
                                  json=interaction_data,
                                  headers={'X-Device-ID': 'DEV1703123456789ABC123DEF'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        
        # 验证互动包含设备ID
        interaction = CaseInteraction.query.filter_by(id=data['interaction_id']).first()
        self.assertEqual(interaction.device_id, 'DEV1703123456789ABC123DEF')
    
    def test_cross_device_access_denied(self):
        """测试跨设备访问被拒绝"""
        # 设备1尝试访问设备2的订单
        response = self.client.get('/api/v1/orders/BJI20240101100003XYZ789', 
                                 headers={'X-Device-ID': 'DEV1703123456789ABC123DEF'})
        self.assertEqual(response.status_code, 403)  # 应该被拒绝
        
        # 设备2尝试访问设备1的订单
        response = self.client.get('/api/v1/orders/BJI20240101100001ABC123', 
                                 headers={'X-Device-ID': 'DEV1703123456790XYZ789GHI'})
        self.assertEqual(response.status_code, 403)  # 应该被拒绝
    
    def test_inactive_device_access(self):
        """测试非活跃设备访问"""
        # 非活跃设备尝试访问
        response = self.client.get('/api/v1/orders', 
                                 headers={'X-Device-ID': 'DEV1703123456791MNO456JKL'})
        self.assertEqual(response.status_code, 403)  # 应该被拒绝
    
    def test_device_id_format_validation(self):
        """测试设备ID格式验证"""
        invalid_device_ids = [
            'INVALID',
            'DEV123',
            'DEV1703123456789',
            'DEV1703123456789ABC123DEFEXTRA',
            '',
            None
        ]
        
        for device_id in invalid_device_ids:
            response = self.client.get('/api/v1/orders', 
                                     headers={'X-Device-ID': device_id})
            self.assertEqual(response.status_code, 400)
    
    def test_device_session_update(self):
        """测试设备会话更新"""
        # 模拟设备访问
        response = self.client.get('/api/v1/orders', 
                                 headers={'X-Device-ID': 'DEV1703123456789ABC123DEF'})
        self.assertEqual(response.status_code, 200)
        
        # 验证设备会话已更新
        device = DeviceSession.query.filter_by(device_id='DEV1703123456789ABC123DEF').first()
        self.assertIsNotNone(device)
        self.assertTrue(device.is_active)
    
    def test_data_migration_compatibility(self):
        """测试数据迁移兼容性"""
        # 创建没有设备ID的旧订单
        old_order = Order(
            order_no="BJI20240101100005OLD001",
            ip_address="192.168.1.103",
            original_image_path="/uploads/old_image.jpg",
            quantity=1,
            unit_price=15.00,
            total_price=15.00,
            status="completed",
            payment_method="coupon",
            payment_status="paid",
            notes='{"edit_params": {"scale": 1.0, "rotation": 0, "offset_x": 0, "offset_y": 0}}',
            created_at=datetime.utcnow()
        )
        db.session.add(old_order)
        db.session.commit()
        
        # 为旧订单分配设备ID
        old_order.device_id = 'DEV1703123456792OLD001ABC'
        db.session.commit()
        
        # 验证旧订单现在有设备ID
        self.assertEqual(old_order.device_id, 'DEV1703123456792OLD001ABC')
        
        # 验证旧订单可以被查询
        response = self.client.get('/api/v1/orders', 
                                 headers={'X-Device-ID': 'DEV1703123456792OLD001ABC'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data['orders']), 1)

if __name__ == '__main__':
    unittest.main()
