# utils/recommendation_engine.py
"""
个性化推荐引擎
"""
import json
from datetime import datetime, timedelta
from utils.models import db, Case, CaseInteraction, Order
from utils.logger import logger

class RecommendationEngine:
    """个性化推荐引擎"""
    
    def __init__(self):
        self.cache_duration = 3600  # 缓存1小时
        self.recommendation_cache = {}
    
    def get_recommendations(self, ip_address, limit=8):
        """获取个性化推荐"""
        try:
            # 检查缓存
            cache_key = f"recommendations_{ip_address}"
            if cache_key in self.recommendation_cache:
                cached_data = self.recommendation_cache[cache_key]
                if datetime.now() - cached_data['timestamp'] < timedelta(seconds=self.cache_duration):
                    return cached_data['recommendations'][:limit]
            
            # 生成推荐
            recommendations = self._generate_recommendations(ip_address, limit)
            
            # 缓存结果
            self.recommendation_cache[cache_key] = {
                'recommendations': recommendations,
                'timestamp': datetime.now()
            }
            
            return recommendations
            
        except Exception as e:
            logger.log_error('recommendation_error', str(e), ip_address)
            return self._get_fallback_recommendations(limit)
    
    def _generate_recommendations(self, ip_address, limit):
        """生成个性化推荐"""
        recommendations = []
        
        # 1. 基于用户行为的协同过滤
        behavior_based = self._get_behavior_based_recommendations(ip_address, limit // 2)
        recommendations.extend(behavior_based)
        
        # 2. 基于内容相似度的推荐
        content_based = self._get_content_based_recommendations(ip_address, limit // 2)
        recommendations.extend(content_based)
        
        # 3. 热门案例补充
        if len(recommendations) < limit:
            popular_cases = self._get_popular_cases(limit - len(recommendations))
            recommendations.extend(popular_cases)
        
        # 去重并限制数量
        seen_ids = set()
        unique_recommendations = []
        for case in recommendations:
            if case['id'] not in seen_ids:
                seen_ids.add(case['id'])
                unique_recommendations.append(case)
                if len(unique_recommendations) >= limit:
                    break
        
        return unique_recommendations
    
    def _get_behavior_based_recommendations(self, ip_address, limit):
        """基于用户行为的推荐"""
        try:
            # 获取用户的历史互动
            user_interactions = CaseInteraction.query.filter_by(ip_address=ip_address).all()
            
            if not user_interactions:
                return []
            
            # 分析用户偏好
            user_preferences = self._analyze_user_preferences(user_interactions)
            
            # 基于偏好推荐相似案例
            recommendations = []
            for category in user_preferences['categories']:
                cases = Case.query.filter(
                    Case.category == category,
                    Case.is_public == True
                ).order_by(Case.like_count.desc()).limit(limit).all()
                
                for case in cases:
                    recommendations.append({
                        'id': case.id,
                        'title': case.title,
                        'preview_image_path': case.preview_image_path,
                        'category': case.category,
                        'like_count': case.like_count,
                        'make_count': case.make_count,
                        'score': self._calculate_behavior_score(case, user_preferences)
                    })
            
            # 按分数排序
            recommendations.sort(key=lambda x: x['score'], reverse=True)
            return recommendations[:limit]
            
        except Exception as e:
            logger.log_error('behavior_recommendation_error', str(e), ip_address)
            return []
    
    def _get_content_based_recommendations(self, ip_address, limit):
        """基于内容相似度的推荐"""
        try:
            # 获取用户最近查看的案例
            recent_views = CaseInteraction.query.filter_by(
                ip_address=ip_address,
                interaction_type='view'
            ).order_by(CaseInteraction.created_at.desc()).limit(5).all()
            
            if not recent_views:
                return []
            
            # 基于最近查看的案例推荐相似内容
            recommendations = []
            for view in recent_views:
                case = Case.query.get(view.case_id)
                if not case:
                    continue
                
                # 推荐同分类的案例
                similar_cases = Case.query.filter(
                    Case.category == case.category,
                    Case.id != case.id,
                    Case.is_public == True
                ).order_by(Case.like_count.desc()).limit(2).all()
                
                for similar_case in similar_cases:
                    recommendations.append({
                        'id': similar_case.id,
                        'title': similar_case.title,
                        'preview_image_path': similar_case.preview_image_path,
                        'category': similar_case.category,
                        'like_count': similar_case.like_count,
                        'make_count': similar_case.make_count,
                        'score': self._calculate_content_score(similar_case, case)
                    })
            
            # 去重并按分数排序
            seen_ids = set()
            unique_recommendations = []
            for rec in recommendations:
                if rec['id'] not in seen_ids:
                    seen_ids.add(rec['id'])
                    unique_recommendations.append(rec)
            
            unique_recommendations.sort(key=lambda x: x['score'], reverse=True)
            return unique_recommendations[:limit]
            
        except Exception as e:
            logger.log_error('content_recommendation_error', str(e), ip_address)
            return []
    
    def _get_popular_cases(self, limit):
        """获取热门案例"""
        try:
            cases = Case.query.filter(
                Case.is_public == True
            ).order_by(
                Case.like_count.desc(),
                Case.make_count.desc(),
                Case.view_count.desc()
            ).limit(limit).all()
            
            return [{
                'id': case.id,
                'title': case.title,
                'preview_image_path': case.preview_image_path,
                'category': case.category,
                'like_count': case.like_count,
                'make_count': case.make_count,
                'score': 0.5  # 默认分数
            } for case in cases]
            
        except Exception as e:
            logger.log_error('popular_cases_error', str(e))
            return []
    
    def _get_fallback_recommendations(self, limit):
        """获取备用推荐"""
        try:
            cases = Case.query.filter(
                Case.is_featured == True,
                Case.is_public == True
            ).order_by(Case.created_at.desc()).limit(limit).all()
            
            return [{
                'id': case.id,
                'title': case.title,
                'preview_image_path': case.preview_image_path,
                'category': case.category,
                'like_count': case.like_count,
                'make_count': case.make_count,
                'score': 0.3  # 默认分数
            } for case in cases]
            
        except Exception as e:
            logger.log_error('fallback_recommendations_error', str(e))
            return []
    
    def _analyze_user_preferences(self, interactions):
        """分析用户偏好"""
        preferences = {
            'categories': {},
            'tags': {},
            'interaction_types': {}
        }
        
        for interaction in interactions:
            case = Case.query.get(interaction.case_id)
            if not case:
                continue
            
            # 统计分类偏好
            if case.category:
                preferences['categories'][case.category] = preferences['categories'].get(case.category, 0) + 1
            
            # 统计标签偏好
            if case.tags:
                tags = json.loads(case.tags) if isinstance(case.tags, str) else case.tags
                for tag in tags:
                    preferences['tags'][tag] = preferences['tags'].get(tag, 0) + 1
            
            # 统计互动类型偏好
            preferences['interaction_types'][interaction.interaction_type] = preferences['interaction_types'].get(interaction.interaction_type, 0) + 1
        
        # 排序并返回前几个偏好
        preferences['categories'] = sorted(preferences['categories'].items(), key=lambda x: x[1], reverse=True)[:3]
        preferences['tags'] = sorted(preferences['tags'].items(), key=lambda x: x[1], reverse=True)[:5]
        
        return preferences
    
    def _calculate_behavior_score(self, case, user_preferences):
        """计算行为推荐分数"""
        score = 0.0
        
        # 分类匹配分数
        for category, weight in user_preferences['categories']:
            if case.category == category:
                score += weight * 0.4
        
        # 标签匹配分数
        if case.tags:
            tags = json.loads(case.tags) if isinstance(case.tags, str) else case.tags
            for tag, weight in user_preferences['tags']:
                if tag in tags:
                    score += weight * 0.2
        
        # 案例质量分数
        score += case.like_count * 0.001
        score += case.make_count * 0.002
        score += case.view_count * 0.0005
        
        # 推荐案例加分
        if case.is_featured:
            score += 0.1
        
        return min(score, 1.0)  # 限制最大分数为1.0
    
    def _calculate_content_score(self, case, reference_case):
        """计算内容相似度分数"""
        score = 0.0
        
        # 分类相似度
        if case.category == reference_case.category:
            score += 0.5
        
        # 标签相似度
        if case.tags and reference_case.tags:
            case_tags = json.loads(case.tags) if isinstance(case.tags, str) else case.tags
            ref_tags = json.loads(reference_case.tags) if isinstance(reference_case.tags, str) else reference_case.tags
            
            common_tags = set(case_tags) & set(ref_tags)
            if common_tags:
                score += len(common_tags) * 0.1
        
        # 案例质量分数
        score += case.like_count * 0.001
        score += case.make_count * 0.002
        
        return min(score, 1.0)
    
    def clear_cache(self):
        """清除缓存"""
        self.recommendation_cache.clear()
    
    def get_trending_cases(self, limit=8):
        """获取趋势案例"""
        try:
            # 获取最近7天的案例
            week_ago = datetime.now() - timedelta(days=7)
            
            cases = Case.query.filter(
                Case.created_at >= week_ago,
                Case.is_public == True
            ).order_by(
                Case.like_count.desc(),
                Case.make_count.desc()
            ).limit(limit).all()
            
            return [{
                'id': case.id,
                'title': case.title,
                'preview_image_path': case.preview_image_path,
                'category': case.category,
                'like_count': case.like_count,
                'make_count': case.make_count,
                'trend_score': self._calculate_trend_score(case)
            } for case in cases]
            
        except Exception as e:
            logger.log_error('trending_cases_error', str(e))
            return []
    
    def _calculate_trend_score(self, case):
        """计算趋势分数"""
        # 基于点赞数、制作数、浏览数的综合分数
        score = case.like_count * 0.4 + case.make_count * 0.5 + case.view_count * 0.1
        
        # 时间衰减因子
        days_old = (datetime.now() - case.created_at).days
        time_factor = max(0.1, 1.0 - days_old * 0.1)
        
        return score * time_factor

# 全局推荐引擎实例
recommendation_engine = RecommendationEngine()
