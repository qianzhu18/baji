#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
吧唧生成器 - 回归测试脚本
专门用于验证安全改进后的系统功能
"""

import sys
import os
import time
from datetime import datetime

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from test.comprehensive_test_plan import ComprehensiveTestSuite

def run_security_regression():
    """运行安全回归测试"""
    print("🛡️ 吧唧生成器安全回归测试")
    print("=" * 60)
    print("📅 测试时间:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("🎯 测试目标: 验证安全改进措施的有效性")
    print("=" * 60)
    
    # 创建测试套件
    test_suite = ComprehensiveTestSuite()
    
    # 运行回归测试
    start_time = time.time()
    results = test_suite.run_regression_tests()
    end_time = time.time()
    
    # 生成报告
    report_filename = f"security_regression_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    report_path = test_suite.save_report(report_filename)
    
    # 分析结果
    analyze_security_results(test_suite)
    
    print(f"\n⏱️ 测试耗时: {end_time - start_time:.2f}秒")
    print(f"📊 详细报告: {report_path}")
    
    return results

def analyze_security_results(test_suite):
    """分析安全测试结果"""
    print("\n🔍 安全测试结果分析:")
    print("-" * 40)
    
    security_tests = test_suite.test_results.get('security_tests', {})
    functional_tests = test_suite.test_results.get('functional_tests', {})
    
    # 统计结果
    total_security_tests = len(security_tests)
    passed_security_tests = len([r for r in security_tests.values() if r['success']])
    failed_security_tests = total_security_tests - passed_security_tests
    
    total_functional_tests = len(functional_tests)
    passed_functional_tests = len([r for r in functional_tests.values() if r['success']])
    failed_functional_tests = total_functional_tests - passed_functional_tests
    
    print(f"🔒 安全测试: {passed_security_tests}/{total_security_tests} 通过")
    print(f"🔧 功能测试: {passed_functional_tests}/{total_functional_tests} 通过")
    
    # 计算安全评分
    total_tests = total_security_tests + total_functional_tests
    passed_tests = passed_security_tests + passed_functional_tests
    security_score = (passed_tests / total_tests * 10) if total_tests > 0 else 0
    
    print(f"🛡️ 综合安全评分: {security_score:.1f}/10")
    
    # 关键安全测试结果
    print("\n🔑 关键安全测试结果:")
    key_tests = [
        ('MIME类型验证测试', '文件类型验证'),
        ('请求频率限制测试', '防暴力攻击'),
        ('安全头测试', 'HTTP安全头'),
        ('安全审计日志测试', '安全事件记录'),
        ('文件上传安全测试', '恶意文件防护'),
        ('路径遍历测试', '路径注入防护')
    ]
    
    for test_name, description in key_tests:
        if test_name in security_tests:
            result = security_tests[test_name]
            status = "✅ 通过" if result['success'] else "❌ 失败"
            print(f"  {description}: {status}")
        else:
            print(f"  {description}: ⚠️ 未测试")
    
    # 显示失败的安全测试
    if failed_security_tests > 0:
        print(f"\n⚠️ 失败的安全测试:")
        for test_name, result in security_tests.items():
            if not result['success']:
                print(f"  ❌ {test_name}: {result.get('issue', '未知错误')}")
    
    # 显示建议
    recommendations = test_suite.test_results.get('recommendations', [])
    if recommendations:
        print(f"\n💡 安全建议 ({len(recommendations)}条):")
        high_priority = [r for r in recommendations if r.get('priority') == 'high']
        medium_priority = [r for r in recommendations if r.get('priority') == 'medium']
        
        if high_priority:
            print("  🔴 高优先级:")
            for rec in high_priority:
                print(f"    • {rec['title']}: {rec['description']}")
        
        if medium_priority:
            print("  🟡 中优先级:")
            for rec in medium_priority[:3]:  # 只显示前3个
                print(f"    • {rec['title']}: {rec['description']}")
    
    # 总结
    print(f"\n📋 测试总结:")
    if security_score >= 8.0:
        print("  🎉 安全状况良好！系统已通过大部分安全测试。")
    elif security_score >= 6.0:
        print("  ⚠️ 安全状况一般，建议修复失败的安全测试。")
    else:
        print("  🚨 安全状况需要改进，请优先修复高优先级安全问题。")
    
    if failed_security_tests == 0:
        print("  ✅ 所有安全测试通过！安全改进措施有效。")
    else:
        print(f"  ❌ 发现 {failed_security_tests} 个安全测试失败，需要进一步改进。")

def main():
    """主函数"""
    try:
        results = run_security_regression()
        
        # 根据测试结果设置退出码
        security_tests = results.get('security_tests', {})
        failed_tests = len([r for r in security_tests.values() if not r['success']])
        
        if failed_tests == 0:
            print("\n🎉 回归测试全部通过！")
            sys.exit(0)
        else:
            print(f"\n⚠️ 发现 {failed_tests} 个测试失败，请检查报告。")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ 回归测试执行失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
