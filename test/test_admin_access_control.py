#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
后台管理访问控制测试
专门测试权限控制装饰器是否正常工作
"""

import os
import sys
import unittest

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.app_factory import create_app
from utils.models import db

class AdminPermissionTest(unittest.TestCase):
    """后台管理权限控制测试类"""
    
    @classmethod
    def setUpClass(cls):
        """测试类初始化"""
        print("\n" + "="*60)
        print("后台管理权限控制测试")
        print("="*60)
        
        # 创建Flask应用
        cls.app = create_app('testing')
        cls.client = cls.app.test_client()
        
        # 创建测试数据库
        with cls.app.app_context():
            db.create_all()
    
    def setUp(self):
        """每个测试方法前的设置"""
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.admin_password = os.environ.get('ADMIN_PASSWORD', 'admin_password')
    
    def tearDown(self):
        """每个测试方法后的清理"""
        self.app_context.pop()
    
    def test_unauthorized_access_to_orders(self):
        """测试未授权访问订单API"""
        print("\n测试未授权访问订单API")
        
        # 未登录状态下访问订单API
        response = self.client.get('/api/v1/admin/orders')
        
        print(f"响应状态码: {response.status_code}")
        print(f"响应内容: {response.get_json()}")
        
        # 应该返回401
        self.assertEqual(response.status_code, 401)
        result = response.get_json()
        self.assertEqual(result.get('error'), '需要登录')
        
        print("✓ 未授权访问被正确拒绝")
    
    def test_unauthorized_access_to_coupons(self):
        """测试未授权访问券码API"""
        print("\n测试未授权访问券码API")
        
        # 未登录状态下访问券码API
        response = self.client.get('/api/v1/admin/coupons')
        
        print(f"响应状态码: {response.status_code}")
        print(f"响应内容: {response.get_json()}")
        
        # 应该返回401
        self.assertEqual(response.status_code, 401)
        result = response.get_json()
        self.assertEqual(result.get('error'), '需要登录')
        
        print("✓ 未授权访问被正确拒绝")
    
    def test_unauthorized_access_to_cases(self):
        """测试未授权访问案例API"""
        print("\n测试未授权访问案例API")
        
        # 未登录状态下访问案例API
        response = self.client.get('/api/v1/admin/cases')
        
        print(f"响应状态码: {response.status_code}")
        print(f"响应内容: {response.get_json()}")
        
        # 应该返回401
        self.assertEqual(response.status_code, 401)
        result = response.get_json()
        self.assertEqual(result.get('error'), '需要登录')
        
        print("✓ 未授权访问被正确拒绝")
    
    def test_unauthorized_access_to_config(self):
        """测试未授权访问配置API"""
        print("\n测试未授权访问配置API")
        
        # 未登录状态下访问配置API
        response = self.client.get('/api/v1/admin/config')
        
        print(f"响应状态码: {response.status_code}")
        print(f"响应内容: {response.get_json()}")
        
        # 应该返回401
        self.assertEqual(response.status_code, 401)
        result = response.get_json()
        self.assertEqual(result.get('error'), '需要登录')
        
        print("✓ 未授权访问被正确拒绝")
    
    def test_authorized_access_after_login(self):
        """测试登录后授权访问"""
        print("\n测试登录后授权访问")
        
        # 先登录
        login_response = self.client.post('/api/v1/admin/login',
                                       json={'password': self.admin_password})
        
        print(f"登录响应状态码: {login_response.status_code}")
        print(f"登录响应内容: {login_response.get_json()}")
        
        self.assertEqual(login_response.status_code, 200)
        login_result = login_response.get_json()
        self.assertTrue(login_result.get('success'))
        
        # 登录后访问订单API
        response = self.client.get('/api/v1/admin/orders')
        
        print(f"访问订单API响应状态码: {response.status_code}")
        
        # 应该返回200
        self.assertEqual(response.status_code, 200)
        
        print("✓ 登录后访问成功")
    
    @classmethod
    def tearDownClass(cls):
        """测试类清理"""
        with cls.app.app_context():
            db.drop_all()
        print("\n✓ 测试数据清理完成")

def run_permission_tests():
    """运行权限控制测试"""
    print("\n" + "="*60)
    print("开始运行后台管理权限控制测试")
    print("="*60)
    
    # 创建测试套件
    suite = unittest.TestSuite()
    
    # 添加测试用例
    test_methods = [
        'test_unauthorized_access_to_orders',
        'test_unauthorized_access_to_coupons',
        'test_unauthorized_access_to_cases',
        'test_unauthorized_access_to_config',
        'test_authorized_access_after_login'
    ]
    
    for method in test_methods:
        suite.addTest(AdminPermissionTest(method))
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 输出测试结果摘要
    print("\n" + "="*60)
    print("权限控制测试结果摘要")
    print("="*60)
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
    success = run_permission_tests()
    
    if success:
        print("\n🎉 权限控制测试通过！")
        exit(0)
    else:
        print("\n💥 权限控制测试失败！")
        exit(1)
