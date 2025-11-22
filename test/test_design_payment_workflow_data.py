#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
设计页面创建吧唧后使用券码支付的完整流程测试数据集
"""

import os
import sys
import json
import base64
from datetime import datetime, timedelta
from decimal import Decimal
from PIL import Image
import io

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.app_factory import create_app
from utils.models import Order, Coupon, db

class TestDataSet:
    """测试数据集类"""
    
    def __init__(self):
        self.app = create_app('testing')
        self.test_images = []
        self.test_coupons = []
        self.test_orders = []
        self.test_scenarios = []
        
    def create_test_images(self):
        """创建测试图片数据"""
        print("创建测试图片数据...")
        
        # 创建不同尺寸的测试图片
        test_images = [
            {
                'name': 'test_image_square.png',
                'size': (400, 400),
                'color': (255, 0, 0),  # 红色
                'description': '正方形红色图片'
            },
            {
                'name': 'test_image_rectangle.png',
                'size': (600, 400),
                'color': (0, 255, 0),  # 绿色
                'description': '长方形绿色图片'
            },
            {
                'name': 'test_image_small.png',
                'size': (200, 200),
                'color': (0, 0, 255),  # 蓝色
                'description': '小尺寸蓝色图片'
            },
            {
                'name': 'test_image_large.png',
                'size': (800, 800),
                'color': (255, 255, 0),  # 黄色
                'description': '大尺寸黄色图片'
            }
        ]
        
        for img_config in test_images:
            # 创建图片
            img = Image.new('RGB', img_config['size'], img_config['color'])
            
            # 转换为base64字符串（模拟前端上传）
            img_buffer = io.BytesIO()
            img.save(img_buffer, format='PNG')
            img_buffer.seek(0)
            img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
            
            self.test_images.append({
                'name': img_config['name'],
                'size': img_config['size'],
                'color': img_config['color'],
                'description': img_config['description'],
                'base64': img_base64,
                'file_size': len(img_buffer.getvalue())
            })
        
        print(f"✓ 创建了 {len(self.test_images)} 个测试图片")
    
    def create_test_coupons(self):
        """创建测试券码数据"""
        print("创建测试券码数据...")
        
        with self.app.app_context():
            db.create_all()
            
            # 不同类型的券码
            coupon_configs = [
                {
                    'code': 'TEST001',
                    'discount_type': 'fixed',
                    'discount_value': 10.00,
                    'min_order_amount': 50.00,
                    'valid_days': 30,
                    'usage_limit': 1,
                    'description': '固定金额券码 - 10元折扣'
                },
                {
                    'code': 'TEST002',
                    'discount_type': 'percentage',
                    'discount_value': 15.00,  # 15%折扣
                    'min_order_amount': 100.00,
                    'valid_days': 15,
                    'usage_limit': 2,
                    'description': '百分比券码 - 15%折扣'
                },
                {
                    'code': 'TEST003',
                    'discount_type': 'fixed',
                    'discount_value': 5.00,
                    'min_order_amount': 0.00,
                    'valid_days': 7,
                    'usage_limit': 1,
                    'description': '小额券码 - 5元折扣'
                },
                {
                    'code': 'EXPIRED001',
                    'discount_type': 'fixed',
                    'discount_value': 20.00,
                    'min_order_amount': 0.00,
                    'valid_days': -1,  # 已过期
                    'usage_limit': 1,
                    'description': '过期券码'
                },
                {
                    'code': 'USED001',
                    'discount_type': 'fixed',
                    'discount_value': 15.00,
                    'min_order_amount': 0.00,
                    'valid_days': 30,
                    'usage_limit': 1,
                    'used_count': 1,  # 已使用
                    'description': '已使用券码'
                },
                {
                    'code': 'DISABLED001',
                    'discount_type': 'fixed',
                    'discount_value': 25.00,
                    'min_order_amount': 0.00,
                    'valid_days': 30,
                    'usage_limit': 1,
                    'is_active': False,  # 已禁用
                    'description': '禁用券码'
                }
            ]
            
            for config in coupon_configs:
                # 计算有效期
                if config['valid_days'] > 0:
                    valid_until = datetime.utcnow() + timedelta(days=config['valid_days'])
                else:
                    valid_until = datetime.utcnow() - timedelta(days=1)
                
                coupon = Coupon(
                    code=config['code'],
                    amount=Decimal(str(config['discount_value'])),
                    discount_type=config['discount_type'],
                    discount_value=Decimal(str(config['discount_value'])),
                    min_order_amount=Decimal(str(config['min_order_amount'])),
                    usage_limit=config['usage_limit'],
                    used_count=config.get('used_count', 0),
                    is_active=config.get('is_active', True),
                    valid_until=valid_until
                )
                
                db.session.add(coupon)
                self.test_coupons.append({
                    'config': config,
                    'coupon': coupon
                })
            
            db.session.commit()
            print(f"✓ 创建了 {len(self.test_coupons)} 个测试券码")
    
    def create_test_orders(self):
        """创建测试订单数据"""
        print("创建测试订单数据...")
        
        with self.app.app_context():
            # 不同状态的订单
            order_configs = [
                {
                    'total_price': 100.00,
                    'status': 'pending',
                    'payment_status': 'unpaid',
                    'description': '待支付订单'
                },
                {
                    'total_price': 80.00,
                    'status': 'processing',
                    'payment_status': 'paid',
                    'payment_method': 'coupon',
                    'description': '已支付订单'
                },
                {
                    'total_price': 120.00,
                    'status': 'completed',
                    'payment_status': 'paid',
                    'payment_method': 'coupon',
                    'description': '已完成订单'
                },
                {
                    'total_price': 60.00,
                    'status': 'cancelled',
                    'payment_status': 'unpaid',
                    'description': '已取消订单'
                }
            ]
            
            for config in order_configs:
                order = Order(
                    order_no=Order.generate_order_no(),
                    unit_price=Decimal(str(config['total_price'])),
                    total_price=Decimal(str(config['total_price'])),
                    status=config['status'],
                    payment_status=config['payment_status'],
                    payment_method=config.get('payment_method'),
                    payment_time=datetime.utcnow() if config['payment_status'] == 'paid' else None
                )
                
                db.session.add(order)
                self.test_orders.append({
                    'config': config,
                    'order': order
                })
            
            db.session.commit()
            print(f"✓ 创建了 {len(self.test_orders)} 个测试订单")
    
    def create_test_scenarios(self):
        """创建测试场景数据"""
        print("创建测试场景数据...")
        
        # 完整流程测试场景
        self.test_scenarios = [
            {
                'name': '正常流程测试',
                'description': '用户上传图片 → 编辑调整 → 创建订单 → 使用券码支付 → 完成',
                'steps': [
                    {
                        'step': 1,
                        'action': 'upload_image',
                        'data': {
                            'image': self.test_images[0],
                            'edit_params': {
                                'scale': 1.0,
                                'rotation': 0,
                                'offset_x': 0,
                                'offset_y': 0
                            }
                        }
                    },
                    {
                        'step': 2,
                        'action': 'create_order',
                        'data': {
                            'image': self.test_images[0]['base64'],
                            'edit_params': {
                                'scale': 1.0,
                                'rotation': 0,
                                'offset_x': 0,
                                'offset_y': 0
                            }
                        }
                    },
                    {
                        'step': 3,
                        'action': 'validate_coupon',
                        'data': {
                            'code': 'TEST001',
                            'order_amount': 100.00
                        }
                    },
                    {
                        'step': 4,
                        'action': 'process_payment',
                        'data': {
                            'order_no': 'PLACEHOLDER',
                            'payment_method': 'coupon',
                            'coupon_code': 'TEST001'
                        }
                    }
                ]
            },
            {
                'name': '百分比券码测试',
                'description': '使用百分比券码进行支付',
                'steps': [
                    {
                        'step': 1,
                        'action': 'create_order',
                        'data': {
                            'image': self.test_images[1]['base64'],
                            'edit_params': {
                                'scale': 1.2,
                                'rotation': 90,
                                'offset_x': 10,
                                'offset_y': -10
                            }
                        }
                    },
                    {
                        'step': 2,
                        'action': 'validate_coupon',
                        'data': {
                            'code': 'TEST002',
                            'order_amount': 200.00
                        }
                    },
                    {
                        'step': 3,
                        'action': 'process_payment',
                        'data': {
                            'order_no': 'PLACEHOLDER',
                            'payment_method': 'coupon',
                            'coupon_code': 'TEST002'
                        }
                    }
                ]
            },
            {
                'name': '券码验证失败测试',
                'description': '测试各种券码验证失败的情况',
                'steps': [
                    {
                        'step': 1,
                        'action': 'validate_coupon',
                        'data': {
                            'code': 'INVALID123',
                            'order_amount': 100.00
                        },
                        'expected_result': 'error',
                        'expected_error': '券码不存在'
                    },
                    {
                        'step': 2,
                        'action': 'validate_coupon',
                        'data': {
                            'code': 'EXPIRED001',
                            'order_amount': 100.00
                        },
                        'expected_result': 'error',
                        'expected_error': '券码已过期'
                    },
                    {
                        'step': 3,
                        'action': 'validate_coupon',
                        'data': {
                            'code': 'USED001',
                            'order_amount': 100.00
                        },
                        'expected_result': 'error',
                        'expected_error': '券码已用完'
                    },
                    {
                        'step': 4,
                        'action': 'validate_coupon',
                        'data': {
                            'code': 'DISABLED001',
                            'order_amount': 100.00
                        },
                        'expected_result': 'error',
                        'expected_error': '券码已过期'
                    }
                ]
            },
            {
                'name': '订单金额不足测试',
                'description': '测试订单金额不满足券码最低消费要求',
                'steps': [
                    {
                        'step': 1,
                        'action': 'validate_coupon',
                        'data': {
                            'code': 'TEST001',
                            'order_amount': 30.00  # 低于最低消费50.00
                        },
                        'expected_result': 'success',
                        'expected_discount': 0
                    }
                ]
            },
            {
                'name': '重复支付测试',
                'description': '测试对已支付订单重复支付',
                'steps': [
                    {
                        'step': 1,
                        'action': 'process_payment',
                        'data': {
                            'order_no': 'PLACEHOLDER_PAID',
                            'payment_method': 'coupon',
                            'coupon_code': 'TEST001'
                        },
                        'expected_result': 'error',
                        'expected_error': '订单已支付'
                    }
                ]
            },
            {
                'name': '图片编辑参数测试',
                'description': '测试不同的图片编辑参数',
                'steps': [
                    {
                        'step': 1,
                        'action': 'create_order',
                        'data': {
                            'image': self.test_images[2]['base64'],
                            'edit_params': {
                                'scale': 0.8,
                                'rotation': 180,
                                'offset_x': -20,
                                'offset_y': 15
                            }
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
                'name': '空券码测试',
                'data': {
                    'code': '',
                    'order_amount': 100.00
                },
                'expected_error': '券码不能为空'
            },
            {
                'name': '无效订单号测试',
                'data': {
                    'order_no': 'INVALID_ORDER_NO',
                    'payment_method': 'coupon',
                    'coupon_code': 'TEST001'
                },
                'expected_error': '订单不存在'
            },
            {
                'name': '缺少必要参数测试',
                'data': {
                    'order_no': 'PLACEHOLDER'
                    # 缺少payment_method和coupon_code
                },
                'expected_error': '缺少订单号'
            },
            {
                'name': '大图片测试',
                'data': {
                    'image': self.test_images[3]['base64'],
                    'edit_params': {
                        'scale': 2.0,
                        'rotation': 45,
                        'offset_x': 50,
                        'offset_y': -50
                    }
                }
            }
        ]
        
        self.test_scenarios.extend(edge_cases)
        print(f"✓ 创建了 {len(edge_cases)} 个边界情况测试")
    
    def generate_test_data_summary(self):
        """生成测试数据摘要"""
        with self.app.app_context():
            summary = {
                'test_images': len(self.test_images),
                'test_coupons': len(self.test_coupons),
                'test_orders': len(self.test_orders),
                'test_scenarios': len(self.test_scenarios),
                'created_at': datetime.now().isoformat(),
                'images': [
                    {
                        'name': img['name'],
                        'size': img['size'],
                        'description': img['description']
                    } for img in self.test_images
                ],
                'coupons': [
                    {
                        'code': coupon['config']['code'],
                        'type': coupon['config']['discount_type'],
                        'value': coupon['config']['discount_value'],
                        'description': coupon['config']['description']
                    } for coupon in self.test_coupons
                ],
                'orders': [
                    {
                        'order_no': order['order'].order_no,
                        'status': order['order'].status,
                        'payment_status': order['order'].payment_status,
                        'description': order['config']['description']
                    } for order in self.test_orders
                ],
                'scenarios': [
                    {
                        'name': scenario['name'],
                        'description': scenario['description'],
                        'steps_count': len(scenario.get('steps', []))
                    } for scenario in self.test_scenarios
                ]
            }
            
            return summary
    
    def save_test_data(self, filename='test_data.json'):
        """保存测试数据到文件"""
        print(f"保存测试数据到 {filename}...")
        
        with self.app.app_context():
            # 准备可序列化的数据
            serializable_data = {
                'test_images': [
                    {
                        'name': img['name'],
                        'size': img['size'],
                        'color': img['color'],
                        'description': img['description'],
                        'base64': img['base64'],
                        'file_size': img['file_size']
                    } for img in self.test_images
                ],
                'test_coupons': [
                    {
                        'code': coupon['coupon'].code,
                        'discount_type': coupon['coupon'].discount_type,
                        'discount_value': float(coupon['coupon'].discount_value),
                        'min_order_amount': float(coupon['coupon'].min_order_amount),
                        'usage_limit': coupon['coupon'].usage_limit,
                        'used_count': coupon['coupon'].used_count,
                        'is_active': coupon['coupon'].is_active,
                        'valid_until': coupon['coupon'].valid_until.isoformat() if coupon['coupon'].valid_until else None,
                        'description': coupon['config']['description']
                    } for coupon in self.test_coupons
                ],
                'test_orders': [
                    {
                        'order_no': order['order'].order_no,
                        'unit_price': float(order['order'].unit_price),
                        'total_price': float(order['order'].total_price),
                        'status': order['order'].status,
                        'payment_status': order['order'].payment_status,
                        'payment_method': order['order'].payment_method,
                        'payment_time': order['order'].payment_time.isoformat() if order['order'].payment_time else None,
                        'description': order['config']['description']
                    } for order in self.test_orders
                ],
                'test_scenarios': self.test_scenarios,
                'summary': self.generate_test_data_summary()
            }
            
            # 保存到文件
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(serializable_data, f, ensure_ascii=False, indent=2)
            
            print(f"✓ 测试数据已保存到 {filename}")
    
    def cleanup(self):
        """清理测试数据"""
        print("清理测试数据...")
        
        with self.app.app_context():
            db.drop_all()
        
        print("✓ 测试数据已清理")
    
    def run_all(self):
        """运行所有数据创建流程"""
        print("="*60)
        print("创建测试数据集")
        print("="*60)
        
        try:
            self.create_test_images()
            self.create_test_coupons()
            self.create_test_orders()
            self.create_test_scenarios()
            self.create_edge_cases()
            
            summary = self.generate_test_data_summary()
            print("\n" + "="*60)
            print("测试数据摘要")
            print("="*60)
            print(f"测试图片: {summary['test_images']} 个")
            print(f"测试券码: {summary['test_coupons']} 个")
            print(f"测试订单: {summary['test_orders']} 个")
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
    test_data = TestDataSet()
    success = test_data.run_all()
    
    if success:
        print("\n🎉 测试数据集创建成功！")
        exit(0)
    else:
        print("\n💥 测试数据集创建失败！")
        exit(1)
