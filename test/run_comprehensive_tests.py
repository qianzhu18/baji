#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
吧唧生成器 - 综合测试运行脚本
执行所有endpoint的功能测试和安全测试
"""

import os
import sys
import json
import time
import requests
import tempfile
from datetime import datetime
from io import BytesIO
from PIL import Image

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class ComprehensiveTester:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = {
            'start_time': datetime.now().isoformat(),
            'functional_tests': {},
            'security_tests': {},
            'issues_found': [],
            'summary': {}
        }
        self.test_data = {}
        
    def log_result(self, test_name, test_type, success, details=None, issue=None):
        """记录测试结果"""
        result = {
            'success': success,
            'timestamp': datetime.now().isoformat(),
            'details': details or {},
            'issue': issue
        }
        
        if test_type not in self.test_results:
            self.test_results[test_type] = {}
        self.test_results[test_type][test_name] = result
        
        if not success and issue:
            self.test_results['issues_found'].append({
                'test_name': test_name,
                'test_type': test_type,
                'issue': issue,
                'timestamp': datetime.now().isoformat()
            })
    
    def create_test_image(self):
        """创建测试图片"""
        img = Image.new('RGB', (100, 100), color='red')
        img_buffer = BytesIO()
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        return img_buffer
    
    def test_file_upload(self):
        """测试文件上传功能"""
        test_name = "文件上传测试"
        print(f"  🔍 {test_name}...")
        
        try:
            # 创建测试图片
            test_image = self.create_test_image()
            files = {'file': ('test.png', test_image, 'image/png')}
            
            response = self.session.post(f"{self.base_url}/api/v1/upload", files=files)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.test_data['uploaded_file'] = data.get('file_path')
                    self.log_result(test_name, 'functional_tests', True, 
                                  {'file_path': data.get('file_path')})
                    print(f"    ✅ 上传成功: {data.get('file_path')}")
                else:
                    self.log_result(test_name, 'functional_tests', False, 
                                  {'error': data.get('error')}, 
                                  f"上传失败: {data.get('error')}")
                    print(f"    ❌ 上传失败: {data.get('error')}")
            else:
                self.log_result(test_name, 'functional_tests', False, 
                              {'status_code': response.status_code}, 
                              f"HTTP状态码错误: {response.status_code}")
                print(f"    ❌ HTTP状态码错误: {response.status_code}")
                
        except Exception as e:
            self.log_result(test_name, 'functional_tests', False, 
                          {'exception': str(e)}, 
                          f"测试异常: {str(e)}")
            print(f"    ❌ 测试异常: {str(e)}")
    
    def test_preview_generation(self):
        """测试预览生成"""
        test_name = "预览生成测试"
        print(f"  🔍 {test_name}...")
        
        try:
            if 'uploaded_file' not in self.test_data:
                self.log_result(test_name, 'functional_tests', False, 
                              {}, "缺少上传的文件")
                print(f"    ❌ 缺少上传的文件")
                return
            
            preview_data = {
                'image_path': self.test_data['uploaded_file'],
                'width': 100,
                'height': 100,
                'scale': 1.0,
                'rotation': 0,
                'offset_x': 0,
                'offset_y': 0,
                'format': 'png'
            }
            
            response = self.session.post(f"{self.base_url}/api/v1/preview", 
                                       json=preview_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.test_data['preview_file'] = data.get('preview_path')
                    self.log_result(test_name, 'functional_tests', True, 
                                  {'preview_path': data.get('preview_path')})
                    print(f"    ✅ 预览生成成功: {data.get('preview_path')}")
                else:
                    self.log_result(test_name, 'functional_tests', False, 
                                  {'error': data.get('error')}, 
                                  f"预览生成失败: {data.get('error')}")
                    print(f"    ❌ 预览生成失败: {data.get('error')}")
            else:
                self.log_result(test_name, 'functional_tests', False, 
                              {'status_code': response.status_code}, 
                              f"HTTP状态码错误: {response.status_code}")
                print(f"    ❌ HTTP状态码错误: {response.status_code}")
                
        except Exception as e:
            self.log_result(test_name, 'functional_tests', False, 
                          {'exception': str(e)}, 
                          f"测试异常: {str(e)}")
            print(f"    ❌ 测试异常: {str(e)}")
    
    def test_order_creation(self):
        """测试订单创建"""
        test_name = "订单创建测试"
        print(f"  🔍 {test_name}...")
        
        try:
            if 'uploaded_file' not in self.test_data:
                self.log_result(test_name, 'functional_tests', False, 
                              {}, "缺少上传的文件")
                print(f"    ❌ 缺少上传的文件")
                return
            
            order_data = {
                'image': {
                    'original_path': self.test_data['uploaded_file'],
                    'width': 100,
                    'height': 100,
                    'format': 'png'
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
                },
                'quantity': 1,
                'notes': '测试订单'
            }
            
            response = self.session.post(f"{self.base_url}/api/v1/orders", 
                                       json=order_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.test_data['order'] = data.get('order')
                    self.log_result(test_name, 'functional_tests', True, 
                                  {'order_no': data.get('order', {}).get('order_no')})
                    print(f"    ✅ 订单创建成功: {data.get('order', {}).get('order_no')}")
                else:
                    self.log_result(test_name, 'functional_tests', False, 
                                  {'error': data.get('error')}, 
                                  f"订单创建失败: {data.get('error')}")
                    print(f"    ❌ 订单创建失败: {data.get('error')}")
            else:
                self.log_result(test_name, 'functional_tests', False, 
                              {'status_code': response.status_code}, 
                              f"HTTP状态码错误: {response.status_code}")
                print(f"    ❌ HTTP状态码错误: {response.status_code}")
                
        except Exception as e:
            self.log_result(test_name, 'functional_tests', False, 
                          {'exception': str(e)}, 
                          f"测试异常: {str(e)}")
            print(f"    ❌ 测试异常: {str(e)}")
    
    def test_order_queries(self):
        """测试订单查询"""
        test_name = "订单查询测试"
        print(f"  🔍 {test_name}...")
        
        try:
            if 'order' not in self.test_data:
                self.log_result(test_name, 'functional_tests', False, 
                              {}, "缺少创建的订单")
                print(f"    ❌ 缺少创建的订单")
                return
            
            order_no = self.test_data['order'].get('order_no')
            
            # 测试获取订单详情
            response = self.session.get(f"{self.base_url}/api/v1/orders/{order_no}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_result(test_name, 'functional_tests', True, 
                                  {'order_found': True})
                    print(f"    ✅ 订单查询成功")
                else:
                    self.log_result(test_name, 'functional_tests', False, 
                                  {'error': data.get('error')}, 
                                  f"订单查询失败: {data.get('error')}")
                    print(f"    ❌ 订单查询失败: {data.get('error')}")
            else:
                self.log_result(test_name, 'functional_tests', False, 
                              {'status_code': response.status_code}, 
                              f"HTTP状态码错误: {response.status_code}")
                print(f"    ❌ HTTP状态码错误: {response.status_code}")
                
        except Exception as e:
            self.log_result(test_name, 'functional_tests', False, 
                          {'exception': str(e)}, 
                          f"测试异常: {str(e)}")
            print(f"    ❌ 测试异常: {str(e)}")
    
    def test_payment_flow(self):
        """测试支付流程"""
        test_name = "支付流程测试"
        print(f"  🔍 {test_name}...")
        
        try:
            if 'order' not in self.test_data:
                self.log_result(test_name, 'functional_tests', False, 
                              {}, "缺少创建的订单")
                print(f"    ❌ 缺少创建的订单")
                return
            
            order_no = self.test_data['order'].get('order_no')
            
            payment_data = {
                'order_no': order_no,
                'payment_method': 'test',
                'coupon_code': None
            }
            
            response = self.session.post(f"{self.base_url}/api/v1/payment", 
                                       json=payment_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_result(test_name, 'functional_tests', True, 
                                  {'payment_successful': True})
                    print(f"    ✅ 支付处理成功")
                else:
                    self.log_result(test_name, 'functional_tests', False, 
                                  {'error': data.get('error')}, 
                                  f"支付处理失败: {data.get('error')}")
                    print(f"    ❌ 支付处理失败: {data.get('error')}")
            else:
                self.log_result(test_name, 'functional_tests', False, 
                              {'status_code': response.status_code}, 
                              f"HTTP状态码错误: {response.status_code}")
                print(f"    ❌ HTTP状态码错误: {response.status_code}")
                
        except Exception as e:
            self.log_result(test_name, 'functional_tests', False, 
                          {'exception': str(e)}, 
                          f"测试异常: {str(e)}")
            print(f"    ❌ 测试异常: {str(e)}")
    
    def test_gallery_functions(self):
        """测试作品库功能"""
        test_name = "作品库功能测试"
        print(f"  🔍 {test_name}...")
        
        try:
            response = self.session.get(f"{self.base_url}/api/v1/gallery")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_result(test_name, 'functional_tests', True, 
                                  {'gallery_items': len(data.get('items', []))})
                    print(f"    ✅ 作品库查询成功，共 {len(data.get('items', []))} 个作品")
                else:
                    self.log_result(test_name, 'functional_tests', False, 
                                  {'error': data.get('error')}, 
                                  f"作品库查询失败: {data.get('error')}")
                    print(f"    ❌ 作品库查询失败: {data.get('error')}")
            else:
                self.log_result(test_name, 'functional_tests', False, 
                              {'status_code': response.status_code}, 
                              f"HTTP状态码错误: {response.status_code}")
                print(f"    ❌ HTTP状态码错误: {response.status_code}")
                
        except Exception as e:
            self.log_result(test_name, 'functional_tests', False, 
                          {'exception': str(e)}, 
                          f"测试异常: {str(e)}")
            print(f"    ❌ 测试异常: {str(e)}")
    
    def test_admin_login(self):
        """测试管理员登录"""
        test_name = "管理员登录测试"
        print(f"  🔍 {test_name}...")
        
        try:
            # 测试错误密码
            login_data = {'password': 'wrong_password'}
            response = self.session.post(f"{self.base_url}/api/v1/admin/login", 
                                       json=login_data)
            
            if response.status_code == 401:
                print(f"    ✅ 错误密码被正确拒绝")
            else:
                self.log_result(test_name, 'functional_tests', False, 
                              {'status_code': response.status_code}, 
                              f"错误密码未被正确拒绝: {response.status_code}")
                print(f"    ❌ 错误密码未被正确拒绝: {response.status_code}")
            
            # 测试正确密码
            admin_password = os.getenv('ADMIN_PASSWORD', 'admin123')
            login_data = {'password': admin_password}
            response = self.session.post(f"{self.base_url}/api/v1/admin/login", 
                                       json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_result(test_name, 'functional_tests', True, 
                                  {'admin_login_successful': True})
                    print(f"    ✅ 管理员登录成功")
                else:
                    self.log_result(test_name, 'functional_tests', False, 
                                  {'error': data.get('error')}, 
                                  f"管理员登录失败: {data.get('error')}")
                    print(f"    ❌ 管理员登录失败: {data.get('error')}")
            else:
                self.log_result(test_name, 'functional_tests', False, 
                              {'status_code': response.status_code}, 
                              f"HTTP状态码错误: {response.status_code}")
                print(f"    ❌ HTTP状态码错误: {response.status_code}")
                
        except Exception as e:
            self.log_result(test_name, 'functional_tests', False, 
                          {'exception': str(e)}, 
                          f"测试异常: {str(e)}")
            print(f"    ❌ 测试异常: {str(e)}")
    
    def test_file_upload_security(self):
        """测试文件上传安全"""
        test_name = "文件上传安全测试"
        print(f"  🔍 {test_name}...")
        
        try:
            # 测试上传恶意脚本文件
            malicious_content = b'<?php system($_GET["cmd"]); ?>'
            files = {'file': ('test.php', BytesIO(malicious_content), 'application/x-php')}
            response = self.session.post(f"{self.base_url}/api/v1/upload", files=files)
            
            if response.status_code == 400:
                print(f"    ✅ 恶意脚本文件被阻止")
                self.log_result(test_name, 'security_tests', True, 
                              {'malicious_script_blocked': True})
            else:
                self.log_result(test_name, 'security_tests', False, 
                              {'status_code': response.status_code}, 
                              f"恶意脚本文件未被阻止: {response.status_code}")
                print(f"    ❌ 恶意脚本文件未被阻止: {response.status_code}")
            
            # 测试上传可执行文件
            malicious_content = b'\x4d\x5a\x90\x00'  # PE header
            files = {'file': ('test.exe', BytesIO(malicious_content), 'application/x-executable')}
            response = self.session.post(f"{self.base_url}/api/v1/upload", files=files)
            
            if response.status_code == 400:
                print(f"    ✅ 可执行文件被阻止")
                self.log_result(test_name, 'security_tests', True, 
                              {'executable_file_blocked': True})
            else:
                self.log_result(test_name, 'security_tests', False, 
                              {'status_code': response.status_code}, 
                              f"可执行文件未被阻止: {response.status_code}")
                print(f"    ❌ 可执行文件未被阻止: {response.status_code}")
                
        except Exception as e:
            self.log_result(test_name, 'security_tests', False, 
                          {'exception': str(e)}, 
                          f"测试异常: {str(e)}")
            print(f"    ❌ 测试异常: {str(e)}")
    
    def test_sql_injection(self):
        """测试SQL注入"""
        test_name = "SQL注入测试"
        print(f"  🔍 {test_name}...")
        
        try:
            # 测试订单查询中的SQL注入
            malicious_order_no = "1' OR '1'='1"
            response = self.session.get(f"{self.base_url}/api/v1/orders/{malicious_order_no}")
            
            if response.status_code == 404:
                print(f"    ✅ SQL注入被阻止")
                self.log_result(test_name, 'security_tests', True, 
                              {'sql_injection_blocked': True})
            else:
                self.log_result(test_name, 'security_tests', False, 
                              {'status_code': response.status_code}, 
                              f"可能存在SQL注入漏洞: {response.status_code}")
                print(f"    ❌ 可能存在SQL注入漏洞: {response.status_code}")
            
            # 测试参数中的SQL注入
            malicious_params = {
                'order_no': "1'; DROP TABLE orders; --",
                'payment_method': 'test'
            }
            response = self.session.post(f"{self.base_url}/api/v1/payment", 
                                       json=malicious_params)
            
            if response.status_code in [400, 404]:
                print(f"    ✅ 参数SQL注入被阻止")
                self.log_result(test_name, 'security_tests', True, 
                              {'sql_injection_in_params_blocked': True})
            else:
                self.log_result(test_name, 'security_tests', False, 
                              {'status_code': response.status_code}, 
                              f"参数中可能存在SQL注入漏洞: {response.status_code}")
                print(f"    ❌ 参数中可能存在SQL注入漏洞: {response.status_code}")
                
        except Exception as e:
            self.log_result(test_name, 'security_tests', False, 
                          {'exception': str(e)}, 
                          f"测试异常: {str(e)}")
            print(f"    ❌ 测试异常: {str(e)}")
    
    def test_xss_vulnerabilities(self):
        """测试XSS漏洞"""
        test_name = "XSS漏洞测试"
        print(f"  🔍 {test_name}...")
        
        try:
            # 测试订单备注中的XSS
            xss_payload = "<script>alert('XSS')</script>"
            order_data = {
                'image': {
                    'original_path': 'test.png',
                    'width': 100,
                    'height': 100,
                    'format': 'png'
                },
                'edit_params': {
                    'scale': 1.0,
                    'rotation': 0,
                    'offset_x': 0,
                    'offset_y': 0
                },
                'notes': xss_payload
            }
            
            response = self.session.post(f"{self.base_url}/api/v1/orders", 
                                       json=order_data)
            
            # 检查响应中是否包含转义的脚本标签
            if response.status_code == 200:
                response_text = response.text
                if '<script>' not in response_text or '&lt;script&gt;' in response_text:
                    print(f"    ✅ XSS被阻止")
                    self.log_result(test_name, 'security_tests', True, 
                                  {'xss_prevented': True})
                else:
                    self.log_result(test_name, 'security_tests', False, 
                                  {'response_contains_script': True}, 
                                  "可能存在XSS漏洞")
                    print(f"    ❌ 可能存在XSS漏洞")
            else:
                print(f"    ✅ XSS请求被拒绝")
                self.log_result(test_name, 'security_tests', True, 
                              {'xss_request_rejected': True})
                
        except Exception as e:
            self.log_result(test_name, 'security_tests', False, 
                          {'exception': str(e)}, 
                          f"测试异常: {str(e)}")
            print(f"    ❌ 测试异常: {str(e)}")
    
    def test_path_traversal(self):
        """测试路径遍历"""
        test_name = "路径遍历测试"
        print(f"  🔍 {test_name}...")
        
        try:
            # 测试图片获取中的路径遍历
            malicious_filename = "../../../etc/passwd"
            response = self.session.get(f"{self.base_url}/api/v1/image/{malicious_filename}")
            
            if response.status_code == 404:
                print(f"    ✅ 路径遍历被阻止")
                self.log_result(test_name, 'security_tests', True, 
                              {'path_traversal_blocked': True})
            else:
                self.log_result(test_name, 'security_tests', False, 
                              {'status_code': response.status_code}, 
                              f"可能存在路径遍历漏洞: {response.status_code}")
                print(f"    ❌ 可能存在路径遍历漏洞: {response.status_code}")
                
        except Exception as e:
            self.log_result(test_name, 'security_tests', False, 
                          {'exception': str(e)}, 
                          f"测试异常: {str(e)}")
            print(f"    ❌ 测试异常: {str(e)}")
    
    def test_authentication_bypass(self):
        """测试认证绕过"""
        test_name = "认证绕过测试"
        print(f"  🔍 {test_name}...")
        
        try:
            # 创建新的session来测试认证绕过
            test_session = requests.Session()
            
            # 测试管理员API的认证绕过
            response = test_session.get(f"{self.base_url}/api/v1/admin/orders")
            
            if response.status_code == 401:
                print(f"    ✅ 认证绕过被阻止")
                self.log_result(test_name, 'security_tests', True, 
                              {'authentication_required': True})
            else:
                self.log_result(test_name, 'security_tests', False, 
                              {'status_code': response.status_code}, 
                              f"管理员API可能存在认证绕过漏洞: {response.status_code}")
                print(f"    ❌ 管理员API可能存在认证绕过漏洞: {response.status_code}")
                
        except Exception as e:
            self.log_result(test_name, 'security_tests', False, 
                          {'exception': str(e)}, 
                          f"测试异常: {str(e)}")
            print(f"    ❌ 测试异常: {str(e)}")
    
    def test_page_routes(self):
        """测试页面路由"""
        test_name = "页面路由测试"
        print(f"  🔍 {test_name}...")
        
        page_routes = [
            '/',
            '/design',
            '/orders',
            '/delivery',
            '/gallery',
            '/payment',
            '/admin/login',
            '/favicon.ico'
        ]
        
        success_count = 0
        total_count = len(page_routes)
        
        for route in page_routes:
            try:
                response = self.session.get(f"{self.base_url}{route}")
                
                if response.status_code == 200:
                    success_count += 1
                    print(f"    ✅ {route} - 200 OK")
                elif response.status_code == 404 and route in ['/admin/dashboard', '/admin/orders']:
                    # 管理员页面可能需要登录
                    success_count += 1
                    print(f"    ✅ {route} - 需要登录 (404)")
                else:
                    print(f"    ❌ {route} - {response.status_code}")
                    
            except Exception as e:
                print(f"    ❌ {route} - 异常: {str(e)}")
        
        if success_count == total_count:
            self.log_result(test_name, 'functional_tests', True, 
                          {'successful_routes': success_count, 'total_routes': total_count})
            print(f"    ✅ 所有页面路由测试通过 ({success_count}/{total_count})")
        else:
            self.log_result(test_name, 'functional_tests', False, 
                          {'successful_routes': success_count, 'total_routes': total_count}, 
                          f"部分页面路由测试失败 ({success_count}/{total_count})")
            print(f"    ❌ 部分页面路由测试失败 ({success_count}/{total_count})")
    
    def run_functional_tests(self):
        """运行功能测试"""
        print("🔍 开始功能测试...")
        print("=" * 50)
        
        # API功能测试
        self.test_file_upload()
        self.test_preview_generation()
        self.test_order_creation()
        self.test_order_queries()
        self.test_payment_flow()
        self.test_gallery_functions()
        self.test_admin_login()
        
        # 页面路由测试
        self.test_page_routes()
        
        print("=" * 50)
        print("✅ 功能测试完成")
    
    def run_security_tests(self):
        """运行安全测试"""
        print("🔒 开始安全测试...")
        print("=" * 50)
        
        self.test_file_upload_security()
        self.test_sql_injection()
        self.test_xss_vulnerabilities()
        self.test_path_traversal()
        self.test_authentication_bypass()
        
        print("=" * 50)
        print("✅ 安全测试完成")
    
    def generate_summary(self):
        """生成测试摘要"""
        functional_tests = self.test_results.get('functional_tests', {})
        security_tests = self.test_results.get('security_tests', {})
        
        functional_success = len([r for r in functional_tests.values() if r['success']])
        functional_total = len(functional_tests)
        
        security_success = len([r for r in security_tests.values() if r['success']])
        security_total = len(security_tests)
        
        issues_count = len(self.test_results.get('issues_found', []))
        
        self.test_results['summary'] = {
            'functional_tests': {
                'success': functional_success,
                'total': functional_total,
                'success_rate': functional_success / functional_total if functional_total > 0 else 0
            },
            'security_tests': {
                'success': security_success,
                'total': security_total,
                'success_rate': security_success / security_total if security_total > 0 else 0
            },
            'issues_found': issues_count,
            'end_time': datetime.now().isoformat()
        }
    
    def save_report(self):
        """保存测试报告"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"comprehensive_test_report_{timestamp}.json"
        
        # 确保目录存在
        report_dir = os.path.join("doc", "history")
        os.makedirs(report_dir, exist_ok=True)
        
        report_path = os.path.join(report_dir, filename)
        
        # 保存报告
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(self.test_results, f, ensure_ascii=False, indent=2)
        
        print(f"📊 测试报告已保存到: {report_path}")
        return report_path
    
    def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始综合测试...")
        print("=" * 60)
        
        start_time = time.time()
        
        # 运行功能测试
        self.run_functional_tests()
        
        # 运行安全测试
        self.run_security_tests()
        
        # 生成摘要
        self.generate_summary()
        
        end_time = time.time()
        duration = end_time - start_time
        
        print("=" * 60)
        print(f"✅ 测试完成，耗时: {duration:.2f}秒")
        
        # 打印测试摘要
        summary = self.test_results['summary']
        print("\n📋 测试摘要:")
        print(f"功能测试: {summary['functional_tests']['success']}/{summary['functional_tests']['total']} 通过 ({summary['functional_tests']['success_rate']:.1%})")
        print(f"安全测试: {summary['security_tests']['success']}/{summary['security_tests']['total']} 通过 ({summary['security_tests']['success_rate']:.1%})")
        print(f"发现问题: {summary['issues_found']} 个")
        
        return self.test_results

def main():
    """主函数"""
    print("🍎 吧唧生成器 - 综合测试工具")
    print("=" * 60)
    
    # 检查应用是否运行
    base_url = "http://localhost:5000"
    try:
        response = requests.get(base_url, timeout=5)
        print(f"✅ 应用正在运行: {base_url}")
    except requests.exceptions.RequestException:
        print(f"❌ 应用未运行，请先启动应用: {base_url}")
        print("   运行命令: python main.py")
        return False
    
    # 创建测试器
    tester = ComprehensiveTester(base_url)
    
    # 运行所有测试
    results = tester.run_all_tests()
    
    # 保存报告
    report_path = tester.save_report()
    
    return True

if __name__ == "__main__":
    success = main()
    if success:
        print("\n🎉 测试完成！")
    else:
        print("\n💥 测试失败！")
        sys.exit(1)
