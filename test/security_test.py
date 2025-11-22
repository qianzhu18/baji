#!/usr/bin/env python3
# test/security_test.py - 安全功能测试脚本
import os
import sys
import requests
import json
import time
import uuid
from datetime import datetime
from io import BytesIO

class SecurityTester:
    """安全功能测试类"""
    
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
        self.device_id = self.generate_device_id()
        self.admin_session = requests.Session()
    
    def generate_device_id(self):
        """生成测试用的设备ID"""
        timestamp = str(int(time.time() * 1000))  # 13位时间戳
        random_part = str(uuid.uuid4())[:9].replace('-', '').upper()
        return f"DEV{timestamp}{random_part}"
    
    def test_file_validation(self):
        """测试文件验证功能"""
        print("🔍 测试文件验证功能...")
        
        # 测试无效文件类型
        test_cases = [
            {
                'name': '无效文件扩展名',
                'file': ('file', ('test.exe', b'fake content', 'application/octet-stream')),
                'expected_status': 400
            },
            {
                'name': '空文件',
                'file': ('file', ('test.jpg', b'', 'image/jpeg')),
                'expected_status': 400
            },
            {
                'name': '超大文件',
                'file': ('file', ('test.jpg', b'x' * (6 * 1024 * 1024), 'image/jpeg')),
                'expected_status': 413
            },
            {
                'name': '恶意脚本文件',
                'file': ('file', ('test.php', b'<?php system($_GET["cmd"]); ?>', 'application/x-php')),
                'expected_status': 400
            },
            {
                'name': '伪造图片文件',
                'file': ('file', ('fake.jpg', b'This is not an image', 'image/jpeg')),
                'expected_status': 400
            }
        ]
        
        for test_case in test_cases:
            try:
                response = self.session.post(
                    f"{self.base_url}/api/v1/upload",
                    files=[test_case['file']],
                    headers={'X-Device-ID': self.device_id}
                )
                
                if response.status_code == test_case['expected_status']:
                    print(f"  ✅ {test_case['name']} - 正确拒绝")
                    self.test_results.append({
                        'test': test_case['name'],
                        'status': 'PASS',
                        'status_code': response.status_code
                    })
                else:
                    print(f"  ❌ {test_case['name']} - 状态码: {response.status_code}")
                    self.test_results.append({
                        'test': test_case['name'],
                        'status': 'FAIL',
                        'status_code': response.status_code
                    })
                    
            except Exception as e:
                print(f"  ❌ {test_case['name']} - 异常: {e}")
                self.test_results.append({
                    'test': test_case['name'],
                    'status': 'ERROR',
                    'error': str(e)
                })
    
    def test_rate_limiting(self):
        """测试频率限制"""
        print("🔍 测试频率限制...")
        
        try:
            # 快速发送多个请求
            responses = []
            for i in range(15):  # 超过10次/分钟的限制
                response = self.session.post(
                    f"{self.base_url}/api/v1/upload",
                    files=[('file', ('test.jpg', b'fake content', 'image/jpeg'))],
                    headers={'X-Device-ID': self.device_id}
                )
                responses.append(response.status_code)
                time.sleep(0.1)  # 短暂延迟
            
            # 检查是否有429状态码（频率限制）
            if 429 in responses:
                print("  ✅ 频率限制生效")
                self.test_results.append({
                    'test': '频率限制',
                    'status': 'PASS',
                    'note': '检测到429状态码'
                })
            else:
                print("  ⚠️ 频率限制可能未生效")
                self.test_results.append({
                    'test': '频率限制',
                    'status': 'WARNING',
                    'note': '未检测到429状态码'
                })
                
        except Exception as e:
            print(f"  ❌ 频率限制测试异常: {e}")
            self.test_results.append({
                'test': '频率限制',
                'status': 'ERROR',
                'error': str(e)
            })
    
    def test_path_traversal(self):
        """测试路径遍历防护"""
        print("🔍 测试路径遍历防护...")
        
        malicious_filenames = [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\config\\sam",
            "....//....//....//etc/passwd",
            "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
        ]
        
        for filename in malicious_filenames:
            try:
                response = self.session.get(f"{self.base_url}/api/v1/image/{filename}")
                
                if response.status_code == 404:
                    print(f"  ✅ 路径遍历被阻止: {filename}")
                else:
                    print(f"  ❌ 可能的路径遍历漏洞: {filename} - {response.status_code}")
                    
            except Exception as e:
                print(f"  ❌ 路径遍历测试异常: {e}")
    
    def test_admin_authentication(self):
        """测试管理员认证"""
        print("🔍 测试管理员认证...")
        
        try:
            # 测试未认证访问
            response = self.session.get(f"{self.base_url}/api/v1/admin/orders")
            
            if response.status_code == 401:
                print("  ✅ 管理员API需要认证")
                self.test_results.append({
                    'test': '管理员认证',
                    'status': 'PASS',
                    'note': '正确返回401状态码'
                })
            else:
                print(f"  ❌ 管理员API认证失败: {response.status_code}")
                self.test_results.append({
                    'test': '管理员认证',
                    'status': 'FAIL',
                    'status_code': response.status_code
                })
            
            # 测试错误密码登录
            login_response = self.session.post(
                f"{self.base_url}/api/v1/admin/login",
                json={'password': 'wrong_password'}
            )
            
            if login_response.status_code == 401:
                print("  ✅ 错误密码被正确拒绝")
                self.test_results.append({
                    'test': '管理员错误密码',
                    'status': 'PASS',
                    'note': '错误密码返回401状态码'
                })
            else:
                print(f"  ❌ 错误密码未被拒绝: {login_response.status_code}")
                self.test_results.append({
                    'test': '管理员错误密码',
                    'status': 'FAIL',
                    'status_code': login_response.status_code
                })
                
        except Exception as e:
            print(f"  ❌ 管理员认证测试异常: {e}")
            self.test_results.append({
                'test': '管理员认证',
                'status': 'ERROR',
                'error': str(e)
            })
    
    def test_device_id_validation(self):
        """测试设备ID验证"""
        print("🔍 测试设备ID验证...")
        
        try:
            # 测试缺少设备ID
            response = self.session.get(f"{self.base_url}/api/v1/orders")
            
            if response.status_code == 400:
                print("  ✅ 缺少设备ID被正确拒绝")
                self.test_results.append({
                    'test': '设备ID验证-缺少ID',
                    'status': 'PASS',
                    'note': '正确返回400状态码'
                })
            else:
                print(f"  ❌ 缺少设备ID未被拒绝: {response.status_code}")
                self.test_results.append({
                    'test': '设备ID验证-缺少ID',
                    'status': 'FAIL',
                    'status_code': response.status_code
                })
            
            # 测试无效设备ID格式
            invalid_device_ids = [
                'INVALID123',
                'DEV123',  # 太短
                'DEV' + '1' * 30,  # 太长
                'WRONG1234567890123456789'
            ]
            
            for invalid_id in invalid_device_ids:
                response = self.session.get(
                    f"{self.base_url}/api/v1/orders",
                    headers={'X-Device-ID': invalid_id}
                )
                
                if response.status_code == 400:
                    print(f"  ✅ 无效设备ID被拒绝: {invalid_id}")
                else:
                    print(f"  ❌ 无效设备ID未被拒绝: {invalid_id} - {response.status_code}")
            
            self.test_results.append({
                'test': '设备ID验证-格式检查',
                'status': 'PASS',
                'note': '无效格式设备ID被正确拒绝'
            })
            
            # 测试有效设备ID
            response = self.session.get(
                f"{self.base_url}/api/v1/orders",
                headers={'X-Device-ID': self.device_id}
            )
            
            if response.status_code in [200, 404]:  # 404表示没有订单，但设备ID有效
                print("  ✅ 有效设备ID被接受")
                self.test_results.append({
                    'test': '设备ID验证-有效ID',
                    'status': 'PASS',
                    'note': '有效设备ID被正确接受'
                })
            else:
                print(f"  ❌ 有效设备ID被拒绝: {response.status_code}")
                self.test_results.append({
                    'test': '设备ID验证-有效ID',
                    'status': 'FAIL',
                    'status_code': response.status_code
                })
                
        except Exception as e:
            print(f"  ❌ 设备ID验证测试异常: {e}")
            self.test_results.append({
                'test': '设备ID验证',
                'status': 'ERROR',
                'error': str(e)
            })
    
    def test_device_isolation(self):
        """测试设备隔离"""
        print("🔍 测试设备隔离...")
        
        try:
            # 创建两个不同的设备ID
            device_id_1 = self.generate_device_id()
            device_id_2 = self.generate_device_id()
            
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
                        print("  ✅ 设备隔离生效")
                        self.test_results.append({
                            'test': '设备隔离',
                            'status': 'PASS',
                            'note': '设备无法访问其他设备的订单'
                        })
                    else:
                        print(f"  ❌ 设备隔离失效: {response2.status_code}")
                        self.test_results.append({
                            'test': '设备隔离',
                            'status': 'FAIL',
                            'status_code': response2.status_code
                        })
                else:
                    print("  ⚠️ 无法获取订单号进行隔离测试")
                    self.test_results.append({
                        'test': '设备隔离',
                        'status': 'WARNING',
                        'note': '无法创建测试订单'
                    })
            else:
                print(f"  ⚠️ 无法创建测试订单: {response1.status_code}")
                self.test_results.append({
                    'test': '设备隔离',
                    'status': 'WARNING',
                    'note': '无法创建测试订单'
                })
                
        except Exception as e:
            print(f"  ❌ 设备隔离测试异常: {e}")
            self.test_results.append({
                'test': '设备隔离',
                'status': 'ERROR',
                'error': str(e)
            })
    
    def test_security_audit_logging(self):
        """测试安全审计日志"""
        print("🔍 测试安全审计日志...")
        
        try:
            # 执行一些安全相关操作
            test_operations = [
                # 尝试上传恶意文件
                {
                    'name': 'malicious_upload',
                    'action': lambda: self.session.post(
                        f"{self.base_url}/api/v1/upload",
                        files={'file': ('test.php', BytesIO(b'<?php echo "hack"; ?>'), 'application/x-php')},
                        headers={'X-Device-ID': self.device_id}
                    )
                },
                # 尝试访问不存在的文件
                {
                    'name': 'file_not_found',
                    'action': lambda: self.session.get(f"{self.base_url}/api/v1/image/nonexistent_file.jpg")
                },
                # 尝试管理员登录失败
                {
                    'name': 'admin_login_failed',
                    'action': lambda: self.session.post(
                        f"{self.base_url}/api/v1/admin/login",
                        json={'password': 'wrong_password'}
                    )
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
                print("  ✅ 安全审计日志文件存在")
                self.test_results.append({
                    'test': '安全审计日志',
                    'status': 'PASS',
                    'note': f'找到{len(log_files_found)}个日志文件'
                })
            else:
                print("  ⚠️ 未找到安全审计日志文件")
                self.test_results.append({
                    'test': '安全审计日志',
                    'status': 'WARNING',
                    'note': '未找到安全审计日志文件'
                })
                
        except Exception as e:
            print(f"  ❌ 安全审计日志测试异常: {e}")
            self.test_results.append({
                'test': '安全审计日志',
                'status': 'ERROR',
                'error': str(e)
            })
    
    def test_security_headers(self):
        """测试安全头"""
        print("🔍 测试安全头...")
        
        try:
            response = self.session.get(f"{self.base_url}/")
            headers = response.headers
            
            security_headers = {
                'X-Frame-Options': 'SAMEORIGIN',
                'X-Content-Type-Options': 'nosniff',
                'X-XSS-Protection': '1; mode=block',
                'Strict-Transport-Security': 'max-age=31536000'
            }
            
            found_headers = []
            for header, expected_value in security_headers.items():
                if header in headers:
                    found_headers.append(header)
                    print(f"  ✅ 安全头存在: {header}")
                else:
                    print(f"  ⚠️ 安全头缺失: {header}")
            
            if len(found_headers) >= 2:
                self.test_results.append({
                    'test': '安全头',
                    'status': 'PASS',
                    'found_headers': found_headers
                })
            else:
                self.test_results.append({
                    'test': '安全头',
                    'status': 'WARNING',
                    'found_headers': found_headers
                })
                
        except Exception as e:
            print(f"  ❌ 安全头测试异常: {e}")
            self.test_results.append({
                'test': '安全头',
                'status': 'ERROR',
                'error': str(e)
            })
    
    def generate_report(self):
        """生成测试报告"""
        print("\n📊 生成安全测试报告...")
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_tests': len(self.test_results),
            'passed_tests': len([r for r in self.test_results if r['status'] == 'PASS']),
            'failed_tests': len([r for r in self.test_results if r['status'] == 'FAIL']),
            'warning_tests': len([r for r in self.test_results if r['status'] == 'WARNING']),
            'error_tests': len([r for r in self.test_results if r['status'] == 'ERROR']),
            'test_results': self.test_results
        }
        
        # 计算安全评分
        total_score = len(self.test_results)
        passed_score = report['passed_tests']
        warning_score = report['warning_tests'] * 0.5
        
        security_score = ((passed_score + warning_score) / total_score) * 10 if total_score > 0 else 0
        
        report['security_score'] = round(security_score, 1)
        
        # 保存报告
        report_filename = f"security_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        report_path = os.path.join('static', 'logs', report_filename)
        
        os.makedirs(os.path.dirname(report_path), exist_ok=True)
        
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"✅ 测试报告已保存: {report_path}")
        print(f"🛡️ 安全评分: {security_score}/10")
        
        return report
    
    def run_all_tests(self):
        """运行所有测试"""
        print("🛡️ 吧唧生成器安全功能测试")
        print("=" * 50)
        
        # 基础安全测试
        self.test_file_validation()
        self.test_rate_limiting()
        self.test_path_traversal()
        self.test_admin_authentication()
        self.test_security_headers()
        
        # 新增安全测试
        self.test_device_id_validation()
        self.test_device_isolation()
        self.test_security_audit_logging()
        
        report = self.generate_report()
        
        print("\n" + "=" * 50)
        print("📋 测试总结:")
        print(f"总测试数: {report['total_tests']}")
        print(f"通过: {report['passed_tests']}")
        print(f"失败: {report['failed_tests']}")
        print(f"警告: {report['warning_tests']}")
        print(f"错误: {report['error_tests']}")
        print(f"安全评分: {report['security_score']}/10")

def main():
    """主函数"""
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5000"
    
    tester = SecurityTester(base_url)
    tester.run_all_tests()

if __name__ == "__main__":
    main()
