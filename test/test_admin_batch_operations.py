#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
后台管理批量操作功能测试
测试批量打印、状态更新等功能
"""

import requests
import json
import time
from datetime import datetime

class AdminBatchOperationsTest:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.admin_password = "admin123!!"  # 默认管理员密码
        
    def login(self):
        """管理员登录"""
        try:
            response = self.session.post(f"{self.base_url}/api/v1/admin/login", 
                                       json={"password": self.admin_password})
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    print("✅ 管理员登录成功")
                    return True
                else:
                    print(f"❌ 管理员登录失败: {data.get('error')}")
                    return False
            else:
                print(f"❌ 登录请求失败: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ 登录异常: {str(e)}")
            return False
    
    def get_orders(self, status=None, payment_status=None):
        """获取订单列表"""
        try:
            params = {"page": 1, "per_page": 10}
            if status:
                params["status"] = status
            if payment_status:
                params["payment_status"] = payment_status
                
            response = self.session.get(f"{self.base_url}/api/v1/admin/orders", params=params)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ 获取订单列表成功，共 {data.get('total', 0)} 个订单")
                return data.get('orders', [])
            else:
                print(f"❌ 获取订单列表失败: {response.status_code}")
                return []
        except Exception as e:
            print(f"❌ 获取订单列表异常: {str(e)}")
            return []
    
    def get_print_jobs(self, status=None):
        """获取打印任务列表"""
        try:
            params = {"page": 1, "per_page": 10}
            if status:
                params["status"] = status
                
            response = self.session.get(f"{self.base_url}/api/v1/admin/print/jobs", params=params)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ 获取打印任务列表成功，共 {data.get('total', 0)} 个任务")
                return data.get('print_jobs', [])
            else:
                print(f"❌ 获取打印任务列表失败: {response.status_code}")
                return []
        except Exception as e:
            print(f"❌ 获取打印任务列表异常: {str(e)}")
            return []
    
    def create_print_job(self, order_id):
        """创建打印任务"""
        try:
            response = self.session.post(f"{self.base_url}/api/v1/admin/orders/{order_id}/print",
                                       json={"order_id": order_id, "quantity": 1})
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    print(f"✅ 为订单 {order_id} 创建打印任务成功")
                    return data.get('print_job')
                else:
                    print(f"❌ 创建打印任务失败: {data.get('error')}")
                    return None
            else:
                print(f"❌ 创建打印任务请求失败: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ 创建打印任务异常: {str(e)}")
            return None
    
    def update_print_job_status(self, job_id, status):
        """更新打印任务状态"""
        try:
            response = self.session.put(f"{self.base_url}/api/v1/admin/print/jobs/{job_id}/status",
                                      json={"status": status})
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    print(f"✅ 更新打印任务 {job_id} 状态为 {status} 成功")
                    return True
                else:
                    print(f"❌ 更新打印任务状态失败: {data.get('error')}")
                    return False
            else:
                print(f"❌ 更新打印任务状态请求失败: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ 更新打印任务状态异常: {str(e)}")
            return False
    
    def batch_update_print_jobs(self, job_ids, status):
        """批量更新打印任务状态"""
        try:
            success_count = 0
            for job_id in job_ids:
                if self.update_print_job_status(job_id, status):
                    success_count += 1
                time.sleep(0.1)  # 避免请求过快
            
            print(f"✅ 批量更新完成: {success_count}/{len(job_ids)} 个任务成功")
            return success_count
        except Exception as e:
            print(f"❌ 批量更新异常: {str(e)}")
            return 0
    
    def test_batch_print_operations(self):
        """测试批量打印操作"""
        print("\n🧪 开始测试批量打印操作...")
        
        # 1. 获取待打印的订单
        orders = self.get_orders(status="processing", payment_status="paid")
        if not orders:
            print("⚠️ 没有找到可打印的订单，跳过批量打印测试")
            return
        
        print(f"📋 找到 {len(orders)} 个可打印的订单")
        
        # 2. 为前3个订单创建打印任务
        test_orders = orders[:3]
        created_jobs = []
        
        for order in test_orders:
            print_job = self.create_print_job(order['id'])
            if print_job:
                created_jobs.append(print_job)
        
        if not created_jobs:
            print("❌ 没有成功创建打印任务，无法继续测试")
            return
        
        print(f"📝 成功创建 {len(created_jobs)} 个打印任务")
        
        # 3. 等待一下让任务创建完成
        time.sleep(1)
        
        # 4. 获取待打印的任务
        pending_jobs = self.get_print_jobs(status="pending")
        if not pending_jobs:
            print("⚠️ 没有找到待打印的任务")
            return
        
        # 5. 测试批量开始打印
        job_ids = [job['id'] for job in pending_jobs[:3]]  # 取前3个任务
        print(f"🔄 开始批量打印 {len(job_ids)} 个任务...")
        
        success_count = self.batch_update_print_jobs(job_ids, "printing")
        
        if success_count > 0:
            print("✅ 批量打印操作测试通过")
            
            # 6. 测试批量取消
            time.sleep(1)
            printing_jobs = self.get_print_jobs(status="printing")
            if printing_jobs:
                cancel_job_ids = [job['id'] for job in printing_jobs[:2]]  # 取前2个任务
                print(f"🛑 开始批量取消 {len(cancel_job_ids)} 个任务...")
                
                cancel_count = self.batch_update_print_jobs(cancel_job_ids, "cancelled")
                if cancel_count > 0:
                    print("✅ 批量取消操作测试通过")
                else:
                    print("❌ 批量取消操作测试失败")
        else:
            print("❌ 批量打印操作测试失败")
    
    def test_order_status_updates(self):
        """测试订单状态更新"""
        print("\n🧪 开始测试订单状态更新...")
        
        # 获取一些订单进行测试
        orders = self.get_orders()
        if not orders:
            print("⚠️ 没有找到订单，跳过状态更新测试")
            return
        
        test_order = orders[0]
        order_id = test_order['id']
        original_status = test_order['status']
        
        print(f"📋 测试订单 {order_id}，当前状态: {original_status}")
        
        # 测试状态更新
        try:
            response = self.session.put(f"{self.base_url}/api/v1/admin/orders/{order_id}/status",
                                      json={"status": "processing"})
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    print("✅ 订单状态更新成功")
                    
                    # 验证状态是否真的更新了
                    time.sleep(0.5)
                    updated_orders = self.get_orders()
                    updated_order = next((o for o in updated_orders if o['id'] == order_id), None)
                    if updated_order and updated_order['status'] == 'processing':
                        print("✅ 订单状态更新验证通过")
                    else:
                        print("❌ 订单状态更新验证失败")
                else:
                    print(f"❌ 订单状态更新失败: {data.get('error')}")
            else:
                print(f"❌ 订单状态更新请求失败: {response.status_code}")
        except Exception as e:
            print(f"❌ 订单状态更新异常: {str(e)}")
    
    def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始后台管理批量操作功能测试")
        print("=" * 50)
        
        # 登录
        if not self.login():
            print("❌ 无法登录，测试终止")
            return
        
        # 运行测试
        self.test_order_status_updates()
        self.test_batch_print_operations()
        
        print("\n" + "=" * 50)
        print("🏁 测试完成")

if __name__ == "__main__":
    # 创建测试实例
    tester = AdminBatchOperationsTest()
    
    # 运行测试
    tester.run_all_tests()
