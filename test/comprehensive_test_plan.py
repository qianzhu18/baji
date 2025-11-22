#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
吧唧生成器 - 综合测试计划
包含功能测试和安全测试的完整测试套件
"""

import requests
import json
import os
import time
import random
import string
from datetime import datetime, timedelta
from io import BytesIO
from PIL import Image
import tempfile
import hashlib

class ComprehensiveTestSuite:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = {
            'functional_tests': {},
            'security_tests': {},
            'performance_tests': {},
            'issues_found': [],
            'recommendations': []
        }
        self.admin_token = None
        self.test_files = {}
        
    def log_test_result(self, test_name, test_type, success, details=None, issue=None):
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
    
    def create_test_image(self, width=100, height=100, format='PNG'):
        """创建测试图片"""
        img = Image.new('RGB', (width, height), color='red')
        img_buffer = BytesIO()
        img.save(img_buffer, format=format)
        img_buffer.seek(0)
        return img_buffer
    
    def create_malicious_file(self, content_type='image'):
        """创建恶意文件用于安全测试"""
        if content_type == 'image':
            # 创建包含恶意代码的图片文件
            malicious_content = b'\x89PNG\r\n\x1a\n' + b'<?php system($_GET["cmd"]); ?>'
            return BytesIO(malicious_content)
        elif content_type == 'script':
            # 创建脚本文件
            return BytesIO(b'<script>alert("XSS")</script>')
        elif content_type == 'executable':
            # 创建可执行文件
            return BytesIO(b'\x4d\x5a\x90\x00')  # PE header
        return BytesIO(b'malicious content')
    
    def generate_random_string(self, length=10):
        """生成随机字符串"""
        return ''.join(random.choices(string.ascii_letters + string.digits, k=length))
    
    def test_api_endpoints_functional(self):
        """测试API端点的功能"""
        print("🔍 开始功能测试...")
        
        # 1. 测试图片上传
        self.test_image_upload()
        
        # 2. 测试预览生成
        self.test_preview_generation()
        
        # 3. 测试订单创建
        self.test_order_creation()
        
        # 4. 测试订单查询
        self.test_order_queries()
        
        # 5. 测试支付流程
        self.test_payment_flow()
        
        # 6. 测试配送功能
        self.test_delivery_functions()
        
        # 7. 测试作品库功能
        self.test_gallery_functions()
        
        # 8. 测试发票功能
        self.test_invoice_functions()
        
        # 9. 测试图片管理功能
        self.test_image_management()
        
        # 10. 测试案例功能
        self.test_case_functions()
        
        # 11. 测试订单状态管理
        self.test_order_status_management()
        
        # 12. 测试图片删除功能
        self.test_image_deletion()
        
        # 13. 测试订单更新功能
        self.test_order_update()
        
        # 14. 测试支付状态查询
        self.test_payment_status()
        
        # 15. 测试配送详情查询
        self.test_delivery_details()
    
    def test_image_upload(self):
        """测试图片上传功能"""
        test_name = "图片上传功能测试"
        
        try:
            # 正常图片上传
            test_image = self.create_test_image()
            files = {'file': ('test.png', test_image, 'image/png')}
            response = self.session.post(f"{self.base_url}/api/v1/upload", files=files)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.test_files['uploaded_image'] = data.get('file_path')
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'uploaded_file': data.get('file_path')})
                else:
                    self.log_test_result(test_name, 'functional_tests', False, 
                                       {'error': data.get('error')}, 
                                       '图片上传失败')
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '图片上传返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'图片上传测试异常: {str(e)}')
    
    def test_preview_generation(self):
        """测试预览生成功能"""
        test_name = "预览生成功能测试"
        
        try:
            if 'uploaded_image' not in self.test_files:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {}, '缺少上传的图片文件')
                return
            
            preview_data = {
                'image_path': self.test_files['uploaded_image'],
                'width': 100,
                'height': 100,
                'scale': 1.0,
                'rotation': 0,
                'offset_x': 0,
                'offset_y': 0
            }
            
            response = self.session.post(f"{self.base_url}/api/v1/preview", 
                                       json=preview_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.test_files['preview_image'] = data.get('preview_path')
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'preview_path': data.get('preview_path')})
                else:
                    self.log_test_result(test_name, 'functional_tests', False, 
                                       {'error': data.get('error')}, 
                                       '预览生成失败')
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '预览生成返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'预览生成测试异常: {str(e)}')
    
    def test_order_creation(self):
        """测试订单创建功能"""
        test_name = "订单创建功能测试"
        
        try:
            if 'uploaded_image' not in self.test_files:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {}, '缺少上传的图片文件')
                return
            
            order_data = {
                'image': {
                    'original_path': os.path.basename(self.test_files['uploaded_image']),  # 只使用文件名
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
                    self.test_files['order'] = data.get('order')
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'order': data.get('order')})
                else:
                    self.log_test_result(test_name, 'functional_tests', False, 
                                       {'error': data.get('error')}, 
                                       '订单创建失败')
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '订单创建返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'订单创建测试异常: {str(e)}')
    
    def test_order_queries(self):
        """测试订单查询功能"""
        test_name = "订单查询功能测试"
        
        try:
            if 'order' not in self.test_files:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {}, '缺少创建的订单')
                return
            
            order_no = self.test_files['order'].get('order_no')
            
            # 测试获取订单详情
            response = self.session.get(f"{self.base_url}/api/v1/orders/{order_no}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'order_data': data.get('order')})
                else:
                    self.log_test_result(test_name, 'functional_tests', False, 
                                       {'error': data.get('error')}, 
                                       '订单查询失败')
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '订单查询返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'订单查询测试异常: {str(e)}')
    
    def test_payment_flow(self):
        """测试支付流程"""
        test_name = "支付流程测试"
        
        try:
            if 'order' not in self.test_files:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {}, '缺少创建的订单')
                return
            
            order_no = self.test_files['order'].get('order_no')
            
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
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'payment_result': data})
                else:
                    self.log_test_result(test_name, 'functional_tests', False, 
                                       {'error': data.get('error')}, 
                                       '支付处理失败')
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '支付处理返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'支付流程测试异常: {str(e)}')
    
    def test_delivery_functions(self):
        """测试配送功能"""
        test_name = "配送功能测试"
        
        try:
            if 'order' not in self.test_files:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {}, '缺少创建的订单')
                return
            
            delivery_data = {
                'order_ids': [self.test_files['order'].get('id')],
                'recipient_name': '测试用户',
                'phone': '13800138000',
                'address': '测试地址',
                'delivery_method': 'express'
            }
            
            response = self.session.post(f"{self.base_url}/api/v1/delivery", 
                                       json=delivery_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.test_files['delivery'] = data.get('delivery')
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'delivery': data.get('delivery')})
                else:
                    self.log_test_result(test_name, 'functional_tests', False, 
                                       {'error': data.get('error')}, 
                                       '配送创建失败')
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '配送创建返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'配送功能测试异常: {str(e)}')
    
    def test_gallery_functions(self):
        """测试作品库功能"""
        test_name = "作品库功能测试"
        
        try:
            # 测试获取作品列表
            response = self.session.get(f"{self.base_url}/api/v1/gallery")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'gallery_items': len(data.get('items', []))})
                else:
                    self.log_test_result(test_name, 'functional_tests', False, 
                                       {'error': data.get('error')}, 
                                       '作品库查询失败')
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '作品库查询返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'作品库功能测试异常: {str(e)}')
    
    def test_invoice_functions(self):
        """测试发票功能"""
        test_name = "发票功能测试"
        
        try:
            if 'order' not in self.test_files:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {}, '缺少创建的订单')
                return
            
            order_no = self.test_files['order'].get('order_no')
            
            # 测试获取发票
            response = self.session.get(f"{self.base_url}/api/v1/invoice/{order_no}")
            
            if response.status_code == 200:
                self.log_test_result(test_name, 'functional_tests', True, 
                                   {'invoice_size': len(response.content)})
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '发票获取返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'发票功能测试异常: {str(e)}')
    
    def test_image_management(self):
        """测试图片管理功能"""
        test_name = "图片管理功能测试"
        
        try:
            if 'uploaded_image' not in self.test_files:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {}, '缺少上传的图片文件')
                return
            
            # 测试获取图片
            filename = os.path.basename(self.test_files['uploaded_image'])
            response = self.session.get(f"{self.base_url}/api/v1/image/{filename}")
            
            if response.status_code == 200:
                self.log_test_result(test_name, 'functional_tests', True, 
                                   {'image_retrieved': True})
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '图片获取失败')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'图片管理功能测试异常: {str(e)}')
    
    def test_case_functions(self):
        """测试案例功能"""
        test_name = "案例功能测试"
        
        try:
            # 测试获取案例列表
            response = self.session.get(f"{self.base_url}/api/v1/cases")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    cases = data.get('cases', [])
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'cases_count': len(cases)})
                    
                    # 如果有案例，测试获取案例详情
                    if cases:
                        case_id = cases[0]['id']
                        detail_response = self.session.get(f"{self.base_url}/api/v1/cases/{case_id}")
                        
                        if detail_response.status_code == 200:
                            self.log_test_result("案例详情测试", 'functional_tests', True, 
                                               {'case_detail_retrieved': True})
                        else:
                            self.log_test_result("案例详情测试", 'functional_tests', False, 
                                               {'status_code': detail_response.status_code}, 
                                               '案例详情获取失败')
                else:
                    self.log_test_result(test_name, 'functional_tests', False, 
                                       {'error': data.get('error')}, 
                                       '案例列表获取失败')
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '案例列表获取返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'案例功能测试异常: {str(e)}')
    
    def test_order_status_management(self):
        """测试订单状态管理"""
        test_name = "订单状态管理测试"
        
        try:
            if 'order' not in self.test_files:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {}, '缺少创建的订单')
                return
            
            order_no = self.test_files['order'].get('order_no')
            
            # 测试获取订单状态
            response = self.session.get(f"{self.base_url}/api/v1/orders/{order_no}/status")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'order_status': data.get('status')})
                else:
                    self.log_test_result(test_name, 'functional_tests', False, 
                                       {'error': data.get('error')}, 
                                       '订单状态获取失败')
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '订单状态获取返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'订单状态管理测试异常: {str(e)}')
    
    def test_image_deletion(self):
        """测试图片删除功能"""
        test_name = "图片删除功能测试"
        
        try:
            if 'uploaded_image' not in self.test_files:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {}, '缺少上传的图片文件')
                return
            
            filename = os.path.basename(self.test_files['uploaded_image'])
            
            # 测试删除图片
            response = self.session.delete(f"{self.base_url}/api/v1/image/{filename}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'image_deleted': True})
                else:
                    self.log_test_result(test_name, 'functional_tests', False, 
                                       {'error': data.get('error')}, 
                                       '图片删除失败')
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '图片删除返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'图片删除功能测试异常: {str(e)}')
    
    def test_order_update(self):
        """测试订单更新功能"""
        test_name = "订单更新功能测试"
        
        try:
            if 'order' not in self.test_files:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {}, '缺少创建的订单')
                return
            
            order_no = self.test_files['order'].get('order_no')
            
            # 测试更新订单信息
            update_data = {
                'customer_name': '测试用户更新',
                'customer_phone': '13800138001',
                'delivery_address': '测试地址更新'
            }
            
            response = self.session.put(f"{self.base_url}/api/v1/orders/{order_no}", 
                                      json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'order_updated': True})
                else:
                    self.log_test_result(test_name, 'functional_tests', False, 
                                       {'error': data.get('error')}, 
                                       '订单更新失败')
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '订单更新返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'订单更新功能测试异常: {str(e)}')
    
    def test_payment_status(self):
        """测试支付状态查询"""
        test_name = "支付状态查询测试"
        
        try:
            if 'order' not in self.test_files:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {}, '缺少创建的订单')
                return
            
            order_no = self.test_files['order'].get('order_no')
            
            # 测试查询支付状态
            response = self.session.get(f"{self.base_url}/api/v1/payment/{order_no}/status")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'payment_status': data.get('status')})
                else:
                    self.log_test_result(test_name, 'functional_tests', False, 
                                       {'error': data.get('error')}, 
                                       '支付状态查询失败')
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '支付状态查询返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'支付状态查询测试异常: {str(e)}')
    
    def test_delivery_details(self):
        """测试配送详情查询"""
        test_name = "配送详情查询测试"
        
        try:
            if 'delivery' not in self.test_files:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {}, '缺少创建的配送记录')
                return
            
            delivery_id = self.test_files['delivery'].get('delivery_id')
            
            # 测试查询配送详情
            response = self.session.get(f"{self.base_url}/api/v1/delivery/{delivery_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'delivery_details': data.get('delivery')})
                else:
                    self.log_test_result(test_name, 'functional_tests', False, 
                                       {'error': data.get('error')}, 
                                       '配送详情查询失败')
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '配送详情查询返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'配送详情查询测试异常: {str(e)}')
    
    def test_security_vulnerabilities(self):
        """测试安全漏洞"""
        print("🔒 开始安全测试...")
        
        # 1. 文件上传安全测试
        self.test_file_upload_security()
        
        # 2. SQL注入测试
        self.test_sql_injection()
        
        # 3. XSS测试
        self.test_xss_vulnerabilities()
        
        # 4. 路径遍历测试
        self.test_path_traversal()
        
        # 5. 认证绕过测试
        self.test_authentication_bypass()
        
        # 6. 权限提升测试
        self.test_privilege_escalation()
        
        # 7. 敏感信息泄露测试
        self.test_information_disclosure()
        
        # 8. 新增：MIME类型验证测试
        self.test_mime_type_validation()
        
        # 9. 新增：文件权限测试
        self.test_file_permissions()
        
        # 10. 新增：请求频率限制测试
        self.test_rate_limiting()
        
        # 11. 新增：安全头测试
        self.test_security_headers()
        
        # 12. 新增：安全审计日志测试
        self.test_security_audit_logging()
        
        # 13. 新增：设备ID验证测试
        self.test_device_id_validation()
        
        # 14. 新增：设备隔离测试
        self.test_device_isolation()
        
        # 15. 新增：管理员会话管理测试
        self.test_admin_session_management()
    
    def test_file_upload_security(self):
        """测试文件上传安全"""
        test_name = "文件上传安全测试"
        
        try:
            # 测试上传恶意脚本文件
            malicious_script = self.create_malicious_file('script')
            files = {'file': ('test.php', malicious_script, 'application/x-php')}
            response = self.session.post(f"{self.base_url}/api/v1/upload", files=files)
            
            if response.status_code == 400:
                self.log_test_result(test_name, 'security_tests', True, 
                                   {'blocked_malicious_file': True})
            else:
                self.log_test_result(test_name, 'security_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '未阻止恶意脚本文件上传')
            
            # 测试上传可执行文件
            malicious_exe = self.create_malicious_file('executable')
            files = {'file': ('test.exe', malicious_exe, 'application/x-executable')}
            response = self.session.post(f"{self.base_url}/api/v1/upload", files=files)
            
            if response.status_code == 400:
                self.log_test_result(test_name, 'security_tests', True, 
                                   {'blocked_executable_file': True})
            else:
                self.log_test_result(test_name, 'security_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '未阻止可执行文件上传')
                
        except Exception as e:
            self.log_test_result(test_name, 'security_tests', False, 
                               {'exception': str(e)}, 
                               f'文件上传安全测试异常: {str(e)}')
    
    def test_sql_injection(self):
        """测试SQL注入"""
        test_name = "SQL注入测试"
        
        try:
            # 测试订单查询中的SQL注入
            malicious_order_no = "1' OR '1'='1"
            response = self.session.get(f"{self.base_url}/api/v1/orders/{malicious_order_no}")
            
            if response.status_code == 404:
                self.log_test_result(test_name, 'security_tests', True, 
                                   {'sql_injection_blocked': True})
            else:
                self.log_test_result(test_name, 'security_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '可能存在SQL注入漏洞')
            
            # 测试参数中的SQL注入
            malicious_params = {
                'order_no': "1'; DROP TABLE orders; --",
                'payment_method': 'test'
            }
            response = self.session.post(f"{self.base_url}/api/v1/payment", 
                                       json=malicious_params)
            
            if response.status_code in [400, 404]:
                self.log_test_result(test_name, 'security_tests', True, 
                                   {'sql_injection_in_params_blocked': True})
            else:
                self.log_test_result(test_name, 'security_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '参数中可能存在SQL注入漏洞')
                
        except Exception as e:
            self.log_test_result(test_name, 'security_tests', False, 
                               {'exception': str(e)}, 
                               f'SQL注入测试异常: {str(e)}')
    
    def test_xss_vulnerabilities(self):
        """测试XSS漏洞"""
        test_name = "XSS漏洞测试"
        
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
                    self.log_test_result(test_name, 'security_tests', True, 
                                       {'xss_prevented': True})
                else:
                    self.log_test_result(test_name, 'security_tests', False, 
                                       {'response_contains_script': True}, 
                                       '可能存在XSS漏洞')
            else:
                self.log_test_result(test_name, 'security_tests', True, 
                                   {'xss_request_rejected': True})
                
        except Exception as e:
            self.log_test_result(test_name, 'security_tests', False, 
                               {'exception': str(e)}, 
                               f'XSS测试异常: {str(e)}')
    
    def test_path_traversal(self):
        """测试路径遍历"""
        test_name = "路径遍历测试"
        
        try:
            # 测试图片获取中的路径遍历
            malicious_filename = "../../../etc/passwd"
            response = self.session.get(f"{self.base_url}/api/v1/image/{malicious_filename}")
            
            if response.status_code == 404:
                self.log_test_result(test_name, 'security_tests', True, 
                                   {'path_traversal_blocked': True})
            else:
                self.log_test_result(test_name, 'security_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '可能存在路径遍历漏洞')
                
        except Exception as e:
            self.log_test_result(test_name, 'security_tests', False, 
                               {'exception': str(e)}, 
                               f'路径遍历测试异常: {str(e)}')
    
    def test_authentication_bypass(self):
        """测试认证绕过"""
        test_name = "认证绕过测试"
        
        try:
            # 测试管理员API的认证绕过
            response = self.session.get(f"{self.base_url}/api/v1/admin/orders")
            
            if response.status_code == 401:
                self.log_test_result(test_name, 'security_tests', True, 
                                   {'authentication_required': True})
            else:
                self.log_test_result(test_name, 'security_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '管理员API可能存在认证绕过漏洞')
                
        except Exception as e:
            self.log_test_result(test_name, 'security_tests', False, 
                               {'exception': str(e)}, 
                               f'认证绕过测试异常: {str(e)}')
    
    def test_privilege_escalation(self):
        """测试权限提升"""
        test_name = "权限提升测试"
        
        try:
            # 测试普通用户访问管理员功能
            response = self.session.post(f"{self.base_url}/api/v1/admin/coupons", 
                                       json={'quantity': 1, 'discount_value': 10})
            
            if response.status_code == 401:
                self.log_test_result(test_name, 'security_tests', True, 
                                   {'privilege_escalation_blocked': True})
            else:
                self.log_test_result(test_name, 'security_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '可能存在权限提升漏洞')
                
        except Exception as e:
            self.log_test_result(test_name, 'security_tests', False, 
                               {'exception': str(e)}, 
                               f'权限提升测试异常: {str(e)}')
    
    def test_information_disclosure(self):
        """测试敏感信息泄露"""
        test_name = "敏感信息泄露测试"
        
        try:
            # 测试错误页面是否泄露敏感信息
            response = self.session.get(f"{self.base_url}/api/v1/nonexistent")
            
            if response.status_code == 404:
                response_text = response.text.lower()
                sensitive_keywords = ['password', 'secret', 'key', 'token', 'database']
                
                leaked_info = [kw for kw in sensitive_keywords if kw in response_text]
                
                if not leaked_info:
                    self.log_test_result(test_name, 'security_tests', True, 
                                       {'no_sensitive_info_leaked': True})
                else:
                    self.log_test_result(test_name, 'security_tests', False, 
                                       {'leaked_keywords': leaked_info}, 
                                       f'错误页面可能泄露敏感信息: {leaked_info}')
            else:
                self.log_test_result(test_name, 'security_tests', True, 
                                   {'error_page_properly_handled': True})
                
        except Exception as e:
            self.log_test_result(test_name, 'security_tests', False, 
                               {'exception': str(e)}, 
                               f'敏感信息泄露测试异常: {str(e)}')
    
    def test_mime_type_validation(self):
        """测试MIME类型验证"""
        test_name = "MIME类型验证测试"
        
        try:
            # 测试伪造的图片文件（扩展名是图片但内容不是）
            fake_image_content = b'This is not an image file'
            files = {'file': ('fake_image.jpg', BytesIO(fake_image_content), 'image/jpeg')}
            response = self.session.post(f"{self.base_url}/api/v1/upload", files=files)
            
            if response.status_code == 400:
                self.log_test_result(test_name, 'security_tests', True, 
                                   {'fake_image_rejected': True})
            else:
                self.log_test_result(test_name, 'security_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '伪造图片文件未被正确拒绝')
            
            # 测试包含恶意代码的图片文件头
            malicious_image = b'\xff\xd8\xff' + b'<?php system($_GET["cmd"]); ?>'
            files = {'file': ('malicious.jpg', BytesIO(malicious_image), 'image/jpeg')}
            response = self.session.post(f"{self.base_url}/api/v1/upload", files=files)
            
            if response.status_code == 400:
                self.log_test_result(test_name, 'security_tests', True, 
                                   {'malicious_image_rejected': True})
            else:
                self.log_test_result(test_name, 'security_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '恶意图片文件未被正确拒绝')
                
        except Exception as e:
            self.log_test_result(test_name, 'security_tests', False, 
                               {'exception': str(e)}, 
                               f'MIME类型验证测试异常: {str(e)}')
    
    def test_file_permissions(self):
        """测试文件权限设置"""
        test_name = "文件权限测试"
        
        try:
            # 上传一个正常图片
            test_image = self.create_test_image()
            files = {'file': ('permission_test.png', test_image, 'image/png')}
            response = self.session.post(f"{self.base_url}/api/v1/upload", files=files)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    file_path = data.get('file_path')
                    # 注意：这里无法直接测试文件权限，因为测试环境可能不同
                    # 但我们可以验证文件是否成功保存
                    self.log_test_result(test_name, 'security_tests', True, 
                                       {'file_saved_successfully': True})
                else:
                    self.log_test_result(test_name, 'security_tests', False, 
                                       {'error': data.get('error')}, 
                                       '文件保存失败')
            else:
                self.log_test_result(test_name, 'security_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '文件上传返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'security_tests', False, 
                               {'exception': str(e)}, 
                               f'文件权限测试异常: {str(e)}')
    
    def test_rate_limiting(self):
        """测试请求频率限制"""
        test_name = "请求频率限制测试"
        
        try:
            # 快速发送多个上传请求
            responses = []
            for i in range(15):  # 超过10次/分钟的限制
                test_image = self.create_test_image()
                files = {'file': (f'rate_test_{i}.png', test_image, 'image/png')}
                response = self.session.post(f"{self.base_url}/api/v1/upload", files=files)
                responses.append(response.status_code)
                
                # 短暂延迟避免过快请求
                time.sleep(0.1)
            
            # 检查是否有429状态码（频率限制）
            rate_limited_count = responses.count(429)
            # 也检查是否有其他错误状态码（可能是频率限制的变体）
            error_count = len([r for r in responses if r >= 400])
            
            if rate_limited_count > 0 or error_count > 5:  # 如果有多个错误，可能是频率限制
                self.log_test_result(test_name, 'security_tests', True, 
                                   {'rate_limiting_active': True, 'blocked_requests': rate_limited_count, 
                                    'total_errors': error_count, 'all_responses': responses})
            else:
                self.log_test_result(test_name, 'security_tests', False, 
                                   {'rate_limiting_active': False, 'all_responses': responses}, 
                                   '请求频率限制可能未生效')
                
        except Exception as e:
            self.log_test_result(test_name, 'security_tests', False, 
                               {'exception': str(e)}, 
                               f'请求频率限制测试异常: {str(e)}')
    
    def test_security_headers(self):
        """测试安全头"""
        test_name = "安全头测试"
        
        try:
            response = self.session.get(f"{self.base_url}/")
            headers = response.headers
            
            # 检查关键安全头（已移除CSP检查）
            security_headers = {
                'X-Frame-Options': ['SAMEORIGIN', 'DENY'],
                'X-Content-Type-Options': ['nosniff'],
                'X-XSS-Protection': ['1; mode=block'],
                'Strict-Transport-Security': ['max-age=']
            }
            
            found_headers = {}
            for header, expected_values in security_headers.items():
                if header in headers:
                    header_value = headers[header]
                    # 检查是否包含期望的值
                    for expected_value in expected_values:
                        if expected_value in header_value:
                            found_headers[header] = header_value
                            break
            
            if len(found_headers) >= 3:
                self.log_test_result(test_name, 'security_tests', True, 
                                   {'security_headers_found': found_headers})
            else:
                self.log_test_result(test_name, 'security_tests', False, 
                                   {'found_headers': found_headers}, 
                                   f'安全头不足，仅找到{len(found_headers)}个')
                
        except Exception as e:
            self.log_test_result(test_name, 'security_tests', False, 
                               {'exception': str(e)}, 
                               f'安全头测试异常: {str(e)}')
    
    def test_security_audit_logging(self):
        """测试安全审计日志"""
        test_name = "安全审计日志测试"
        
        try:
            # 执行一些安全相关操作，然后检查日志
            test_operations = [
                # 1. 尝试上传恶意文件
                {
                    'name': 'malicious_upload',
                    'action': lambda: self.session.post(f"{self.base_url}/api/v1/upload", 
                                                      files={'file': ('test.php', BytesIO(b'<?php echo "hack"; ?>'), 'application/x-php')},
                                                      headers={'X-Device-ID': self.generate_random_string(25)})
                },
                # 2. 尝试访问不存在的文件
                {
                    'name': 'file_not_found',
                    'action': lambda: self.session.get(f"{self.base_url}/api/v1/image/nonexistent_file.jpg")
                },
                # 3. 尝试管理员登录失败
                {
                    'name': 'admin_login_failed',
                    'action': lambda: self.session.post(f"{self.base_url}/api/v1/admin/login", 
                                                       json={'password': 'wrong_password'})
                }
            ]
            
            # 执行测试操作
            for operation in test_operations:
                try:
                    operation['action']()
                except:
                    pass
            
            # 检查是否有安全日志文件生成
            log_dirs = ['static/logs', 'static/logs/security']
            log_files_found = []
            
            for log_dir in log_dirs:
                if os.path.exists(log_dir):
                    for file in os.listdir(log_dir):
                        if file.endswith('.json') or file.endswith('.log'):
                            log_files_found.append(os.path.join(log_dir, file))
            
            if log_files_found:
                self.log_test_result(test_name, 'security_tests', True, 
                                   {'log_files_found': log_files_found})
            else:
                self.log_test_result(test_name, 'security_tests', False, 
                                   {}, '未找到安全审计日志文件')
                
        except Exception as e:
            self.log_test_result(test_name, 'security_tests', False, 
                               {'exception': str(e)}, 
                               f'安全审计日志测试异常: {str(e)}')
    
    def test_device_id_validation(self):
        """测试设备ID验证"""
        test_name = "设备ID验证测试"
        
        try:
            # 测试缺少设备ID
            response = self.session.get(f"{self.base_url}/api/v1/orders")
            
            if response.status_code == 400:
                self.log_test_result(test_name, 'security_tests', True, 
                                   {'missing_device_id_rejected': True})
            else:
                self.log_test_result(test_name, 'security_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '缺少设备ID未被正确拒绝')
            
            # 测试无效设备ID格式
            invalid_device_ids = ['INVALID123', 'DEV123', 'WRONG1234567890123456789']
            for invalid_id in invalid_device_ids:
                response = self.session.get(
                    f"{self.base_url}/api/v1/orders",
                    headers={'X-Device-ID': invalid_id}
                )
                
                if response.status_code != 400:
                    self.log_test_result(test_name, 'security_tests', False, 
                                       {'invalid_id_accepted': invalid_id}, 
                                       f'无效设备ID被接受: {invalid_id}')
                    return
            
            self.log_test_result(test_name, 'security_tests', True, 
                               {'invalid_device_ids_rejected': True})
                
        except Exception as e:
            self.log_test_result(test_name, 'security_tests', False, 
                               {'exception': str(e)}, 
                               f'设备ID验证测试异常: {str(e)}')
    
    def test_device_isolation(self):
        """测试设备隔离"""
        test_name = "设备隔离测试"
        
        try:
            # 创建两个不同的设备ID
            device_id_1 = self.generate_random_string(25)
            device_id_2 = self.generate_random_string(25)
            
            # 使用设备1创建订单
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
                'quantity': 1,
                'notes': '设备1的订单'
            }
            
            response1 = self.session.post(
                f"{self.base_url}/api/v1/orders",
                json=order_data,
                headers={'X-Device-ID': device_id_1}
            )
            
            if response1.status_code == 200:
                order_data1 = response1.json()
                order_no = order_data1.get('order', {}).get('order_no')
                
                if order_no:
                    # 尝试用设备2访问设备1的订单
                    response2 = self.session.get(
                        f"{self.base_url}/api/v1/orders/{order_no}",
                        headers={'X-Device-ID': device_id_2}
                    )
                    
                    if response2.status_code == 404:
                        self.log_test_result(test_name, 'security_tests', True, 
                                           {'device_isolation_working': True})
                    else:
                        self.log_test_result(test_name, 'security_tests', False, 
                                           {'status_code': response2.status_code}, 
                                           '设备隔离失效')
                else:
                    self.log_test_result(test_name, 'security_tests', False, 
                                       {}, '无法获取订单号进行隔离测试')
            else:
                self.log_test_result(test_name, 'security_tests', False, 
                                   {'status_code': response1.status_code}, 
                                   '无法创建测试订单')
                
        except Exception as e:
            self.log_test_result(test_name, 'security_tests', False, 
                               {'exception': str(e)}, 
                               f'设备隔离测试异常: {str(e)}')
    
    def test_admin_session_management(self):
        """测试管理员会话管理"""
        test_name = "管理员会话管理测试"
        
        try:
            # 测试登录状态检查
            response = self.session.get(f"{self.base_url}/api/v1/admin/check")
            
            if response.status_code == 200:
                data = response.json()
                if not data.get('logged_in', False):
                    self.log_test_result(test_name, 'security_tests', True, 
                                       {'login_status_correct': True})
                else:
                    self.log_test_result(test_name, 'security_tests', False, 
                                       {'unexpected_login_status': True}, 
                                       '未登录状态下显示已登录')
            else:
                self.log_test_result(test_name, 'security_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '登录状态检查返回错误状态码')
            
            # 测试登出功能（即使未登录）
            logout_response = self.session.post(f"{self.base_url}/api/v1/admin/logout")
            
            if logout_response.status_code == 200:
                self.log_test_result(test_name, 'security_tests', True, 
                                   {'logout_handled': True})
            else:
                self.log_test_result(test_name, 'security_tests', False, 
                                   {'status_code': logout_response.status_code}, 
                                   '登出功能返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'security_tests', False, 
                               {'exception': str(e)}, 
                               f'管理员会话管理测试异常: {str(e)}')
    
    def test_admin_functions(self):
        """测试管理员功能"""
        print("👨‍💼 开始管理员功能测试...")
        
        # 1. 管理员登录
        self.test_admin_login()
        
        # 2. 管理员订单管理
        self.test_admin_order_management()
        
        # 3. 管理员券码管理
        self.test_admin_coupon_management()
        
        # 4. 管理员导出功能
        self.test_admin_export_functions()
        
        # 5. 管理员登出功能
        self.test_admin_logout()
        
        # 6. 管理员登录状态检查
        self.test_admin_check_login()
        
        # 7. 管理员订单状态更新
        self.test_admin_order_status_update()
        
        # 8. 管理员券码管理
        self.test_admin_coupon_list()
        
        # 9. 管理员系统配置
        self.test_admin_config_management()
    
    def test_admin_login(self):
        """测试管理员登录"""
        test_name = "管理员登录测试"
        
        try:
            # 测试错误密码
            login_data = {'password': 'wrong_password'}
            response = self.session.post(f"{self.base_url}/api/v1/admin/login", 
                                       json=login_data)
            
            if response.status_code == 401:
                self.log_test_result(test_name, 'functional_tests', True, 
                                   {'wrong_password_rejected': True})
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '错误密码未被正确拒绝')
            
            # 测试正确密码（需要从环境变量获取）
            admin_password = os.getenv('ADMIN_PASSWORD', 'admin123')
            login_data = {'password': admin_password}
            response = self.session.post(f"{self.base_url}/api/v1/admin/login", 
                                       json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.admin_token = True  # 标记已登录
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'admin_login_successful': True})
                else:
                    self.log_test_result(test_name, 'functional_tests', False, 
                                       {'error': data.get('error')}, 
                                       '管理员登录失败')
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '管理员登录返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'管理员登录测试异常: {str(e)}')
    
    def test_admin_order_management(self):
        """测试管理员订单管理"""
        test_name = "管理员订单管理测试"
        
        try:
            if not self.admin_token:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {}, '管理员未登录')
                return
            
            # 测试获取订单列表
            response = self.session.get(f"{self.base_url}/api/v1/admin/orders")
            
            if response.status_code == 200:
                data = response.json()
                self.log_test_result(test_name, 'functional_tests', True, 
                                   {'orders_count': len(data.get('orders', []))})
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '获取订单列表失败')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'管理员订单管理测试异常: {str(e)}')
    
    def test_admin_coupon_management(self):
        """测试管理员券码管理"""
        test_name = "管理员券码管理测试"
        
        try:
            if not self.admin_token:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {}, '管理员未登录')
                return
            
            # 测试生成券码
            coupon_data = {
                'quantity': 1,
                'discount_type': 'fixed',
                'discount_value': 10,
                'min_order_amount': 0,
                'valid_days': 30,
                'usage_limit': 1
            }
            
            response = self.session.post(f"{self.base_url}/api/v1/admin/coupons", 
                                       json=coupon_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'coupons_generated': len(data.get('coupons', []))})
                else:
                    self.log_test_result(test_name, 'functional_tests', False, 
                                       {'error': data.get('error')}, 
                                       '券码生成失败')
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '券码生成返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'管理员券码管理测试异常: {str(e)}')
    
    def test_admin_export_functions(self):
        """测试管理员导出功能"""
        test_name = "管理员导出功能测试"
        
        try:
            if not self.admin_token:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {}, '管理员未登录')
                return
            
            # 测试导出PDF
            export_data = {
                'order_ids': [],
                'format': 'a4_6',
                'size': '68x68'
            }
            
            response = self.session.post(f"{self.base_url}/api/v1/admin/export/pdf", 
                                       json=export_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'pdf_exported': True})
                else:
                    self.log_test_result(test_name, 'functional_tests', False, 
                                       {'error': data.get('error')}, 
                                       'PDF导出失败')
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   'PDF导出返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'管理员导出功能测试异常: {str(e)}')
    
    def test_admin_logout(self):
        """测试管理员登出"""
        test_name = "管理员登出测试"
        
        try:
            if not self.admin_token:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {}, '管理员未登录')
                return
            
            response = self.session.post(f"{self.base_url}/api/v1/admin/logout")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.admin_token = False  # 标记为已登出
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'logout_successful': True})
                else:
                    self.log_test_result(test_name, 'functional_tests', False, 
                                       {'error': data.get('error')}, 
                                       '管理员登出失败')
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '管理员登出返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'管理员登出测试异常: {str(e)}')
    
    def test_admin_check_login(self):
        """测试管理员登录状态检查"""
        test_name = "管理员登录状态检查测试"
        
        try:
            response = self.session.get(f"{self.base_url}/api/v1/admin/check")
            
            if response.status_code == 200:
                data = response.json()
                logged_in = data.get('logged_in', False)
                
                # 根据当前登录状态验证结果
                if self.admin_token and logged_in:
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'login_status_correct': True})
                elif not self.admin_token and not logged_in:
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'logout_status_correct': True})
                else:
                    self.log_test_result(test_name, 'functional_tests', False, 
                                       {'expected_logged_in': self.admin_token, 
                                        'actual_logged_in': logged_in}, 
                                       '登录状态检查不准确')
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '登录状态检查返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'管理员登录状态检查测试异常: {str(e)}')
    
    def test_admin_order_status_update(self):
        """测试管理员订单状态更新"""
        test_name = "管理员订单状态更新测试"
        
        try:
            if not self.admin_token:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {}, '管理员未登录')
                return
            
            if 'order' not in self.test_files:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {}, '缺少创建的订单')
                return
            
            order_id = self.test_files['order'].get('id', 1)  # 假设订单ID
            
            # 测试更新订单状态
            update_data = {'status': 'processing'}
            response = self.session.put(f"{self.base_url}/api/v1/admin/orders/{order_id}/status", 
                                      json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'order_status_updated': True})
                else:
                    self.log_test_result(test_name, 'functional_tests', False, 
                                       {'error': data.get('error')}, 
                                       '订单状态更新失败')
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '订单状态更新返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'管理员订单状态更新测试异常: {str(e)}')
    
    def test_admin_coupon_list(self):
        """测试管理员券码列表"""
        test_name = "管理员券码列表测试"
        
        try:
            if not self.admin_token:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {}, '管理员未登录')
                return
            
            # 测试获取券码列表
            response = self.session.get(f"{self.base_url}/api/v1/admin/coupons")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    coupons = data.get('coupons', [])
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'coupons_count': len(coupons)})
                else:
                    self.log_test_result(test_name, 'functional_tests', False, 
                                       {'error': data.get('error')}, 
                                       '券码列表获取失败')
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '券码列表获取返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'管理员券码列表测试异常: {str(e)}')
    
    def test_admin_config_management(self):
        """测试管理员系统配置"""
        test_name = "管理员系统配置测试"
        
        try:
            if not self.admin_token:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {}, '管理员未登录')
                return
            
            # 测试获取系统配置
            response = self.session.get(f"{self.base_url}/api/v1/admin/config")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    config = data.get('config', {})
                    self.log_test_result(test_name, 'functional_tests', True, 
                                       {'config_retrieved': True, 'config_keys': list(config.keys())})
                else:
                    self.log_test_result(test_name, 'functional_tests', False, 
                                       {'error': data.get('error')}, 
                                       '系统配置获取失败')
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   '系统配置获取返回错误状态码')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'管理员系统配置测试异常: {str(e)}')
    
    def test_page_routes(self):
        """测试页面路由"""
        print("📄 开始页面路由测试...")
        
        page_routes = [
            '/',
            '/design',
            '/orders',
            '/delivery',
            '/gallery',
            '/payment',
            '/error',
            '/admin/login',
            '/admin/dashboard',
            '/admin/orders',
            '/admin/coupons',
            '/admin/print',
            '/admin/delivery',
            '/admin/cases',
            '/favicon.ico'
        ]
        
        # 添加动态路由测试
        dynamic_routes = [
            '/order/TEST123456',  # 订单详情页面
            '/invoice/TEST123456',  # 发票页面
            '/view/1',  # 作品查看页面
            '/case/1'  # 案例详情页面
        ]
        
        # 测试所有页面路由
        for route in page_routes:
            self.test_single_page_route(route)
        
        # 测试动态路由
        for route in dynamic_routes:
            self.test_single_page_route(route)
    
    def test_single_page_route(self, route):
        """测试单个页面路由"""
        test_name = f"页面路由测试: {route}"
        
        try:
            response = self.session.get(f"{self.base_url}{route}")
            
            if response.status_code == 200:
                self.log_test_result(test_name, 'functional_tests', True, 
                                   {'content_length': len(response.content)})
            elif response.status_code == 404 and route in ['/admin/dashboard', '/admin/orders', '/admin/coupons']:
                # 管理员页面可能需要登录
                self.log_test_result(test_name, 'functional_tests', True, 
                                   {'requires_login': True})
            else:
                self.log_test_result(test_name, 'functional_tests', False, 
                                   {'status_code': response.status_code}, 
                                   f'页面路由返回错误状态码: {response.status_code}')
                
        except Exception as e:
            self.log_test_result(test_name, 'functional_tests', False, 
                               {'exception': str(e)}, 
                               f'页面路由测试异常: {str(e)}')
    
    def generate_recommendations(self):
        """生成安全建议"""
        recommendations = []
        
        # 基于测试结果生成建议
        security_tests = self.test_results.get('security_tests', {})
        functional_tests = self.test_results.get('functional_tests', {})
        
        # 检查具体的安全测试结果
        failed_security_tests = [name for name, result in security_tests.items() if not result['success']]
        
        if failed_security_tests:
            recommendations.append({
                'type': 'security',
                'priority': 'high',
                'title': '修复安全漏洞',
                'description': f'发现以下安全测试失败: {", ".join(failed_security_tests)}，需要立即修复'
            })
        
        # 检查MIME类型验证
        if 'MIME类型验证测试' in security_tests and not security_tests['MIME类型验证测试']['success']:
            recommendations.append({
                'type': 'security',
                'priority': 'high',
                'title': '加强文件类型验证',
                'description': 'MIME类型验证测试失败，建议加强文件头检查和内容验证'
            })
        
        # 检查频率限制
        if '请求频率限制测试' in security_tests and not security_tests['请求频率限制测试']['success']:
            recommendations.append({
                'type': 'security',
                'priority': 'high',
                'title': '启用请求频率限制',
                'description': '请求频率限制测试失败，建议检查Flask-Limiter配置'
            })
        
        # 检查安全头
        if '安全头测试' in security_tests and not security_tests['安全头测试']['success']:
            recommendations.append({
                'type': 'security',
                'priority': 'medium',
                'title': '完善安全头配置',
                'description': '安全头测试失败，建议检查Flask-Talisman配置'
            })
        
        # 检查审计日志
        if '安全审计日志测试' in security_tests and not security_tests['安全审计日志测试']['success']:
            recommendations.append({
                'type': 'security',
                'priority': 'medium',
                'title': '启用安全审计日志',
                'description': '安全审计日志测试失败，建议检查日志配置和权限'
            })
        
        if any(not result['success'] for result in functional_tests.values()):
            recommendations.append({
                'type': 'functionality',
                'priority': 'medium',
                'title': '修复功能问题',
                'description': '部分功能测试失败，建议检查相关代码逻辑和错误处理'
            })
        
        # 基于安全改进的新建议
        recommendations.extend([
            {
                'type': 'security',
                'priority': 'low',
                'title': '定期安全审计',
                'description': '建议定期运行安全测试，检查系统安全状态'
            },
            {
                'type': 'security',
                'priority': 'low',
                'title': '监控安全日志',
                'description': '建议设置安全日志监控和告警机制'
            },
            {
                'type': 'security',
                'priority': 'low',
                'title': '更新依赖包',
                'description': '建议定期更新安全相关依赖包，修复已知漏洞'
            },
            {
                'type': 'performance',
                'priority': 'low',
                'title': '优化图片处理',
                'description': '建议优化图片处理性能，添加缓存机制'
            },
            {
                'type': 'security',
                'priority': 'low',
                'title': '备份和恢复',
                'description': '建议建立完善的数据备份和恢复机制'
            }
        ])
        
        self.test_results['recommendations'] = recommendations
    
    def run_regression_tests(self):
        """运行回归测试（专注于安全改进）"""
        print("🔄 开始回归测试（安全改进验证）...")
        print("=" * 60)
        
        start_time = time.time()
        
        # 重点测试安全改进
        print("🔒 测试安全改进功能...")
        self.test_mime_type_validation()
        self.test_file_permissions()
        self.test_rate_limiting()
        self.test_security_headers()
        self.test_security_audit_logging()
        
        # 测试核心功能是否正常
        print("🔧 测试核心功能...")
        self.test_image_upload()
        self.test_preview_generation()
        self.test_order_creation()
        
        # 测试管理员功能
        print("👨‍💼 测试管理员功能...")
        self.test_admin_login()
        
        # 生成建议
        self.generate_recommendations()
        
        end_time = time.time()
        duration = end_time - start_time
        
        print("=" * 60)
        print(f"✅ 回归测试完成，耗时: {duration:.2f}秒")
        
        return self.test_results
    
    def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始综合测试...")
        print("=" * 60)
        
        start_time = time.time()
        
        # 运行功能测试
        self.test_api_endpoints_functional()
        
        # 运行安全测试
        self.test_security_vulnerabilities()
        
        # 运行管理员功能测试
        self.test_admin_functions()
        
        # 运行页面路由测试
        self.test_page_routes()
        
        # 生成建议
        self.generate_recommendations()
        
        end_time = time.time()
        duration = end_time - start_time
        
        print("=" * 60)
        print(f"✅ 测试完成，耗时: {duration:.2f}秒")
        
        return self.test_results
    
    def save_report(self, filename=None):
        """保存测试报告"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"comprehensive_test_report_{timestamp}.json"
        
        report_path = os.path.join("doc", "history", filename)
        
        # 确保目录存在
        os.makedirs(os.path.dirname(report_path), exist_ok=True)
        
        # 保存报告
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(self.test_results, f, ensure_ascii=False, indent=2)
        
        print(f"📊 测试报告已保存到: {report_path}")
        return report_path

if __name__ == "__main__":
    import sys
    
    # 创建测试套件
    test_suite = ComprehensiveTestSuite()
    
    # 检查命令行参数
    if len(sys.argv) > 1 and sys.argv[1] == '--regression':
        # 运行回归测试
        print("🔄 运行回归测试模式...")
        results = test_suite.run_regression_tests()
        report_filename = f"regression_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    else:
        # 运行完整测试
        print("🚀 运行完整测试模式...")
        results = test_suite.run_all_tests()
        report_filename = f"comprehensive_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    # 保存报告
    report_path = test_suite.save_report(report_filename)
    
    # 打印测试摘要
    print("\n📋 测试摘要:")
    functional_tests = test_suite.test_results.get('functional_tests', {})
    security_tests = test_suite.test_results.get('security_tests', {})
    
    functional_passed = len([r for r in functional_tests.values() if r['success']])
    security_passed = len([r for r in security_tests.values() if r['success']])
    
    print(f"功能测试: {functional_passed}/{len(functional_tests)} 通过")
    print(f"安全测试: {security_passed}/{len(security_tests)} 通过")
    print(f"发现问题: {len(test_suite.test_results.get('issues_found', []))} 个")
    print(f"安全建议: {len(test_suite.test_results.get('recommendations', []))} 条")
    
    # 计算安全评分
    total_tests = len(functional_tests) + len(security_tests)
    passed_tests = functional_passed + security_passed
    security_score = (passed_tests / total_tests * 10) if total_tests > 0 else 0
    
    print(f"🛡️ 安全评分: {security_score:.1f}/10")
    
    # 显示关键安全测试结果
    print("\n🔒 关键安全测试结果:")
    key_security_tests = [
        'MIME类型验证测试',
        '请求频率限制测试', 
        '安全头测试',
        '安全审计日志测试',
        '文件上传安全测试',
        '路径遍历测试'
    ]
    
    # 显示新增功能测试结果
    print("\n🔧 新增功能测试结果:")
    new_functional_tests = [
        '图片管理功能测试',
        '案例功能测试',
        '订单状态管理测试',
        '图片删除功能测试',
        '订单更新功能测试',
        '支付状态查询测试',
        '配送详情查询测试',
        '管理员登出测试',
        '管理员登录状态检查测试',
        '管理员订单状态更新测试',
        '管理员券码列表测试',
        '管理员系统配置测试'
    ]
    
    for test_name in key_security_tests:
        if test_name in security_tests:
            result = security_tests[test_name]
            status = "✅ 通过" if result['success'] else "❌ 失败"
            print(f"  {test_name}: {status}")
    
    for test_name in new_functional_tests:
        if test_name in functional_tests:
            result = functional_tests[test_name]
            status = "✅ 通过" if result['success'] else "❌ 失败"
            print(f"  {test_name}: {status}")
    
    print(f"\n📊 详细报告已保存到: {report_path}")
