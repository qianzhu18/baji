# test_baji_generator_app.py - 吧唧生成器应用测试脚本
import unittest
import os
import tempfile
import json
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.app_factory import create_app
from utils.models import Order, Coupon, Delivery, SystemConfig, OperationLog, db

class BajiGeneratorTestCase(unittest.TestCase):
    def setUp(self):
        """测试前准备"""
        self.app = create_app('testing')
        self.client = self.app.test_client()
        
        with self.app.app_context():
            db.create_all()
    
    def tearDown(self):
        """测试后清理"""
        with self.app.app_context():
            db.drop_all()
    
    def test_index_page(self):
        """测试首页"""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'吧唧生成器', response.data)
    
    def test_design_page(self):
        """测试设计页面"""
        response = self.client.get('/design')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'设计页面', response.data)
    
    def test_admin_login_page(self):
        """测试管理员登录页面"""
        response = self.client.get('/admin/login')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'管理员登录', response.data)
    
    def test_admin_login_api(self):
        """测试管理员登录API"""
        # 测试错误密码
        response = self.client.post('/api/v1/admin/login', 
                               json={'password': 'wrong_password'})
        self.assertEqual(response.status_code, 401)
        
        # 测试正确密码
        response = self.client.post('/api/v1/admin/login', 
                               json={'password': 'admin123'})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])
    
    def test_coupon_generation(self):
        """测试券码生成"""
        # 先登录
        self.client.post('/api/v1/admin/login', json={'password': 'admin123'})
        
        # 生成券码
        response = self.client.post('/api/v1/admin/coupons', 
                               json={
                                   'quantity': 2,
                                   'discount_type': 'fixed',
                                   'discount_value': 5.00,
                                   'valid_days': 30
                               })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertEqual(len(data['coupons']), 2)
    
    def test_order_creation(self):
        """测试订单创建"""
        with self.app.app_context():
            # 创建测试订单数据
            order_data = {
                'image': {
                    'original_path': 'test.jpg',
                    'processed_path': 'test_processed.jpg',
                    'preview_path': 'test_preview.jpg',
                    'width': 800,
                    'height': 600,
                    'format': 'jpg',
                    'size': 1024000
                },
                'edit_params': {
                    'scale': 1.0,
                    'rotation': 0,
                    'offset_x': 0,
                    'offset_y': 0
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
            
            response = self.client.post('/api/v1/orders', json=order_data)
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertTrue(data['success'])
            self.assertIn('order_no', data['order'])
    
    def test_payment_processing(self):
        """测试支付处理"""
        with self.app.app_context():
            # 先创建一个订单
            order = Order(
                order_no='TEST123',
                unit_price=15.00,
                total_price=15.00,
                status='pending'
            )
            db.session.add(order)
            db.session.commit()
            
            # 测试支付
            response = self.client.post('/api/v1/payment', 
                                   json={
                                       'order_no': 'TEST123',
                                       'payment_method': 'coupon'
                                   })
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertTrue(data['success'])
    
    def test_database_models(self):
        """测试数据库模型"""
        with self.app.app_context():
            # 测试订单模型
            order = Order(
                order_no='TEST001',
                unit_price=15.00,
                total_price=15.00
            )
            db.session.add(order)
            db.session.commit()
            
            # 测试券码模型
            coupon = Coupon(
                code='TEST123',
                discount_type='fixed',
                discount_value=5.00
            )
            db.session.add(coupon)
            db.session.commit()
            
            # 验证数据
            self.assertEqual(Order.query.count(), 1)
            self.assertEqual(Coupon.query.count(), 1)
            
            # 测试券码有效性
            self.assertTrue(coupon.is_valid())
            self.assertEqual(coupon.calculate_discount(15.00), 5.00)

def run_tests():
    """运行所有测试"""
    print("🧪 开始运行测试...")
    
    # 创建测试套件
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(BajiGeneratorTestCase)
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 输出结果
    if result.wasSuccessful():
        print("✅ 所有测试通过！")
    else:
        print(f"❌ 测试失败: {len(result.failures)} 个失败, {len(result.errors)} 个错误")
    
    return result.wasSuccessful()

if __name__ == '__main__':
    run_tests()
