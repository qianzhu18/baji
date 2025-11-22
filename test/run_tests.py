#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
吧唧生成器 - 测试运行脚本
提供多种测试模式的统一入口
"""

import sys
import os
import argparse
from datetime import datetime

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def run_comprehensive_tests():
    """运行完整测试"""
    from test.comprehensive_test_plan import ComprehensiveTestSuite
    
    print("🚀 运行完整测试套件...")
    test_suite = ComprehensiveTestSuite()
    results = test_suite.run_all_tests()
    
    report_path = test_suite.save_report()
    print(f"📊 测试报告已保存: {report_path}")
    
    return results

def run_regression_tests():
    """运行回归测试"""
    from test.comprehensive_test_plan import ComprehensiveTestSuite
    
    print("🔄 运行回归测试...")
    test_suite = ComprehensiveTestSuite()
    results = test_suite.run_regression_tests()
    
    report_filename = f"regression_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    report_path = test_suite.save_report(report_filename)
    print(f"📊 回归测试报告已保存: {report_path}")
    
    return results

def run_security_tests():
    """运行安全测试"""
    from test.comprehensive_test_plan import ComprehensiveTestSuite
    
    print("🔒 运行安全测试...")
    test_suite = ComprehensiveTestSuite()
    
    # 只运行安全测试
    test_suite.test_security_vulnerabilities()
    test_suite.generate_recommendations()
    
    report_filename = f"security_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    report_path = test_suite.save_report(report_filename)
    print(f"📊 安全测试报告已保存: {report_path}")
    
    return test_suite.test_results

def run_functional_tests():
    """运行功能测试"""
    from test.comprehensive_test_plan import ComprehensiveTestSuite
    
    print("🔧 运行功能测试...")
    test_suite = ComprehensiveTestSuite()
    
    # 只运行功能测试
    test_suite.test_api_endpoints_functional()
    test_suite.test_admin_functions()
    test_suite.test_page_routes()
    test_suite.generate_recommendations()
    
    report_filename = f"functional_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    report_path = test_suite.save_report(report_filename)
    print(f"📊 功能测试报告已保存: {report_path}")
    
    return test_suite.test_results

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='吧唧生成器测试工具')
    parser.add_argument('mode', choices=['all', 'regression', 'security', 'functional'], 
                       help='测试模式: all(完整测试), regression(回归测试), security(安全测试), functional(功能测试)')
    parser.add_argument('--url', default='http://localhost:5000', 
                       help='测试目标URL (默认: http://localhost:5000)')
    parser.add_argument('--verbose', '-v', action='store_true', 
                       help='详细输出')
    
    args = parser.parse_args()
    
    print("🛡️ 吧唧生成器测试工具")
    print("=" * 50)
    print(f"📅 测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🎯 测试目标: {args.url}")
    print(f"🔧 测试模式: {args.mode}")
    print("=" * 50)
    
    try:
        if args.mode == 'all':
            results = run_comprehensive_tests()
        elif args.mode == 'regression':
            results = run_regression_tests()
        elif args.mode == 'security':
            results = run_security_tests()
        elif args.mode == 'functional':
            results = run_functional_tests()
        
        # 显示测试摘要
        print("\n📋 测试摘要:")
        security_tests = results.get('security_tests', {})
        functional_tests = results.get('functional_tests', {})
        
        security_passed = len([r for r in security_tests.values() if r['success']])
        functional_passed = len([r for r in functional_tests.values() if r['success']])
        
        print(f"🔒 安全测试: {security_passed}/{len(security_tests)} 通过")
        print(f"🔧 功能测试: {functional_passed}/{len(functional_tests)} 通过")
        print(f"⚠️ 发现问题: {len(results.get('issues_found', []))} 个")
        print(f"💡 安全建议: {len(results.get('recommendations', []))} 条")
        
        # 计算评分
        total_tests = len(security_tests) + len(functional_tests)
        passed_tests = security_passed + functional_passed
        score = (passed_tests / total_tests * 10) if total_tests > 0 else 0
        
        print(f"🛡️ 综合评分: {score:.1f}/10")
        
        # 根据评分给出建议
        if score >= 8.0:
            print("🎉 系统状况良好！")
        elif score >= 6.0:
            print("⚠️ 系统状况一般，建议改进。")
        else:
            print("🚨 系统需要重要改进！")
        
        return 0
        
    except Exception as e:
        print(f"❌ 测试执行失败: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
