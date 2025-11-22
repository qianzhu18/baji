#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
后台管理页面UI操作功能完整测试用例
测试所有管理页面的操作按钮功能，包括编辑、删除、批量操作等
"""

import os
import sys
import json
import unittest
import requests
from datetime import datetime, timedelta
from decimal import Decimal

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.app_factory import create_app
from utils.models import Order, Coupon, Case, Delivery, db

class AdminManagementTest(unittest.TestCase):
    """后台管理功能测试类"""
    
    @classmethod
    def setUpClass(cls):
        """测试类初始化"""
        print("\n" + "="*80)
        print("后台管理页面操作按钮功能完整测试")
        print("="*80)
        
        # 创建Flask应用
        cls.app = create_app('testing')
        cls.client = cls.app.test_client()
        
        # 加载测试数据
        cls.load_test_data()
        
        # 创建测试数据库
        with cls.app.app_context():
            db.create_all()
            cls.setup_test_data()
    
    @classmethod
    def load_test_data(cls):
        """加载测试数据"""
        print("加载测试数据...")
        
        try:
            with open('admin_test_data.json', 'r', encoding='utf-8') as f:
                cls.test_data = json.load(f)
            print(f"✓ 成功加载测试数据: {len(cls.test_data['test_orders'])} 个订单, {len(cls.test_data['test_coupons'])} 个券码, {len(cls.test_data['test_cases'])} 个案例")
        except FileNotFoundError:
            print("❌ 测试数据文件不存在，请先运行 admin_test_data_generator.py")
            raise
    
    @classmethod
    def setup_test_data(cls):
        """设置测试数据"""
        print("设置测试数据...")
        
        # 创建测试订单
        for order_data in cls.test_data['test_orders']:
            order = Order(
                order_no=order_data['order_no'],
                unit_price=Decimal(str(order_data['unit_price'])),
                total_price=Decimal(str(order_data['total_price'])),
                quantity=order_data['quantity'],
                status=order_data['status'],
                payment_status=order_data['payment_status'],
                payment_method=order_data.get('payment_method'),
                payment_time=datetime.fromisoformat(order_data['payment_time']) if order_data.get('payment_time') else None,
                created_at=datetime.fromisoformat(order_data['created_at']),
                updated_at=datetime.fromisoformat(order_data['updated_at'])
            )
            db.session.add(order)
        
        # 创建测试券码
        for coupon_data in cls.test_data['test_coupons']:
            coupon = Coupon(
                code=coupon_data['code'],
                amount=Decimal(str(coupon_data['discount_value'])),
                discount_type=coupon_data['discount_type'],
                discount_value=Decimal(str(coupon_data['discount_value'])),
                min_order_amount=Decimal(str(coupon_data['min_order_amount'])),
                usage_limit=coupon_data['usage_limit'],
                used_count=coupon_data['used_count'],
                is_active=coupon_data['is_active'],
                valid_until=datetime.fromisoformat(coupon_data['valid_until']) if coupon_data.get('valid_until') else None,
                created_at=datetime.fromisoformat(coupon_data['created_at'])
            )
            db.session.add(coupon)
        
        # 创建测试案例
        for i, case_data in enumerate(cls.test_data['test_cases']):
            case = Case(
                case_no=f"CASE{datetime.now().strftime('%Y%m%d%H%M%S')}{i}",
                title=case_data['title'],
                description=case_data['description'],
                original_image_path=f"/test/images/{case_data['title']}.jpg",
                preview_image_path=f"/test/previews/{case_data['title']}_preview.jpg",
                category=case_data['category'],
                tags=case_data['tags'],
                case_type=case_data['case_type'],
                is_featured=case_data['is_featured'],
                is_public=case_data['is_public'],
                created_at=datetime.fromisoformat(case_data['created_at']),
                updated_at=datetime.fromisoformat(case_data['updated_at'])
            )
            db.session.add(case)
        
        # 创建测试配送
        for delivery_data in cls.test_data['test_deliveries']:
            delivery = Delivery(
                delivery_no=delivery_data['delivery_no'],
                order_ids=delivery_data['order_ids'],
                recipient_name=delivery_data['recipient_name'],
                phone=delivery_data['phone'],
                address=delivery_data['address'],
                status=delivery_data['status'],
                tracking_number=delivery_data.get('tracking_number'),
                created_at=datetime.fromisoformat(delivery_data['created_at']),
                updated_at=datetime.fromisoformat(delivery_data['updated_at'])
            )
            db.session.add(delivery)
        
        db.session.commit()
        print("✓ 测试数据设置完成")
    
    def setUp(self):
        """每个测试方法前的设置"""
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.admin_password = os.environ.get('ADMIN_PASSWORD', 'admin_password')
    
    def tearDown(self):
        """每个测试方法后的清理"""
        self.app_context.pop()
    
    def login_admin(self):
        """管理员登录"""
        response = self.client.post('/api/v1/admin/login',
                                  json={'password': self.admin_password})
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        return result
    
    def test_01_admin_login(self):
        """测试1: 管理员登录功能"""
        print("\n测试1: 管理员登录功能")
        
        # 测试正确密码登录
        response = self.client.post('/api/v1/admin/login',
                                  json={'password': self.admin_password})
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        
        print("✓ 管理员登录成功")
        
        # 测试错误密码登录
        response = self.client.post('/api/v1/admin/login',
                                  json={'password': 'wrong_password'})
        
        self.assertEqual(response.status_code, 401)
        result = response.get_json()
        self.assertFalse(result.get('success'))
        self.assertEqual(result.get('error'), '密码错误')
        
        print("✓ 错误密码登录被正确拒绝")
    
    def test_02_admin_logout(self):
        """测试2: 管理员登出功能"""
        print("\n测试2: 管理员登出功能")
        
        # 先登录
        self.login_admin()
        
        # 登出
        response = self.client.post('/api/v1/admin/logout')
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        
        print("✓ 管理员登出成功")
    
    def test_03_check_login_status(self):
        """测试3: 检查登录状态功能"""
        print("\n测试3: 检查登录状态功能")
        
        # 未登录状态检查
        response = self.client.get('/api/v1/admin/check')
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertFalse(result.get('logged_in'))
        
        print("✓ 未登录状态检查正确")
        
        # 登录后状态检查
        self.login_admin()
        
        response = self.client.get('/api/v1/admin/check')
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('logged_in'))
        self.assertIsNotNone(result.get('login_time'))
        
        print("✓ 已登录状态检查正确")
    
    def test_04_get_orders(self):
        """测试4: 获取订单列表功能"""
        print("\n测试4: 获取订单列表功能")
        
        # 先登录
        self.login_admin()
        
        # 获取订单列表
        response = self.client.get('/api/v1/admin/orders')
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertIn('orders', result)
        self.assertIn('total', result)
        self.assertIn('pages', result)
        
        orders = result['orders']
        self.assertGreater(len(orders), 0)
        
        print(f"✓ 成功获取订单列表: {len(orders)} 个订单")
        
        # 测试分页参数
        response = self.client.get('/api/v1/admin/orders?page=1&per_page=2')
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        orders = result['orders']
        self.assertLessEqual(len(orders), 2)
        
        print("✓ 分页参数测试通过")
        
        # 测试筛选参数
        response = self.client.get('/api/v1/admin/orders?status=pending')
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        orders = result['orders']
        
        for order in orders:
            self.assertEqual(order['status'], 'pending')
        
        print("✓ 状态筛选测试通过")
    
    def test_05_update_order_status(self):
        """测试5: 更新订单状态功能"""
        print("\n测试5: 更新订单状态功能")
        
        # 先登录
        self.login_admin()
        
        # 获取第一个订单
        response = self.client.get('/api/v1/admin/orders')
        result = response.get_json()
        orders = result['orders']
        first_order = orders[0]
        order_id = first_order['id']
        
        # 更新订单状态
        new_status = 'processing'
        response = self.client.put(f'/api/v1/admin/orders/{order_id}/status',
                                 json={'status': new_status})
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        
        print(f"✓ 订单状态更新成功: {first_order['order_no']} -> {new_status}")
        
        # 验证状态已更新
        response = self.client.get('/api/v1/admin/orders')
        result = response.get_json()
        orders = result['orders']
        
        updated_order = next((o for o in orders if o['id'] == order_id), None)
        self.assertIsNotNone(updated_order)
        self.assertEqual(updated_order['status'], new_status)
        
        print("✓ 订单状态更新验证通过")
    
    def test_06_edit_order(self):
        """测试6: 编辑订单功能"""
        print("\n测试6: 编辑订单功能")
        
        # 先登录
        self.login_admin()
        
        # 获取第一个订单
        response = self.client.get('/api/v1/admin/orders')
        result = response.get_json()
        orders = result['orders']
        first_order = orders[0]
        order_id = first_order['id']
        
        # 编辑订单信息
        edit_data = {
            'notes': '测试备注信息',
            'quantity': 2
        }
        
        response = self.client.put(f'/api/v1/admin/orders/{order_id}',
                                 json=edit_data)
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        
        print(f"✓ 订单编辑成功: {first_order['order_no']}")
        
        # 验证编辑结果
        response = self.client.get('/api/v1/admin/orders')
        result = response.get_json()
        orders = result['orders']
        
        updated_order = next((o for o in orders if o['id'] == order_id), None)
        self.assertIsNotNone(updated_order)
        self.assertEqual(updated_order['quantity'], edit_data['quantity'])
        
        print("✓ 订单编辑验证通过")
    
    def test_07_delete_order(self):
        """测试7: 删除订单功能"""
        print("\n测试7: 删除订单功能")
        
        # 先登录
        self.login_admin()
        
        # 获取第一个订单
        response = self.client.get('/api/v1/admin/orders')
        result = response.get_json()
        orders = result['orders']
        first_order = orders[0]
        order_id = first_order['id']
        
        # 删除订单
        response = self.client.delete(f'/api/v1/admin/orders/{order_id}')
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        
        print(f"✓ 订单删除成功: {first_order['order_no']}")
        
        # 验证订单已删除
        response = self.client.get('/api/v1/admin/orders')
        result = response.get_json()
        orders = result['orders']
        
        deleted_order = next((o for o in orders if o['id'] == order_id), None)
        self.assertIsNone(deleted_order)
        
        print("✓ 订单删除验证通过")
    
    def test_08_batch_orders(self):
        """测试8: 批量操作订单功能"""
        print("\n测试8: 批量操作订单功能")
        
        # 先登录
        self.login_admin()
        
        # 获取多个订单
        response = self.client.get('/api/v1/admin/orders')
        result = response.get_json()
        orders = result['orders']
        
        if len(orders) >= 2:
            order_ids = [orders[0]['id'], orders[1]['id']]
            
            # 批量删除订单
            batch_data = {
                'action': 'delete',
                'order_ids': order_ids
            }
            
            response = self.client.post('/api/v1/admin/orders/batch',
                                     json=batch_data)
            
            self.assertEqual(response.status_code, 200)
            result = response.get_json()
            self.assertTrue(result.get('success'))
            self.assertIn('affected_count', result)
            
            print(f"✓ 批量删除订单成功: {result['affected_count']} 个订单")
        else:
            print("⚠ 订单数量不足，跳过批量操作测试")
    
    def test_09_generate_coupons(self):
        """测试9: 生成券码功能"""
        print("\n测试9: 生成券码功能")
        
        # 先登录
        self.login_admin()
        
        # 生成券码
        coupon_data = {
            'quantity': 3,
            'discount_type': 'fixed',
            'discount_value': 15.00,
            'min_order_amount': 100.00,
            'valid_days': 30,
            'usage_limit': 1
        }
        
        response = self.client.post('/api/v1/admin/coupons',
                                 json=coupon_data)
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        self.assertIn('coupons', result)
        
        coupons = result['coupons']
        self.assertEqual(len(coupons), coupon_data['quantity'])
        
        print(f"✓ 券码生成成功: {len(coupons)} 个券码")
        
        # 验证券码属性
        for coupon in coupons:
            self.assertEqual(coupon['discount_type'], coupon_data['discount_type'])
            self.assertEqual(float(coupon['discount_value']), coupon_data['discount_value'])
            self.assertEqual(float(coupon['min_order_amount']), coupon_data['min_order_amount'])
            self.assertEqual(coupon['usage_limit'], coupon_data['usage_limit'])
        
        print("✓ 券码属性验证通过")
    
    def test_10_get_coupons(self):
        """测试10: 获取券码列表功能"""
        print("\n测试10: 获取券码列表功能")
        
        # 先登录
        self.login_admin()
        
        # 获取券码列表
        response = self.client.get('/api/v1/admin/coupons')
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertIn('coupons', result)
        self.assertIn('total', result)
        self.assertIn('pages', result)
        
        coupons = result['coupons']
        self.assertGreater(len(coupons), 0)
        
        print(f"✓ 成功获取券码列表: {len(coupons)} 个券码")
        
        # 测试分页参数
        response = self.client.get('/api/v1/admin/coupons?page=1&per_page=2')
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        coupons = result['coupons']
        self.assertLessEqual(len(coupons), 2)
        
        print("✓ 券码分页参数测试通过")
    
    def test_11_update_coupon(self):
        """测试11: 更新券码状态功能"""
        print("\n测试11: 更新券码状态功能")
        
        # 先登录
        self.login_admin()
        
        # 获取第一个券码
        response = self.client.get('/api/v1/admin/coupons')
        result = response.get_json()
        coupons = result['coupons']
        first_coupon = coupons[0]
        coupon_id = first_coupon['id']
        
        # 更新券码状态
        new_status = not first_coupon['is_active']
        response = self.client.put(f'/api/v1/admin/coupons/{coupon_id}',
                                 json={'is_active': new_status})
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        
        print(f"✓ 券码状态更新成功: {first_coupon['code']} -> {'启用' if new_status else '禁用'}")
        
        # 验证状态已更新
        response = self.client.get('/api/v1/admin/coupons')
        result = response.get_json()
        coupons = result['coupons']
        
        updated_coupon = next((c for c in coupons if c['id'] == coupon_id), None)
        self.assertIsNotNone(updated_coupon)
        self.assertEqual(updated_coupon['is_active'], new_status)
        
        print("✓ 券码状态更新验证通过")
    
    def test_12_delete_coupon(self):
        """测试12: 删除券码功能"""
        print("\n测试12: 删除券码功能")
        
        # 先登录
        self.login_admin()
        
        # 获取第一个券码
        response = self.client.get('/api/v1/admin/coupons')
        result = response.get_json()
        coupons = result['coupons']
        first_coupon = coupons[0]
        coupon_id = first_coupon['id']
        
        # 删除券码
        response = self.client.delete(f'/api/v1/admin/coupons/{coupon_id}')
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        
        print(f"✓ 券码删除成功: {first_coupon['code']}")
        
        # 验证券码已删除
        response = self.client.get('/api/v1/admin/coupons')
        result = response.get_json()
        coupons = result['coupons']
        
        deleted_coupon = next((c for c in coupons if c['id'] == coupon_id), None)
        self.assertIsNone(deleted_coupon)
        
        print("✓ 券码删除验证通过")
    
    def test_13_get_coupon_stats(self):
        """测试13: 获取券码统计功能"""
        print("\n测试13: 获取券码统计功能")
        
        # 先登录
        self.login_admin()
        
        # 获取券码统计
        response = self.client.get('/api/v1/admin/coupons/stats')
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertIn('total', result)
        self.assertIn('used', result)
        self.assertIn('active', result)
        self.assertIn('expired', result)
        
        print(f"✓ 券码统计获取成功: 总计{result['total']}, 已用{result['used']}, 活跃{result['active']}, 过期{result['expired']}")
    
    def test_14_get_cases(self):
        """测试14: 获取案例列表功能"""
        print("\n测试14: 获取案例列表功能")
        
        # 先登录
        self.login_admin()
        
        # 获取案例列表
        response = self.client.get('/api/v1/admin/cases')
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertIn('cases', result)
        self.assertIn('total', result)
        self.assertIn('pages', result)
        
        cases = result['cases']
        self.assertGreater(len(cases), 0)
        
        print(f"✓ 成功获取案例列表: {len(cases)} 个案例")
        
        # 测试筛选参数
        response = self.client.get('/api/v1/admin/cases?status=featured')
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        cases = result['cases']
        
        for case in cases:
            self.assertTrue(case['is_featured'])
        
        print("✓ 案例筛选测试通过")
    
    def test_15_create_case(self):
        """测试15: 创建案例功能"""
        print("\n测试15: 创建案例功能")
        
        # 先登录
        self.login_admin()
        
        # 创建案例
        case_data = {
            'title': '测试案例',
            'description': '这是一个测试案例',
            'category': 'test',
            'tags': '测试,案例'
        }
        
        response = self.client.post('/api/v1/admin/cases/create',
                                 json=case_data)
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        self.assertIn('case', result)
        
        case = result['case']
        self.assertEqual(case['title'], case_data['title'])
        self.assertEqual(case['description'], case_data['description'])
        self.assertEqual(case['category'], case_data['category'])
        
        print(f"✓ 案例创建成功: {case['title']}")
    
    def test_16_update_case(self):
        """测试16: 更新案例功能"""
        print("\n测试16: 更新案例功能")
        
        # 先登录
        self.login_admin()
        
        # 获取第一个案例
        response = self.client.get('/api/v1/admin/cases')
        result = response.get_json()
        cases = result['cases']
        first_case = cases[0]
        case_id = first_case['id']
        
        # 更新案例
        update_data = {
            'title': '更新后的测试案例',
            'is_featured': True
        }
        
        response = self.client.put(f'/api/v1/admin/cases/{case_id}',
                                json=update_data)
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        
        print(f"✓ 案例更新成功: {first_case['title']}")
        
        # 验证更新结果
        response = self.client.get('/api/v1/admin/cases')
        result = response.get_json()
        cases = result['cases']
        
        updated_case = next((c for c in cases if c['id'] == case_id), None)
        self.assertIsNotNone(updated_case)
        self.assertEqual(updated_case['title'], update_data['title'])
        self.assertEqual(updated_case['is_featured'], update_data['is_featured'])
        
        print("✓ 案例更新验证通过")
    
    def test_17_delete_case(self):
        """测试17: 删除案例功能"""
        print("\n测试17: 删除案例功能")
        
        # 先登录
        self.login_admin()
        
        # 获取第一个案例
        response = self.client.get('/api/v1/admin/cases')
        result = response.get_json()
        cases = result['cases']
        first_case = cases[0]
        case_id = first_case['id']
        
        # 删除案例
        response = self.client.delete(f'/api/v1/admin/cases/{case_id}')
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        
        print(f"✓ 案例删除成功: {first_case['title']}")
        
        # 验证案例已删除
        response = self.client.get('/api/v1/admin/cases')
        result = response.get_json()
        cases = result['cases']
        
        deleted_case = next((c for c in cases if c['id'] == case_id), None)
        self.assertIsNone(deleted_case)
        
        print("✓ 案例删除验证通过")
    
    def test_18_batch_cases(self):
        """测试18: 批量操作案例功能"""
        print("\n测试18: 批量操作案例功能")
        
        # 先登录
        self.login_admin()
        
        # 获取多个案例
        response = self.client.get('/api/v1/admin/cases')
        result = response.get_json()
        cases = result['cases']
        
        if len(cases) >= 2:
            case_ids = [cases[0]['id'], cases[1]['id']]
            
            # 批量推荐案例
            batch_data = {
                'action': 'feature',
                'case_ids': case_ids
            }
            
            response = self.client.post('/api/v1/admin/cases/batch',
                                     json=batch_data)
            
            self.assertEqual(response.status_code, 200)
            result = response.get_json()
            self.assertTrue(result.get('success'))
            self.assertIn('affected_count', result)
            
            print(f"✓ 批量推荐案例成功: {result['affected_count']} 个案例")
        else:
            print("⚠ 案例数量不足，跳过批量操作测试")
    
    def test_19_get_deliveries(self):
        """测试19: 获取配送列表功能"""
        print("\n测试19: 获取配送列表功能")
        
        # 先登录
        self.login_admin()
        
        # 获取配送列表
        response = self.client.get('/api/v1/admin/delivery')
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertIn('deliveries', result)
        self.assertIn('total', result)
        self.assertIn('pages', result)
        
        deliveries = result['deliveries']
        self.assertGreater(len(deliveries), 0)
        
        print(f"✓ 成功获取配送列表: {len(deliveries)} 个配送")
        
        # 测试筛选参数
        response = self.client.get('/api/v1/admin/delivery?status=pending')
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        deliveries = result['deliveries']
        
        for delivery in deliveries:
            self.assertEqual(delivery['status'], 'pending')
        
        print("✓ 配送状态筛选测试通过")
    
    def test_20_update_delivery_status(self):
        """测试20: 更新配送状态功能"""
        print("\n测试20: 更新配送状态功能")
        
        # 先登录
        self.login_admin()
        
        # 获取第一个配送
        response = self.client.get('/api/v1/admin/delivery')
        result = response.get_json()
        deliveries = result['deliveries']
        first_delivery = deliveries[0]
        delivery_id = first_delivery['id']
        
        # 更新配送状态
        new_status = 'shipped'
        tracking_number = 'SF1234567890'
        
        response = self.client.put(f'/api/v1/admin/delivery/{delivery_id}/status',
                                json={
                                    'status': new_status,
                                    'tracking_number': tracking_number
                                })
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        
        print(f"✓ 配送状态更新成功: {first_delivery['delivery_no']} -> {new_status}")
        
        # 验证状态已更新
        response = self.client.get('/api/v1/admin/delivery')
        result = response.get_json()
        deliveries = result['deliveries']
        
        updated_delivery = next((d for d in deliveries if d['id'] == delivery_id), None)
        self.assertIsNotNone(updated_delivery)
        self.assertEqual(updated_delivery['status'], new_status)
        self.assertEqual(updated_delivery['tracking_number'], tracking_number)
        
        print("✓ 配送状态更新验证通过")
    
    def test_21_get_dashboard_stats(self):
        """测试21: 获取仪表盘统计功能"""
        print("\n测试21: 获取仪表盘统计功能")
        
        # 先登录
        self.login_admin()
        
        # 获取仪表盘统计
        response = self.client.get('/api/v1/admin/dashboard/stats')
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertIn('today_orders', result)
        self.assertIn('pending_orders', result)
        self.assertIn('today_revenue', result)
        self.assertIn('coupon_usage', result)
        
        print(f"✓ 仪表盘统计获取成功: 今日订单{result['today_orders']}, 待处理{result['pending_orders']}, 今日收入{result['today_revenue']}")
    
    def test_22_get_config(self):
        """测试22: 获取系统配置功能"""
        print("\n测试22: 获取系统配置功能")
        
        # 先登录
        self.login_admin()
        
        # 获取系统配置
        response = self.client.get('/api/v1/admin/config')
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertIn('configs', result)
        
        print("✓ 系统配置获取成功")
    
    def test_23_update_config(self):
        """测试23: 更新系统配置功能"""
        print("\n测试23: 更新系统配置功能")
        
        # 先登录
        self.login_admin()
        
        # 更新系统配置
        config_data = {
            'site_name': '测试站点',
            'default_price': 15.00
        }
        
        response = self.client.put('/api/v1/admin/config',
                                json=config_data)
        
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result.get('success'))
        
        print("✓ 系统配置更新成功")
    
    def test_24_unauthorized_access(self):
        """测试24: 未授权访问测试"""
        print("\n测试24: 未授权访问测试")
        
        # 未登录状态下访问管理API
        response = self.client.get('/api/v1/admin/orders')
        
        self.assertEqual(response.status_code, 401)
        result = response.get_json()
        self.assertEqual(result.get('error'), '需要登录')
        
        print("✓ 未授权访问被正确拒绝")
    
    def test_25_invalid_parameters(self):
        """测试25: 无效参数测试"""
        print("\n测试25: 无效参数测试")
        
        # 先登录
        self.login_admin()
        
        # 测试无效订单ID
        response = self.client.put('/api/v1/admin/orders/99999/status',
                                json={'status': 'processing'})
        
        self.assertEqual(response.status_code, 404)
        result = response.get_json()
        self.assertEqual(result.get('error'), '订单不存在')
        
        print("✓ 无效订单ID测试通过")
        
        # 测试无效券码ID
        response = self.client.put('/api/v1/admin/coupons/99999',
                                json={'is_active': False})
        
        self.assertEqual(response.status_code, 404)
        result = response.get_json()
        self.assertEqual(result.get('error'), '券码不存在')
        
        print("✓ 无效券码ID测试通过")
    
    def test_26_complete_admin_workflow(self):
        """测试26: 完整管理流程测试"""
        print("\n测试26: 完整管理流程测试")
        
        # 步骤1: 管理员登录
        print("步骤1: 管理员登录")
        login_result = self.login_admin()
        self.assertTrue(login_result.get('success'))
        print("✓ 管理员登录成功")
        
        # 步骤2: 查看仪表盘
        print("\n步骤2: 查看仪表盘")
        response = self.client.get('/api/v1/admin/dashboard/stats')
        self.assertEqual(response.status_code, 200)
        stats = response.get_json()
        print(f"✓ 仪表盘数据: 今日订单{stats['today_orders']}, 待处理{stats['pending_orders']}")
        
        # 步骤3: 管理订单
        print("\n步骤3: 管理订单")
        response = self.client.get('/api/v1/admin/orders')
        self.assertEqual(response.status_code, 200)
        orders_result = response.get_json()
        orders = orders_result['orders']
        
        if orders:
            order = orders[0]
            # 更新订单状态
            response = self.client.put(f'/api/v1/admin/orders/{order['id']}/status',
                                    json={'status': 'processing'})
            self.assertEqual(response.status_code, 200)
            print(f"✓ 订单状态更新: {order['order_no']} -> processing")
        
        # 步骤4: 管理券码
        print("\n步骤4: 管理券码")
        # 生成新券码
        coupon_data = {
            'quantity': 2,
            'discount_type': 'fixed',
            'discount_value': 10.00,
            'min_order_amount': 50.00,
            'valid_days': 30,
            'usage_limit': 1
        }
        
        response = self.client.post('/api/v1/admin/coupons', json=coupon_data)
        self.assertEqual(response.status_code, 200)
        coupons_result = response.get_json()
        print(f"✓ 券码生成成功: {len(coupons_result['coupons'])} 个券码")
        
        # 步骤5: 管理案例
        print("\n步骤5: 管理案例")
        response = self.client.get('/api/v1/admin/cases')
        self.assertEqual(response.status_code, 200)
        cases_result = response.get_json()
        cases = cases_result['cases']
        print(f"✓ 案例管理: 共{len(cases)} 个案例")
        
        # 步骤6: 管理配送
        print("\n步骤6: 管理配送")
        response = self.client.get('/api/v1/admin/delivery')
        self.assertEqual(response.status_code, 200)
        deliveries_result = response.get_json()
        deliveries = deliveries_result['deliveries']
        print(f"✓ 配送管理: 共{len(deliveries)} 个配送")
        
        # 步骤7: 系统配置
        print("\n步骤7: 系统配置")
        response = self.client.get('/api/v1/admin/config')
        self.assertEqual(response.status_code, 200)
        print("✓ 系统配置查看成功")
        
        # 步骤8: 管理员登出
        print("\n步骤8: 管理员登出")
        response = self.client.post('/api/v1/admin/logout')
        self.assertEqual(response.status_code, 200)
        print("✓ 管理员登出成功")
        
        print("\n🎉 完整管理流程测试成功！")
    
    @classmethod
    def tearDownClass(cls):
        """测试类清理"""
        with cls.app.app_context():
            db.drop_all()
        print("\n✓ 测试数据清理完成")

def run_admin_tests():
    """运行后台管理测试"""
    print("\n" + "="*80)
    print("开始运行后台管理页面操作按钮功能完整测试")
    print("="*80)
    
    # 创建测试套件
    suite = unittest.TestSuite()
    
    # 添加测试用例
    test_methods = [
        'test_01_admin_login',
        'test_02_admin_logout',
        'test_03_check_login_status',
        'test_04_get_orders',
        'test_05_update_order_status',
        'test_06_edit_order',
        'test_07_delete_order',
        'test_08_batch_orders',
        'test_09_generate_coupons',
        'test_10_get_coupons',
        'test_11_update_coupon',
        'test_12_delete_coupon',
        'test_13_get_coupon_stats',
        'test_14_get_cases',
        'test_15_create_case',
        'test_16_update_case',
        'test_17_delete_case',
        'test_18_batch_cases',
        'test_19_get_deliveries',
        'test_20_update_delivery_status',
        'test_21_get_dashboard_stats',
        'test_22_get_config',
        'test_23_update_config',
        'test_24_unauthorized_access',
        'test_25_invalid_parameters',
        'test_26_complete_admin_workflow'
    ]
    
    for method in test_methods:
        suite.addTest(AdminManagementTest(method))
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 输出测试结果摘要
    print("\n" + "="*80)
    print("测试结果摘要")
    print("="*80)
    print(f"总测试数: {result.testsRun}")
    print(f"成功: {result.testsRun - len(result.failures) - len(result.errors)}")
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
    
    success_rate = (result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100
    print(f"\n成功率: {success_rate:.1f}%")
    
    return result.wasSuccessful()

if __name__ == '__main__':
    success = run_admin_tests()
    
    if success:
        print("\n🎉 所有测试通过！")
        exit(0)
    else:
        print("\n💥 部分测试失败！")
        exit(1)
