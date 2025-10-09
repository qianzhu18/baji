import { Router } from 'express';
import { aiController } from '../../controllers/aiController-v2';
import { rateLimit } from 'express-rate-limit';

// 简单的认证中间件，暂时跳过认证
const authMiddleware = (req: any, res: any, next: any) => {
  // TODO: 实现真正的认证
  next();
};

const router = Router();

// AI验证相关的速率限制
const aiValidationLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 每15分钟最多10次验证请求
  message: {
    success: false,
    error: 'Too many validation requests, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI生成相关的速率限制
const aiGenerationLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 20, // 每小时最多20次生成请求
  message: {
    success: false,
    error: 'Too many generation requests, please try again later',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   GET /api/ai/validate-key
 * @desc    验证Gemini API密钥
 * @access  Public (但有速率限制)
 * @example
 * GET /api/ai/validate-key?apiKey=your_api_key
 * 
 * Response:
 * {
 *   "valid": true,
 *   "provider": "gemini",
 *   "quota": {
 *     "used": 1,
 *     "limit": 1000,
 *     "remaining": 999
 *   },
 *   "timestamp": "2025-01-01T00:00:00.000Z"
 * }
 */
router.get('/validate-key', aiValidationLimit, (req, res) => {
  aiController.validateGeminiKey(req, res);
});

/**
 * @route   GET /api/ai/status
 * @desc    获取AI服务状态
 * @access  Public
 * @example
 * GET /api/ai/status
 * 
 * Response:
 * {
 *   "provider": "gemini",
 *   "model": "gemini-pro",
 *   "configured": true,
 *   "healthy": true,
 *   "supportedProviders": ["gemini", "mock", "openai"],
 *   "usage": {
 *     "requestsToday": 42,
 *     "tokensUsed": 1337,
 *     "errorRate": 0.05
 *   },
 *   "timestamp": "2025-01-01T00:00:00.000Z"
 * }
 */
router.get('/status', (req, res) => {
  aiController.getAiStatus(req, res);
});

/**
 * @route   POST /api/ai/test-generation
 * @desc    测试AI生成功能
 * @access  Private (需要认证)
 * @example
 * POST /api/ai/test-generation
 * {
 *   "content": "# 测试题库\n\n1. 测试题目？\nA. 选项A\nB. 选项B\n\n答案：A",
 *   "provider": "gemini"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "provider": "gemini",
 *   "metadata": {
 *     "questionCount": 1,
 *     "processingTime": 2500,
 *     "tokensUsed": 150
 *   },
 *   "htmlPreview": "<div class=\"quiz-container\">...",
 *   "timestamp": "2025-01-01T00:00:00.000Z"
 * }
 */
router.post('/test-generation', authMiddleware, aiGenerationLimit, (req, res) => {
  aiController.testGeneration(req, res);
});

/**
 * @route   POST /api/ai/switch-provider
 * @desc    切换AI提供商
 * @access  Private (需要认证)
 * @example
 * POST /api/ai/switch-provider
 * {
 *   "provider": "gemini",
 *   "apiKey": "your_new_api_key"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "provider": "gemini",
 *   "healthy": true,
 *   "timestamp": "2025-01-01T00:00:00.000Z"
 * }
 */
router.post('/switch-provider', authMiddleware, aiValidationLimit, (req, res) => {
  aiController.switchProvider(req, res);
});

/**
 * @route   GET /api/ai/providers
 * @desc    获取支持的AI提供商列表
 * @access  Public
 * @example
 * GET /api/ai/providers
 * 
 * Response:
 * {
 *   "providers": [
 *     {
 *       "name": "gemini",
 *       "displayName": "Google Gemini",
 *       "description": "Google's advanced AI model",
 *       "requiresApiKey": true,
 *       "features": ["text-generation", "quiz-creation"],
 *       "pricing": "free-tier-available"
 *     },
 *     {
 *       "name": "mock",
 *       "displayName": "Mock Provider",
 *       "description": "For testing and development",
 *       "requiresApiKey": false,
 *       "features": ["text-generation", "quiz-creation"],
 *       "pricing": "free"
 *     }
 *   ]
 * }
 */
router.get('/providers', (req, res) => {
  const providers = [
    {
      name: 'gemini',
      displayName: 'Google Gemini',
      description: 'Google\'s advanced AI model for text generation and quiz creation',
      requiresApiKey: true,
      features: ['text-generation', 'quiz-creation', 'content-analysis'],
      pricing: 'free-tier-available',
      documentation: 'https://ai.google.dev/docs',
      status: 'stable'
    },
    {
      name: 'mock',
      displayName: 'Mock Provider',
      description: 'Simulated AI provider for testing and development purposes',
      requiresApiKey: false,
      features: ['text-generation', 'quiz-creation'],
      pricing: 'free',
      documentation: 'Built-in for testing',
      status: 'development'
    },
    {
      name: 'openai',
      displayName: 'OpenAI GPT',
      description: 'OpenAI\'s GPT models (coming soon)',
      requiresApiKey: true,
      features: ['text-generation', 'quiz-creation', 'content-analysis'],
      pricing: 'pay-per-use',
      documentation: 'https://platform.openai.com/docs',
      status: 'planned'
    }
  ];

  res.json({
    providers,
    total: providers.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /api/ai/health
 * @desc    AI服务健康检查
 * @access  Public
 * @example
 * GET /api/ai/health
 * 
 * Response:
 * {
 *   "status": "healthy",
 *   "providers": {
 *     "gemini": {
 *       "status": "healthy",
 *       "responseTime": 250,
 *       "lastCheck": "2025-01-01T00:00:00.000Z"
 *     }
 *   },
 *   "timestamp": "2025-01-01T00:00:00.000Z"
 * }
 */
router.get('/health', async (req, res) => {
  try {
    // 简化健康检查，暂时返回基本状态
    const healthStatus = {
      status: 'ok',
      providers: {
        gemini: {
          status: 'unknown',
          message: 'Health check not implemented yet'
        }
      },
      timestamp: new Date().toISOString()
    };

    res.json(healthStatus);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
