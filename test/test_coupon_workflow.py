#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
兑换券工作流完整测试套件
测试"后台发放兑换券，前台核销使用"的完整业务流程
"""

import unittest
import os
import sys
import json
import time
import requests
from datetime import datetime, timedelta
from decimal import Decimal

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.app_factory import create_app
from utils.models import Order, Coupon, db
# log_operation_local函数在routes/admin.py中定义，测试中不需要导入

class CouponFeatureTestCase(unittest.TestCase):
    """兑换券功能测试用例"""
    
    def setUp(self):
        """测试前准备"""
        self.app = create_app('testing')
        self.client = self.app.test_client()
        
        with self.app.app_context():
            db.create_all()
            
        # 测试数据
        self.test_coupons = []
        self.test_orders = []
        self.admin_password = "admin123"  # 测试环境管理员密码
        
    def tearDown(self):
        """测试后清理"""
        with self.app.app_context():
            db.drop_all()
    
    def login_admin(self):
        """管理员登录"""
        response = self.client.post('/api/v1/admin/login', 
                                  json={'password': self.admin_password})
        self.assertEqual(response.status_code, 200)
        return response.get_json()
    
    def create_test_order(self, total_price=100.00):
        """创建测试订单"""
        with self.app.app_context():
            order = Order(
                order_no=Order.generate_order_no(),
                unit_price=Decimal(str(total_price)),  # 设置单价
                total_price=Decimal(str(total_price)),
                status='pending',
                payment_status='unpaid'
            )
            db.session.add(order)
            db.session.commit()
            self.test_orders.append(order)
            return order
    
    def test_coupon_generation(self):
        """测试券码生成功能"""
        print("\n=== 测试券码生成功能 ===")
        
        # 管理员登录
        login_result = self.login_admin()
        self.assertTrue(login_result.get('success'))
        
        # 测试生成固定金额券码
        coupon_data = {
            'quantity': 3,
            'discount_type': 'fixed',
            'discount_value': 10.00,
            'min_order_amount': 50.00,
            'valid_days': 30,
            'usage_limit': 1
        }
        
        response = self.client.post('/api/v1/admin/coupons',
                                  json=coupon_data,
                                  headers={'Content-Type': 'application/json'})
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        self.assertEqual(len(result.get('coupons', [])), 3)
        
        # 验证生成的券码
        generated_coupons = result.get('coupons', [])
        for coupon in generated_coupons:
            self.assertIsNotNone(coupon.get('code'))
            self.assertEqual(coupon.get('discount_type'), 'fixed')
            self.assertEqual(float(coupon.get('discount_value')), 10.00)
            self.assertEqual(float(coupon.get('min_order_amount')), 50.00)
            self.assertEqual(coupon.get('usage_limit'), 1)
            self.assertEqual(coupon.get('used_count'), 0)
            self.assertTrue(coupon.get('is_active'))
            
            # 保存券码用于后续测试
            self.test_coupons.append(coupon)
        
        print(f"✓ 成功生成 {len(generated_coupons)} 个固定金额券码")
        
        # 测试生成百分比券码
        percentage_coupon_data = {
            'quantity': 2,
            'discount_type': 'percentage',
            'discount_value': 15.00,  # 15%折扣
            'min_order_amount': 100.00,
            'valid_days': 15,
            'usage_limit': 2
        }
        
        response = self.client.post('/api/v1/admin/coupons',
                                  json=percentage_coupon_data,
                                  headers={'Content-Type': 'application/json'})
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        
        percentage_coupons = result.get('coupons', [])
        for coupon in percentage_coupons:
            self.assertEqual(coupon.get('discount_type'), 'percentage')
            self.assertEqual(float(coupon.get('discount_value')), 15.00)
            self.test_coupons.append(coupon)
        
        print(f"✓ 成功生成 {len(percentage_coupons)} 个百分比券码")
    
    def test_coupon_validation(self):
        """测试券码验证功能"""
        print("\n=== 测试券码验证功能 ===")
        
        # 管理员登录
        login_result = self.login_admin()
        self.assertTrue(login_result.get('success'))
        
        # 生成测试券码
        coupon_data = {
            'quantity': 3,
            'discount_type': 'fixed',
            'discount_value': 10.00,
            'min_order_amount': 50.00,
            'valid_days': 30,
            'usage_limit': 1
        }
        
        response = self.client.post('/api/v1/admin/coupons',
                                  json=coupon_data,
                                  headers={'Content-Type': 'application/json'})
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        
        generated_coupons = result.get('coupons', [])
        self.test_coupons.extend(generated_coupons)
        
        # 创建测试订单
        order = self.create_test_order(80.00)
        
        # 测试有效券码验证
        valid_coupon = self.test_coupons[0]
        validation_data = {
            'code': valid_coupon['code'],
            'order_amount': 80.00
        }
        
        response = self.client.post('/api/v1/coupons/validate',
                                  json=validation_data,
                                  headers={'Content-Type': 'application/json'})
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        self.assertEqual(float(result.get('discount')), 10.00)  # 转换为float比较
        self.assertEqual(result.get('discount_type'), 'fixed')
        
        print(f"✓ 有效券码验证成功，折扣金额: {result.get('discount')}")
        
        # 测试不存在的券码
        invalid_data = {
            'code': 'INVALID123',
            'order_amount': 80.00
        }
        
        response = self.client.post('/api/v1/coupons/validate',
                                  json=invalid_data,
                                  headers={'Content-Type': 'application/json'})
        
        self.assertEqual(response.status_code, 400)
        result = response.get_json()
        self.assertFalse(result.get('success'))
        self.assertIn('券码不存在', result.get('error'))
        
        print("✓ 不存在券码验证失败，返回正确错误信息")
        
        # 测试订单金额不足的情况
        low_amount_data = {
            'code': valid_coupon['code'],
            'order_amount': 30.00  # 低于最低消费50.00
        }
        
        response = self.client.post('/api/v1/coupons/validate',
                                  json=low_amount_data,
                                  headers={'Content-Type': 'application/json'})
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        self.assertEqual(float(result.get('discount')), 0)  # 订单金额不足，折扣为0
        
        print("✓ 订单金额不足时，折扣为0")
        
        # 测试百分比券码验证
        percentage_coupon = None
        for coupon in self.test_coupons:
            if coupon.get('discount_type') == 'percentage':
                percentage_coupon = coupon
                break
        
        if percentage_coupon:
            percentage_data = {
                'code': percentage_coupon['code'],
                'order_amount': 200.00
            }
            
            response = self.client.post('/api/v1/coupons/validate',
                                      json=percentage_data,
                                      headers={'Content-Type': 'application/json'})
            
            self.assertEqual(response.status_code, 200)
            result = response.get_json()
            self.assertTrue(result.get('success'))
            expected_discount = 200.00 * 0.15  # 15%折扣
            self.assertEqual(float(result.get('discount')), expected_discount)
            
            print(f"✓ 百分比券码验证成功，折扣金额: {result.get('discount')}")
    
    def test_coupon_usage_in_payment(self):
        """测试券码在支付中的使用"""
        print("\n=== 测试券码在支付中的使用 ===")
        
        # 管理员登录
        login_result = self.login_admin()
        self.assertTrue(login_result.get('success'))
        
        # 生成测试券码
        coupon_data = {
            'quantity': 1,
            'discount_type': 'fixed',
            'discount_value': 10.00,
            'min_order_amount': 0.00,
            'valid_days': 30,
            'usage_limit': 1
        }
        
        response = self.client.post('/api/v1/admin/coupons',
                                  json=coupon_data,
                                  headers={'Content-Type': 'application/json'})
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        
        coupon = result.get('coupons', [])[0]
        
        # 创建测试订单
        order = self.create_test_order(80.00)
        
        # 测试使用券码支付
        payment_data = {
            'order_no': order.order_no,
            'payment_method': 'coupon',
            'coupon_code': coupon['code']
        }
        
        response = self.client.post('/api/v1/payment',
                                  json=payment_data,
                                  headers={'Content-Type': 'application/json'})
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        
        # 验证订单状态更新
        updated_order = result.get('order')
        self.assertEqual(updated_order.get('payment_status'), 'paid')
        self.assertEqual(updated_order.get('status'), 'processing')
        
        # 验证券码使用次数更新
        with self.app.app_context():
            used_coupon = Coupon.query.filter_by(code=coupon['code']).first()
            self.assertEqual(used_coupon.used_count, 1)
            self.assertIsNotNone(used_coupon.used_at)
        
        print(f"✓ 券码支付成功，订单状态: {updated_order.get('status')}")
        
        # 测试重复使用券码
        order2 = self.create_test_order(60.00)
        payment_data2 = {
            'order_no': order2.order_no,
            'payment_method': 'coupon',
            'coupon_code': coupon['code']  # 使用已用过的券码
        }
        
        response = self.client.post('/api/v1/payment',
                                  json=payment_data2,
                                  headers={'Content-Type': 'application/json'})
        
        self.assertEqual(response.status_code, 400)
        result = response.get_json()
        self.assertIn('券码无效', result.get('error'))
        
        print("✓ 重复使用券码被正确拒绝")
    
    def test_coupon_management(self):
        """测试券码管理功能"""
        print("\n=== 测试券码管理功能 ===")
        
        # 管理员登录
        login_result = self.login_admin()
        self.assertTrue(login_result.get('success'))
        
        # 生成测试券码
        coupon_data = {
            'quantity': 3,
            'discount_type': 'fixed',
            'discount_value': 5.00,
            'min_order_amount': 0.00,
            'valid_days': 30,
            'usage_limit': 1
        }
        
        response = self.client.post('/api/v1/admin/coupons',
                                  json=coupon_data,
                                  headers={'Content-Type': 'application/json'})
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        
        coupons = result.get('coupons', [])
        self.test_coupons.extend(coupons)
        
        # 测试获取券码列表
        response = self.client.get('/api/v1/admin/coupons')
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertIn('coupons', result)
        self.assertGreater(len(result.get('coupons', [])), 0)
        
        print(f"✓ 成功获取券码列表，共 {len(result.get('coupons', []))} 个券码")
        
        # 测试获取券码详情
        if self.test_coupons:
            coupon_id = self.test_coupons[0]['id']
            response = self.client.get(f'/api/v1/admin/coupons/{coupon_id}')
            self.assertEqual(response.status_code, 200)
            result = response.get_json()
            self.assertEqual(result.get('id'), coupon_id)
            
            print(f"✓ 成功获取券码详情: {result.get('code')}")
        
        # 测试更新券码状态
        if self.test_coupons:
            coupon_id = self.test_coupons[0]['id']
            update_data = {'is_active': False}
            
            response = self.client.put(f'/api/v1/admin/coupons/{coupon_id}',
                                    json=update_data,
                                    headers={'Content-Type': 'application/json'})
            self.assertEqual(response.status_code, 200)
            result = response.get_json()
            self.assertTrue(result.get('success'))
            
            # 验证状态更新
            with self.app.app_context():
                updated_coupon = Coupon.query.get(coupon_id)
                self.assertFalse(updated_coupon.is_active)
            
            print("✓ 成功更新券码状态")
        
        # 测试删除券码
        if len(self.test_coupons) > 1:
            coupon_id = self.test_coupons[1]['id']
            
            response = self.client.delete(f'/api/v1/admin/coupons/{coupon_id}')
            self.assertEqual(response.status_code, 200)
            result = response.get_json()
            self.assertTrue(result.get('success'))
            
            # 验证券码已删除
            with self.app.app_context():
                deleted_coupon = Coupon.query.get(coupon_id)
                self.assertIsNone(deleted_coupon)
            
            print("✓ 成功删除券码")
    
    def test_coupon_edge_cases(self):
        """测试券码边界情况"""
        print("\n=== 测试券码边界情况 ===")
        
        # 测试空券码验证
        empty_data = {
            'code': '',
            'order_amount': 100.00
        }
        
        response = self.client.post('/api/v1/coupons/validate',
                                  json=empty_data,
                                  headers={'Content-Type': 'application/json'})
        
        self.assertEqual(response.status_code, 400)
        result = response.get_json()
        self.assertIn('券码不能为空', result.get('error'))
        
        print("✓ 空券码验证失败")
        
        # 测试过期券码
        with self.app.app_context():
            expired_coupon = Coupon(
                code='EXPIRED123',
                amount=Decimal('10.00'),
                discount_type='fixed',
                discount_value=Decimal('10.00'),
                min_order_amount=Decimal('0.00'),
                usage_limit=1,
                is_active=True,
                valid_from=datetime.utcnow() - timedelta(days=2),
                valid_until=datetime.utcnow() - timedelta(days=1)  # 昨天过期
            )
            db.session.add(expired_coupon)
            db.session.commit()
            
            expired_data = {
                'code': 'EXPIRED123',
                'order_amount': 100.00
            }
            
            response = self.client.post('/api/v1/coupons/validate',
                                      json=expired_data,
                                      headers={'Content-Type': 'application/json'})
            
            self.assertEqual(response.status_code, 400)
            result = response.get_json()
            self.assertIn('券码已过期', result.get('error'))
            
            print("✓ 过期券码验证失败")
        
        # 测试禁用券码
        with self.app.app_context():
            disabled_coupon = Coupon(
                code='DISABLED123',
                amount=Decimal('10.00'),
                discount_type='fixed',
                discount_value=Decimal('10.00'),
                min_order_amount=Decimal('0.00'),
                usage_limit=1,
                is_active=False  # 禁用状态
            )
            db.session.add(disabled_coupon)
            db.session.commit()
            
            disabled_data = {
                'code': 'DISABLED123',
                'order_amount': 100.00
            }
            
            response = self.client.post('/api/v1/coupons/validate',
                                      json=disabled_data,
                                      headers={'Content-Type': 'application/json'})
            
            self.assertEqual(response.status_code, 400)
            result = response.get_json()
            self.assertIn('券码已过期', result.get('error'))  # 禁用券码也会返回过期错误
            
            print("✓ 禁用券码验证失败")
    
    def test_coupon_performance(self):
        """测试券码性能"""
        print("\n=== 测试券码性能 ===")
        
        # 生成大量券码测试性能
        start_time = time.time()
        
        coupon_data = {
            'quantity': 100,
            'discount_type': 'fixed',
            'discount_value': 5.00,
            'min_order_amount': 0.00,
            'valid_days': 30,
            'usage_limit': 1
        }
        
        login_result = self.login_admin()
        response = self.client.post('/api/v1/admin/coupons',
                                  json=coupon_data,
                                  headers={'Content-Type': 'application/json'})
        
        end_time = time.time()
        generation_time = end_time - start_time
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        self.assertEqual(len(result.get('coupons', [])), 100)
        
        print(f"✓ 生成100个券码耗时: {generation_time:.2f}秒")
        
        # 测试券码验证性能
        if result.get('coupons'):
            test_coupon = result.get('coupons')[0]
            
            start_time = time.time()
            for i in range(10):
                validation_data = {
                    'code': test_coupon['code'],
                    'order_amount': 100.00
                }
                
                response = self.client.post('/api/v1/coupons/validate',
                                          json=validation_data,
                                          headers={'Content-Type': 'application/json'})
                
                self.assertEqual(response.status_code, 200)
            
            end_time = time.time()
            validation_time = end_time - start_time
            
            print(f"✓ 10次券码验证耗时: {validation_time:.2f}秒")
    
    def run_complete_workflow_test(self):
        """运行完整工作流程测试"""
        print("\n" + "="*60)
        print("兑换券功能完整工作流程测试")
        print("="*60)
        
        try:
            # 1. 券码生成测试
            self.test_coupon_generation()
            
            # 2. 券码验证测试
            self.test_coupon_validation()
            
            # 3. 券码使用测试
            self.test_coupon_usage_in_payment()
            
            # 4. 券码管理测试
            self.test_coupon_management()
            
            # 5. 边界情况测试
            self.test_coupon_edge_cases()
            
            # 6. 性能测试
            self.test_coupon_performance()
            
            print("\n" + "="*60)
            print("✓ 所有测试通过！兑换券功能工作正常")
            print("="*60)
            
            return True
            
        except Exception as e:
            print(f"\n❌ 测试失败: {str(e)}")
            return False

def run_coupon_tests():
    """运行兑换券测试"""
    print("开始兑换券功能测试...")
    
    # 创建测试套件
    test_suite = unittest.TestLoader().loadTestsFromTestCase(CouponFeatureTestCase)
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    # 输出测试结果
    print(f"\n测试结果:")
    print(f"运行测试: {result.testsRun}")
    print(f"失败: {len(result.failures)}")
    print(f"错误: {len(result.errors)}")
    
    if result.failures:
        print("\n失败的测试:")
        for test, traceback in result.failures:
            print(f"- {test}: {traceback}")
    
    if result.errors:
        print("\n错误的测试:")
        for test, traceback in result.errors:
            print(f"- {test}: {traceback}")
    
    return len(result.failures) == 0 and len(result.errors) == 0

if __name__ == '__main__':
    # 运行完整工作流程测试
    test_case = CouponFeatureTestCase()
    test_case.setUp()
    
    success = test_case.run_complete_workflow_test()
    
    test_case.tearDown()
    
    if success:
        print("\n🎉 兑换券功能测试全部通过！")
        exit(0)
    else:
        print("\n💥 兑换券功能测试失败！")
        exit(1)
