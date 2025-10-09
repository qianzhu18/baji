/**
 * v1 AI API Routes (DEPRECATED)
 * 
 * ⚠️ 这些路由已被弃用，将在 2025-12-31 移除
 * 请迁移到 v2 API: /api/v2/ai/*
 */

import express from 'express';
import { deprecateV1Api } from '../middleware/deprecation';

const router = express.Router();

// 应用弃用中间件到所有v1路由
router.use(deprecateV1Api);

/**
 * 创建弃用响应处理器
 */
const createDeprecatedHandler = (v2Endpoint: string) => {
  return (req: express.Request, res: express.Response) => {
    res.status(410).json({
      error: 'API Deprecated',
      message: 'This v1 API endpoint has been deprecated and is no longer functional',
      v2Endpoint: v2Endpoint,
      migrationGuide: 'Please update your client to use the v2 API',
      deprecationDate: '2025-07-25',
      sunsetDate: '2025-12-31'
    });
  };
};

// v1 AI API 路由 (已弃用)
router.get('/validate-key', createDeprecatedHandler('/api/v2/ai/validate-key'));
router.post('/parse', createDeprecatedHandler('/api/v2/ai/parse'));
router.get('/parse/:jobId/status', createDeprecatedHandler('/api/v2/ai/parse/status'));
router.post('/reparse/:quizId', createDeprecatedHandler('/api/v2/ai/reparse'));
router.post('/convert', createDeprecatedHandler('/api/v2/ai/convert'));
router.get('/convert/:jobId/status', createDeprecatedHandler('/api/v2/ai/convert/status'));

export default router;
