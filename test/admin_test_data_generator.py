#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
后台管理页面操作按钮功能测试数据集
包含订单、券码、案例、配送等管理功能的测试数据
"""

import os
import sys
import json
import base64
from datetime import datetime, timedelta
from decimal import Decimal
from PIL import Image
import io

class AdminTestDataSet:
    """后台管理测试数据集类"""
    
    def __init__(self):
        self.test_orders = []
        self.test_coupons = []
        self.test_cases = []
        self.test_deliveries = []
        self.test_admin_users = []
        self.test_scenarios = []
        
    def create_test_orders(self):
        """创建测试订单数据"""
        print("创建测试订单数据...")
        
        # 不同状态的订单
        order_configs = [
            {
                'order_no': 'BJI20250111001',
                'status': 'pending',
                'payment_status': 'unpaid',
                'total_price': 100.00,
                'quantity': 1,
                'description': '待处理订单'
            },
            {
                'order_no': 'BJI20250111002',
                'status': 'processing',
                'payment_status': 'paid',
                'total_price': 150.00,
                'quantity': 2,
                'description': '处理中订单'
            },
            {
                'order_no': 'BJI20250111003',
                'status': 'completed',
                'payment_status': 'paid',
                'total_price': 200.00,
                'quantity': 3,
                'description': '已完成订单'
            },
            {
                'order_no': 'BJI20250111004',
                'status': 'cancelled',
                'payment_status': 'unpaid',
                'total_price': 80.00,
                'quantity': 1,
                'description': '已取消订单'
            },
            {
                'order_no': 'BJI20250111005',
                'status': 'processing',
                'payment_status': 'paid',
                'total_price': 120.00,
                'quantity': 2,
                'description': '另一个处理中订单'
            }
        ]
        
        for config in order_configs:
            self.test_orders.append({
                'order_no': config['order_no'],
                'unit_price': config['total_price'] / config['quantity'],
                'total_price': config['total_price'],
                'quantity': config['quantity'],
                'status': config['status'],
                'payment_status': config['payment_status'],
                'payment_method': 'coupon' if config['payment_status'] == 'paid' else None,
                'payment_time': datetime.now().isoformat() if config['payment_status'] == 'paid' else None,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'description': config['description']
            })
        
        print(f"✓ 创建了 {len(self.test_orders)} 个测试订单")
    
    def create_test_coupons(self):
        """创建测试券码数据"""
        print("创建测试券码数据...")
        
        # 不同类型的券码
        coupon_configs = [
            {
                'code': 'ADMIN001',
                'discount_type': 'fixed',
                'discount_value': 20.00,
                'min_order_amount': 100.00,
                'valid_days': 30,
                'usage_limit': 5,
                'used_count': 2,
                'is_active': True,
                'description': '固定金额券码 - 20元折扣'
            },
            {
                'code': 'ADMIN002',
                'discount_type': 'percentage',
                'discount_value': 15.00,  # 15%折扣
                'min_order_amount': 200.00,
                'valid_days': 15,
                'usage_limit': 3,
                'used_count': 1,
                'is_active': True,
                'description': '百分比券码 - 15%折扣'
            },
            {
                'code': 'ADMIN003',
                'discount_type': 'fixed',
                'discount_value': 10.00,
                'min_order_amount': 50.00,
                'valid_days': 7,
                'usage_limit': 10,
                'used_count': 0,
                'is_active': True,
                'description': '小额券码 - 10元折扣'
            },
            {
                'code': 'ADMIN004',
                'discount_type': 'fixed',
                'discount_value': 50.00,
                'min_order_amount': 0.00,
                'valid_days': -1,  # 已过期
                'usage_limit': 1,
                'used_count': 0,
                'is_active': True,
                'description': '过期券码'
            },
            {
                'code': 'ADMIN005',
                'discount_type': 'fixed',
                'discount_value': 30.00,
                'min_order_amount': 0.00,
                'valid_days': 30,
                'usage_limit': 1,
                'used_count': 1,  # 已用完
                'is_active': True,
                'description': '已使用券码'
            },
            {
                'code': 'ADMIN006',
                'discount_type': 'fixed',
                'discount_value': 25.00,
                'min_order_amount': 0.00,
                'valid_days': 30,
                'usage_limit': 1,
                'used_count': 0,
                'is_active': False,  # 已禁用
                'description': '禁用券码'
            }
        ]
        
        for config in coupon_configs:
            # 计算有效期
            if config['valid_days'] > 0:
                valid_until = datetime.now() + timedelta(days=config['valid_days'])
            else:
                valid_until = datetime.now() - timedelta(days=1)
            
            self.test_coupons.append({
                'code': config['code'],
                'discount_type': config['discount_type'],
                'discount_value': config['discount_value'],
                'min_order_amount': config['min_order_amount'],
                'usage_limit': config['usage_limit'],
                'used_count': config['used_count'],
                'is_active': config['is_active'],
                'valid_until': valid_until.isoformat(),
                'created_at': datetime.now().isoformat(),
                'description': config['description']
            })
        
        print(f"✓ 创建了 {len(self.test_coupons)} 个测试券码")
    
    def create_test_cases(self):
        """创建测试案例数据"""
        print("创建测试案例数据...")
        
        # 不同类型的案例
        case_configs = [
            {
                'title': '精美动漫角色吧唧',
                'description': '高质量动漫角色设计，适合收藏',
                'category': 'anime',
                'tags': '动漫,角色,收藏',
                'case_type': 'featured',
                'is_featured': True,
                'is_public': True,
                'description': '推荐案例'
            },
            {
                'title': '简约几何图案吧唧',
                'description': '现代简约风格，适合日常佩戴',
                'category': 'geometric',
                'tags': '几何,简约,现代',
                'case_type': 'public',
                'is_featured': False,
                'is_public': True,
                'description': '公开案例'
            },
            {
                'title': '节日主题吧唧',
                'description': '节日限定设计，充满节日氛围',
                'category': 'holiday',
                'tags': '节日,限定,氛围',
                'case_type': 'private',
                'is_featured': False,
                'is_public': False,
                'description': '私有案例'
            },
            {
                'title': '动物主题吧唧',
                'description': '可爱动物设计，萌系风格',
                'category': 'animal',
                'tags': '动物,可爱,萌系',
                'case_type': 'featured',
                'is_featured': True,
                'is_public': True,
                'description': '推荐动物案例'
            },
            {
                'title': '文字设计吧唧',
                'description': '创意文字设计，个性化定制',
                'category': 'text',
                'tags': '文字,创意,个性',
                'case_type': 'public',
                'is_featured': False,
                'is_public': True,
                'description': '文字设计案例'
            }
        ]
        
        for config in case_configs:
            self.test_cases.append({
                'title': config['title'],
                'description': config['description'],
                'category': config['category'],
                'tags': config['tags'],
                'case_type': config['case_type'],
                'is_featured': config['is_featured'],
                'is_public': config['is_public'],
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'description': config['description']
            })
        
        print(f"✓ 创建了 {len(self.test_cases)} 个测试案例")
    
    def create_test_deliveries(self):
        """创建测试配送数据"""
        print("创建测试配送数据...")
        
        # 不同状态的配送
        delivery_configs = [
            {
                'delivery_no': 'DEL20250111001',
                'order_ids': [1, 2],
                'recipient_name': '张三',
                'phone': '13800138001',
                'address': '北京市朝阳区xxx街道xxx号',
                'status': 'pending',
                'description': '待发货配送'
            },
            {
                'delivery_no': 'DEL20250111002',
                'order_ids': [3],
                'recipient_name': '李四',
                'phone': '13800138002',
                'address': '上海市浦东新区xxx路xxx号',
                'status': 'shipped',
                'tracking_number': 'SF1234567890',
                'description': '已发货配送'
            },
            {
                'delivery_no': 'DEL20250111003',
                'order_ids': [4, 5],
                'recipient_name': '王五',
                'phone': '13800138003',
                'address': '广州市天河区xxx大道xxx号',
                'status': 'delivered',
                'tracking_number': 'YT0987654321',
                'description': '已送达配送'
            }
        ]
        
        for config in delivery_configs:
            self.test_deliveries.append({
                'delivery_no': config['delivery_no'],
                'order_ids': json.dumps(config['order_ids']),
                'recipient_name': config['recipient_name'],
                'phone': config['phone'],
                'address': config['address'],
                'status': config['status'],
                'tracking_number': config.get('tracking_number'),
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'description': config['description']
            })
        
        print(f"✓ 创建了 {len(self.test_deliveries)} 个测试配送")
    
    def create_test_admin_users(self):
        """创建测试管理员数据"""
        print("创建测试管理员数据...")
        
        # 管理员配置
        admin_configs = [
            {
                'username': 'admin',
                'password': 'admin123',
                'role': 'super_admin',
                'description': '超级管理员'
            },
            {
                'username': 'manager',
                'password': 'manager123',
                'role': 'manager',
                'description': '普通管理员'
            }
        ]
        
        for config in admin_configs:
            self.test_admin_users.append({
                'username': config['username'],
                'password': config['password'],
                'role': config['role'],
                'created_at': datetime.now().isoformat(),
                'last_login': None,
                'description': config['description']
            })
        
        print(f"✓ 创建了 {len(self.test_admin_users)} 个测试管理员")
    
    def create_test_scenarios(self):
        """创建测试场景数据"""
        print("创建测试场景数据...")
        
        # 管理功能测试场景
        self.test_scenarios = [
            {
                'name': '管理员登录测试',
                'description': '测试管理员登录和权限验证',
                'steps': [
                    {
                        'step': 1,
                        'action': 'admin_login',
                        'data': {
                            'password': 'admin123'
                        }
                    },
                    {
                        'step': 2,
                        'action': 'check_login_status',
                        'data': {}
                    }
                ]
            },
            {
                'name': '订单管理功能测试',
                'description': '测试订单的查看、编辑、删除、批量操作',
                'steps': [
                    {
                        'step': 1,
                        'action': 'get_orders',
                        'data': {
                            'page': 1,
                            'per_page': 20
                        }
                    },
                    {
                        'step': 2,
                        'action': 'update_order_status',
                        'data': {
                            'order_id': 1,
                            'status': 'processing'
                        }
                    },
                    {
                        'step': 3,
                        'action': 'edit_order',
                        'data': {
                            'order_id': 1,
                            'notes': '测试备注'
                        }
                    },
                    {
                        'step': 4,
                        'action': 'batch_orders',
                        'data': {
                            'action': 'delete',
                            'order_ids': [1, 2]
                        }
                    }
                ]
            },
            {
                'name': '券码管理功能测试',
                'description': '测试券码的生成、查看、编辑、删除',
                'steps': [
                    {
                        'step': 1,
                        'action': 'generate_coupons',
                        'data': {
                            'quantity': 5,
                            'discount_type': 'fixed',
                            'discount_value': 15.00,
                            'min_order_amount': 100.00,
                            'valid_days': 30,
                            'usage_limit': 1
                        }
                    },
                    {
                        'step': 2,
                        'action': 'get_coupons',
                        'data': {
                            'page': 1,
                            'per_page': 20
                        }
                    },
                    {
                        'step': 3,
                        'action': 'update_coupon',
                        'data': {
                            'coupon_id': 1,
                            'is_active': False
                        }
                    },
                    {
                        'step': 4,
                        'action': 'delete_coupon',
                        'data': {
                            'coupon_id': 1
                        }
                    }
                ]
            },
            {
                'name': '案例管理功能测试',
                'description': '测试案例的查看、创建、编辑、删除、批量操作',
                'steps': [
                    {
                        'step': 1,
                        'action': 'get_cases',
                        'data': {
                            'page': 1,
                            'per_page': 20
                        }
                    },
                    {
                        'step': 2,
                        'action': 'create_case',
                        'data': {
                            'title': '测试案例',
                            'description': '这是一个测试案例',
                            'category': 'test',
                            'tags': '测试,案例'
                        }
                    },
                    {
                        'step': 3,
                        'action': 'update_case',
                        'data': {
                            'case_id': 1,
                            'title': '更新后的测试案例',
                            'is_featured': True
                        }
                    },
                    {
                        'step': 4,
                        'action': 'batch_cases',
                        'data': {
                            'action': 'feature',
                            'case_ids': [1, 2]
                        }
                    }
                ]
            },
            {
                'name': '打印管理功能测试',
                'description': '测试PDF导出和文件下载功能',
                'steps': [
                    {
                        'step': 1,
                        'action': 'export_pdf',
                        'data': {
                            'order_ids': [1, 2, 3],
                            'format': 'a4_6',
                            'size': '68x68'
                        }
                    },
                    {
                        'step': 2,
                        'action': 'download_file',
                        'data': {
                            'filename': 'export_20250111.pdf'
                        }
                    }
                ]
            },
            {
                'name': '配送管理功能测试',
                'description': '测试配送的查看、状态更新',
                'steps': [
                    {
                        'step': 1,
                        'action': 'get_deliveries',
                        'data': {
                            'page': 1,
                            'per_page': 20
                        }
                    },
                    {
                        'step': 2,
                        'action': 'update_delivery_status',
                        'data': {
                            'delivery_id': 1,
                            'status': 'shipped',
                            'tracking_number': 'SF1234567890'
                        }
                    }
                ]
            },
            {
                'name': '系统管理功能测试',
                'description': '测试仪表盘数据和系统配置',
                'steps': [
                    {
                        'step': 1,
                        'action': 'get_dashboard_stats',
                        'data': {}
                    },
                    {
                        'step': 2,
                        'action': 'get_config',
                        'data': {}
                    },
                    {
                        'step': 3,
                        'action': 'update_config',
                        'data': {
                            'site_name': '测试站点',
                            'default_price': 15.00
                        }
                    }
                ]
            }
        ]
        
        print(f"✓ 创建了 {len(self.test_scenarios)} 个测试场景")
    
    def create_edge_cases(self):
        """创建边界情况测试数据"""
        print("创建边界情况测试数据...")
        
        edge_cases = [
            {
                'name': '无效密码登录测试',
                'data': {
                    'password': 'wrong_password'
                },
                'expected_error': '密码错误'
            },
            {
                'name': '未登录访问API测试',
                'data': {
                    'api': '/api/v1/admin/orders'
                },
                'expected_error': '需要登录'
            },
            {
                'name': '无效订单ID测试',
                'data': {
                    'order_id': 99999
                },
                'expected_error': '订单不存在'
            },
            {
                'name': '无效券码ID测试',
                'data': {
                    'coupon_id': 99999
                },
                'expected_error': '券码不存在'
            },
            {
                'name': '无效案例ID测试',
                'data': {
                    'case_id': 99999
                },
                'expected_error': '案例不存在'
            },
            {
                'name': '批量操作空列表测试',
                'data': {
                    'action': 'delete',
                    'order_ids': []
                },
                'expected_error': '请选择要操作的订单'
            },
            {
                'name': '分页参数错误测试',
                'data': {
                    'page': -1,
                    'per_page': 0
                },
                'expected_error': '分页参数错误'
            }
        ]
        
        self.test_scenarios.extend(edge_cases)
        print(f"✓ 创建了 {len(edge_cases)} 个边界情况测试")
    
    def generate_test_data_summary(self):
        """生成测试数据摘要"""
        summary = {
            'test_orders': len(self.test_orders),
            'test_coupons': len(self.test_coupons),
            'test_cases': len(self.test_cases),
            'test_deliveries': len(self.test_deliveries),
            'test_admin_users': len(self.test_admin_users),
            'test_scenarios': len(self.test_scenarios),
            'created_at': datetime.now().isoformat(),
            'orders': [
                {
                    'order_no': order['order_no'],
                    'status': order['status'],
                    'payment_status': order['payment_status'],
                    'description': order['description']
                } for order in self.test_orders
            ],
            'coupons': [
                {
                    'code': coupon['code'],
                    'type': coupon['discount_type'],
                    'value': coupon['discount_value'],
                    'description': coupon['description']
                } for coupon in self.test_coupons
            ],
            'cases': [
                {
                    'title': case['title'],
                    'category': case['category'],
                    'is_featured': case['is_featured'],
                    'description': case['description']
                } for case in self.test_cases
            ],
            'deliveries': [
                {
                    'delivery_no': delivery['delivery_no'],
                    'status': delivery['status'],
                    'description': delivery['description']
                } for delivery in self.test_deliveries
            ],
            'scenarios': [
                {
                    'name': scenario['name'],
                    'description': scenario.get('description', ''),
                    'steps_count': len(scenario.get('steps', []))
                } for scenario in self.test_scenarios
            ]
        }
        
        return summary
    
    def save_test_data(self, filename='admin_test_data.json'):
        """保存测试数据到文件"""
        print(f"保存测试数据到 {filename}...")
        
        # 准备可序列化的数据
        serializable_data = {
            'test_orders': self.test_orders,
            'test_coupons': self.test_coupons,
            'test_cases': self.test_cases,
            'test_deliveries': self.test_deliveries,
            'test_admin_users': self.test_admin_users,
            'test_scenarios': self.test_scenarios,
            'summary': self.generate_test_data_summary()
        }
        
        # 保存到文件
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(serializable_data, f, ensure_ascii=False, indent=2)
        
        print(f"✓ 测试数据已保存到 {filename}")
    
    def run_all(self):
        """运行所有数据创建流程"""
        print("="*60)
        print("创建后台管理测试数据集")
        print("="*60)
        
        try:
            self.create_test_orders()
            self.create_test_coupons()
            self.create_test_cases()
            self.create_test_deliveries()
            self.create_test_admin_users()
            self.create_test_scenarios()
            self.create_edge_cases()
            
            summary = self.generate_test_data_summary()
            print("\n" + "="*60)
            print("测试数据摘要")
            print("="*60)
            print(f"测试订单: {summary['test_orders']} 个")
            print(f"测试券码: {summary['test_coupons']} 个")
            print(f"测试案例: {summary['test_cases']} 个")
            print(f"测试配送: {summary['test_deliveries']} 个")
            print(f"测试管理员: {summary['test_admin_users']} 个")
            print(f"测试场景: {summary['test_scenarios']} 个")
            
            self.save_test_data()
            
            print("\n" + "="*60)
            print("✓ 测试数据集创建完成")
            print("="*60)
            
            return True
            
        except Exception as e:
            print(f"\n❌ 创建测试数据失败: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == '__main__':
    test_data = AdminTestDataSet()
    success = test_data.run_all()
    
    if success:
        print("\n🎉 后台管理测试数据集创建成功！")
        exit(0)
    else:
        print("\n💥 后台管理测试数据集创建失败！")
        exit(1)
