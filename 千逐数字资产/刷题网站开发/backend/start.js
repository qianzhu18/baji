// 简单的演示服务器，使用Node.js内置模块
const http = require('http');
const url = require('url');

const PORT = 3001;

// 解析JSON请求体
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

// 设置CORS头
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

// 发送JSON响应
function sendJson(res, data, statusCode = 200) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// 创建HTTP服务器
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // 处理OPTIONS请求（CORS预检）
  if (method === 'OPTIONS') {
    setCorsHeaders(res);
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    // 健康检查
    if (path === '/health' && method === 'GET') {
      sendJson(res, {
        success: true,
        message: '服务运行正常',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 用户注册
    if (path === '/api/auth/register' && method === 'POST') {
      const body = await parseBody(req);
      sendJson(res, {
        success: true,
        message: '注册成功',
        data: {
          token: 'demo-token',
          user: {
            _id: 'demo-user-id',
            name: body.name,
            email: body.email
          }
        }
      });
      return;
    }

    // 用户登录
    if (path === '/api/auth/login' && method === 'POST') {
      const body = await parseBody(req);
      sendJson(res, {
        success: true,
        message: '登录成功',
        data: {
          token: 'demo-token',
          user: {
            _id: 'demo-user-id',
            name: '演示用户',
            email: body.email
          }
        }
      });
      return;
    }

    // 获取用户信息
    if (path === '/api/auth/me' && method === 'GET') {
      sendJson(res, {
        success: true,
        data: {
          user: {
            _id: 'demo-user-id',
            name: '演示用户',
            email: 'demo@example.com',
            stats: {
              totalQuizzes: 3,
              totalQuestions: 45,
              correctAnswers: 38,
              studyTime: 1800
            }
          }
        }
      });
      return;
    }

    // 创建题库
    if (path === '/api/quizzes' && method === 'POST') {
      const body = await parseBody(req);
      sendJson(res, {
        success: true,
        message: '题库创建成功',
        data: {
          quiz: {
            _id: 'demo-quiz-id',
            title: body.title,
            description: body.description,
            status: 'draft',
            stats: {
              totalQuestions: 0
            },
            createdAt: new Date().toISOString()
          }
        }
      });
      return;
    }

    // 获取题库列表
    if (path === '/api/quizzes' && method === 'GET') {
      sendJson(res, {
        success: true,
        data: {
          quizzes: [
            {
              _id: 'demo-quiz-1',
              title: '数学基础练习',
              description: '包含基础数学题目',
              status: 'completed',
              stats: {
                totalQuestions: 20
              },
              createdAt: new Date(Date.now() - 86400000).toISOString()
            },
            {
              _id: 'demo-quiz-2',
              title: '英语词汇测试',
              description: '常用英语词汇练习',
              status: 'completed',
              stats: {
                totalQuestions: 15
              },
              createdAt: new Date(Date.now() - 172800000).toISOString()
            }
          ],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 2,
            itemsPerPage: 10
          }
        }
      });
      return;
    }

    // 验证API密钥
    if (path === '/api/ai/validate-key' && method === 'POST') {
      sendJson(res, {
        success: true,
        data: {
          isValid: true,
          message: 'API密钥有效'
        }
      });
      return;
    }

    // 解析题库
    if (path === '/api/ai/parse-quiz' && method === 'POST') {
      sendJson(res, {
        success: true,
        message: '解析任务已启动',
        data: {
          taskId: 'demo-task-id',
          status: 'processing',
          progress: 0
        }
      });
      return;
    }

    // 获取解析状态
    if (path.startsWith('/api/ai/parse-status/') && method === 'GET') {
      const taskId = path.split('/').pop();
      sendJson(res, {
        success: true,
        data: {
          taskId: taskId,
          status: 'completed',
          progress: 100,
          quiz: {
            title: '演示题库',
            status: 'completed',
            totalQuestions: 10
          }
        }
      });
      return;
    }

    // 404 - 路由不存在
    sendJson(res, {
      success: false,
      message: `路由 ${path} 不存在`
    }, 404);

  } catch (error) {
    console.error('服务器错误:', error);
    sendJson(res, {
      success: false,
      message: '服务器内部错误'
    }, 500);
  }
});

// 启动服务器
server.listen(PORT, () => {
  console.log(`🚀 演示服务器启动成功: http://localhost:${PORT}`);
  console.log('📋 可用的API端点:');
  console.log(`  POST   http://localhost:${PORT}/api/auth/register`);
  console.log(`  POST   http://localhost:${PORT}/api/auth/login`);
  console.log(`  GET    http://localhost:${PORT}/api/auth/me`);
  console.log(`  POST   http://localhost:${PORT}/api/quizzes`);
  console.log(`  GET    http://localhost:${PORT}/api/quizzes`);
  console.log(`  POST   http://localhost:${PORT}/api/ai/validate-key`);
  console.log(`  POST   http://localhost:${PORT}/api/ai/parse-quiz`);
  console.log(`  GET    http://localhost:${PORT}/health`);
});
