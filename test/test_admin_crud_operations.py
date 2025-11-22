# test_admin_crud_operations.py - 测试后台管理CRUD操作
import unittest
import os
import sys
import json
import tempfile
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.app_factory import create_app
from utils.models import Order, Coupon, Delivery, Case, db

class AdminFunctionsTestCase(unittest.TestCase):
    def setUp(self):
        """测试前准备"""
        self.app = create_app('testing')
        self.client = self.app.test_client()
        
        with self.app.app_context():
            db.create_all()
            
            # 创建测试数据
            self.create_test_data()
    
    def tearDown(self):
        """测试后清理"""
        with self.app.app_context():
            db.drop_all()
    
    def create_test_data(self):
        """创建测试数据"""
        with self.app.app_context():
            # 创建测试订单
            self.test_order = Order(
                order_no='TEST001',
                ip_address='127.0.0.1',
                original_image_path='test.jpg',
                processed_image_path='processed_test.jpg',
                quantity=1,
                unit_price=10.0,
                total_price=10.0,
                status='processing'
            )
            db.session.add(self.test_order)
            db.session.flush()  # 获取ID但不提交
            
            # 创建测试券码
            self.test_coupon = Coupon(
                code='TEST123',
                amount=5.0,
                discount_type='fixed',
                discount_value=5.0,
                usage_limit=1,
                is_active=True
            )
            db.session.add(self.test_coupon)
            db.session.flush()  # 获取ID但不提交
            
            # 创建测试配送记录
            self.test_delivery = Delivery(
                delivery_no='DLV001',
                order_ids=json.dumps([self.test_order.id]),
                recipient_name='测试用户',
                phone='13800138000',
                address='测试地址',
                status='pending'
            )
            db.session.add(self.test_delivery)
            db.session.flush()  # 获取ID但不提交
            
            db.session.commit()
            
            # 保存ID到实例变量
            self.test_order_id = self.test_order.id
            self.test_coupon_id = self.test_coupon.id
            self.test_delivery_id = self.test_delivery.id
    
    def login_admin(self):
        """管理员登录"""
        with self.app.app_context():
            response = self.client.post('/api/v1/admin/login', 
                                     json={'password': self.app.config['ADMIN_PASSWORD']})
            return response.status_code == 200
    
    def test_batch_update_orders(self):
        """测试批量更新订单"""
        if not self.login_admin():
            self.skipTest("管理员登录失败")
        
        with self.app.app_context():
            # 测试批量更新订单状态
            response = self.client.put('/api/v1/admin/orders/batch', 
                                     json={
                                         'order_ids': [self.test_order_id],
                                         'update_data': {'status': 'completed'}
                                     })
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertTrue(data['success'])
            self.assertEqual(data['updated_count'], 1)
            
            # 验证订单状态已更新
            updated_order = Order.query.get(self.test_order_id)
            self.assertEqual(updated_order.status, 'completed')
    
    def test_batch_delete_orders(self):
        """测试批量删除订单"""
        if not self.login_admin():
            self.skipTest("管理员登录失败")
        
        with self.app.app_context():
            # 创建额外的测试订单
            extra_order = Order(
                order_no='TEST002',
                ip_address='127.0.0.1',
                original_image_path='test2.jpg',
                processed_image_path='processed_test2.jpg',
                quantity=1,
                unit_price=10.0,
                total_price=10.0,
                status='processing'
            )
            db.session.add(extra_order)
            db.session.commit()
            
            # 测试批量删除订单
            response = self.client.delete('/api/v1/admin/orders/batch', 
                                        json={'order_ids': [extra_order.id]})
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertTrue(data['success'])
            self.assertEqual(data['deleted_count'], 1)
            
            # 验证订单已删除
            deleted_order = Order.query.get(extra_order.id)
            self.assertIsNone(deleted_order)
    
    def test_batch_update_coupons(self):
        """测试批量更新券码"""
        if not self.login_admin():
            self.skipTest("管理员登录失败")
        
        with self.app.app_context():
            # 测试批量更新券码状态
            response = self.client.put('/api/v1/admin/coupons/batch', 
                                     json={
                                         'coupon_ids': [self.test_coupon_id],
                                         'update_data': {'is_active': False}
                                     })
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertTrue(data['success'])
            self.assertEqual(data['updated_count'], 1)
            
            # 验证券码状态已更新
            updated_coupon = Coupon.query.get(self.test_coupon_id)
            self.assertFalse(updated_coupon.is_active)
    
    def test_batch_delete_coupons(self):
        """测试批量删除券码"""
        if not self.login_admin():
            self.skipTest("管理员登录失败")
        
        with self.app.app_context():
            # 创建额外的测试券码
            extra_coupon = Coupon(
                code='TEST456',
                amount=3.0,
                discount_type='fixed',
                discount_value=3.0,
                usage_limit=1,
                is_active=True
            )
            db.session.add(extra_coupon)
            db.session.commit()
            
            # 测试批量删除券码
            response = self.client.delete('/api/v1/admin/coupons/batch', 
                                        json={'coupon_ids': [extra_coupon.id]})
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertTrue(data['success'])
            self.assertEqual(data['deleted_count'], 1)
            
            # 验证券码已删除
            deleted_coupon = Coupon.query.get(extra_coupon.id)
            self.assertIsNone(deleted_coupon)
    
    def test_create_delivery(self):
        """测试创建配送单"""
        if not self.login_admin():
            self.skipTest("管理员登录失败")
        
        with self.app.app_context():
            # 测试创建配送单
            response = self.client.post('/api/v1/admin/delivery', 
                                      json={
                                          'order_ids': [self.test_order_id],
                                          'recipient_name': '新测试用户',
                                          'phone': '13900139000',
                                          'address': '新测试地址',
                                          'city': '测试城市',
                                          'province': '测试省份'
                                      })
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertTrue(data['success'])
            self.assertIn('delivery', data)
            
            # 验证配送单已创建
            delivery_id = data['delivery']['id']
            created_delivery = Delivery.query.get(delivery_id)
            self.assertIsNotNone(created_delivery)
            self.assertEqual(created_delivery.recipient_name, '新测试用户')
    
    def test_update_delivery(self):
        """测试更新配送信息"""
        if not self.login_admin():
            self.skipTest("管理员登录失败")
        
        with self.app.app_context():
            # 测试更新配送信息
            response = self.client.put(f'/api/v1/admin/delivery/{self.test_delivery_id}', 
                                     json={
                                         'recipient_name': '更新后的用户',
                                         'phone': '13700137000',
                                         'address': '更新后的地址'
                                     })
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertTrue(data['success'])
            
            # 验证配送信息已更新
            updated_delivery = Delivery.query.get(self.test_delivery_id)
            self.assertEqual(updated_delivery.recipient_name, '更新后的用户')
            self.assertEqual(updated_delivery.phone, '13700137000')
    
    def test_batch_update_deliveries(self):
        """测试批量更新配送状态"""
        if not self.login_admin():
            self.skipTest("管理员登录失败")
        
        with self.app.app_context():
            # 测试批量更新配送状态
            response = self.client.put('/api/v1/admin/delivery/batch', 
                                     json={
                                         'delivery_ids': [self.test_delivery_id],
                                         'update_data': {'status': 'shipped'}
                                     })
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertTrue(data['success'])
            self.assertEqual(data['updated_count'], 1)
            
            # 验证配送状态已更新
            updated_delivery = Delivery.query.get(self.test_delivery_id)
            self.assertEqual(updated_delivery.status, 'shipped')
    
    def test_export_delivery_list(self):
        """测试导出配送单"""
        if not self.login_admin():
            self.skipTest("管理员登录失败")
        
        with self.app.app_context():
            # 测试导出配送单
            response = self.client.post('/api/v1/admin/delivery/export', 
                                      json={'delivery_ids': [self.test_delivery_id]})
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertTrue(data['success'])
            self.assertIn('pdf_path', data)
            self.assertIn('download_url', data)
    
    def test_export_pdf(self):
        """测试导出PDF"""
        if not self.login_admin():
            self.skipTest("管理员登录失败")
        
        with self.app.app_context():
            # 测试导出PDF
            response = self.client.post('/api/v1/admin/export/pdf', 
                                      json={
                                          'order_ids': [self.test_order_id],
                                          'format': 'a4_6',
                                          'size': '68x68'
                                      })
            
            if response.status_code != 200:
                print(f"导出PDF错误: {response.data.decode()}")
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertTrue(data['success'])
            self.assertIn('pdf_path', data)
            self.assertIn('download_url', data)
    
    def test_preview_export(self):
        """测试预览导出"""
        if not self.login_admin():
            self.skipTest("管理员登录失败")
        
        with self.app.app_context():
            # 测试预览导出
            response = self.client.post('/api/v1/admin/export/preview', 
                                      json={
                                          'order_ids': [self.test_order_id],
                                          'format': 'a4_6'
                                      })
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertTrue(data['success'])
            self.assertIn('preview_url', data)

if __name__ == '__main__':
    unittest.main()
