# scripts/init_case_data.py
"""
案例数据初始化脚本
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.app_factory import create_app
from utils.models import db, Case, Order
import json

def init_case_data():
    """初始化案例数据"""
    app = create_app()
    
    with app.app_context():
        try:
            # 检查是否已有案例数据
            existing_cases = Case.query.count()
            if existing_cases > 0:
                print(f"✅ 已存在 {existing_cases} 个案例，跳过初始化")
                return True
            
            # 从现有订单创建案例
            completed_orders = Order.query.filter(Order.status == 'completed').all()
            
            if not completed_orders:
                print("⚠️ 没有已完成的订单，无法创建案例")
                return True
            
            print(f"📝 从 {len(completed_orders)} 个已完成订单创建案例...")
            
            created_count = 0
            for order in completed_orders:
                try:
                    # 检查是否已经创建过案例
                    existing_case = Case.query.filter_by(order_id=order.id).first()
                    if existing_case:
                        continue
                    
                    # 创建案例
                    case = Case.create_from_order(order)
                    
                    # 设置一些示例数据
                    case.title = f"精彩吧唧作品 {order.order_no}"
                    case.description = "用户创作的精彩吧唧作品，展现了独特的创意和设计"
                    case.category = "用户创作"
                    case.tags = json.dumps(["用户作品", "创意设计", "个性化"])
                    
                    # 随机设置一些统计数据
                    import random
                    case.like_count = random.randint(5, 50)
                    case.make_count = random.randint(1, 20)
                    case.view_count = random.randint(20, 200)
                    
                    # 随机设置一些为推荐案例
                    if random.random() < 0.3:  # 30% 概率设为推荐
                        case.is_featured = True
                        case.featured_at = order.created_at
                    
                    db.session.add(case)
                    created_count += 1
                    
                except Exception as e:
                    print(f"⚠️ 创建案例失败 (订单 {order.order_no}): {str(e)}")
                    continue
            
            db.session.commit()
            print(f"✅ 成功创建 {created_count} 个案例")
            
            # 显示统计信息
            total_cases = Case.query.count()
            featured_cases = Case.query.filter(Case.is_featured == True).count()
            
            print(f"\n📊 案例统计:")
            print(f"   总案例数: {total_cases}")
            print(f"   推荐案例: {featured_cases}")
            print(f"   普通案例: {total_cases - featured_cases}")
            
            print("\n🎉 案例数据初始化完成！")
            
        except Exception as e:
            print(f"❌ 案例数据初始化失败: {str(e)}")
            db.session.rollback()
            return False
    
    return True

if __name__ == '__main__':
    init_case_data()
