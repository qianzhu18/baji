import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { app } from '../../app-v2';

describe('Quiz Workflow Integration Tests', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // 注册测试用户
    const registerResponse = await request(app)
      .post('/api/v2/auth/register')
      .send({
        name: 'Test User',
        email: 'test@integration.com',
        password: 'password123'
      });

    if (registerResponse.status === 201) {
      authToken = registerResponse.body.token;
      userId = registerResponse.body.user.id;
    }
  });

  describe('Complete Quiz Creation Workflow', () => {
    let uploadedFileId: string;
    let quizId: string;

    it('should upload a quiz file', async () => {
      // 创建测试文件
      const testQuizContent = `1. 什么是Node.js？
A. 前端框架
B. JavaScript运行时环境
C. 数据库
D. CSS预处理器
答案：B

2. Express.js是什么？
A. 数据库
B. Node.js Web框架
C. 前端库
D. 测试工具
答案：B

3. 什么是RESTful API？
A. 数据库设计模式
B. 前端架构
C. Web服务架构风格
D. 编程语言
答案：C`;

      const testFilePath = path.join(__dirname, 'test-quiz.txt');
      fs.writeFileSync(testFilePath, testQuizContent);

      const response = await request(app)
        .post('/api/v2/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath)
        .field('title', 'Node.js基础测试')
        .field('description', '测试Node.js基础知识')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.file).toBeDefined();
      uploadedFileId = response.body.file.id;

      // 清理测试文件
      fs.unlinkSync(testFilePath);
    });

    it('should parse the uploaded file', async () => {
      const response = await request(app)
        .post('/api/v2/quiz/parse')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fileId: uploadedFileId,
          orderMode: '顺序'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.quiz).toBeDefined();
      expect(response.body.quiz.questions).toHaveLength(3);
      quizId = response.body.quiz.id;
    });

    it('should retrieve quiz details', async () => {
      const response = await request(app)
        .get(`/api/v2/quiz/${quizId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.quiz).toMatchObject({
        id: quizId,
        title: 'Node.js基础测试',
        questions: expect.arrayContaining([
          expect.objectContaining({
            question: expect.stringContaining('Node.js'),
            options: expect.any(Array),
            correctAnswer: expect.any(String)
          })
        ])
      });
    });

    it('should list user quizzes', async () => {
      const response = await request(app)
        .get('/api/v2/quiz')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.quizzes).toBeInstanceOf(Array);
      expect(response.body.quizzes.length).toBeGreaterThan(0);
      
      const createdQuiz = response.body.quizzes.find((q: any) => q.id === quizId);
      expect(createdQuiz).toBeDefined();
    });

    it('should generate HTML preview', async () => {
      const response = await request(app)
        .post('/api/v2/quiz/generate-html')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quizId: quizId,
          orderMode: '顺序'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.html).toContain('<div class="quiz-container">');
      expect(response.body.html).toContain('Node.js');
    });

    it('should delete the quiz', async () => {
      const response = await request(app)
        .delete(`/api/v2/quiz/${quizId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });
  });

  describe('AI Service Integration', () => {
    it('should check AI service status', async () => {
      const response = await request(app)
        .get('/api/v2/ai/status')
        .expect(200);

      expect(response.body).toMatchObject({
        provider: expect.any(String),
        healthy: expect.any(Boolean),
        timestamp: expect.any(String)
      });
    });

    it('should validate API key', async () => {
      const response = await request(app)
        .get('/api/v2/ai/validate-key')
        .expect(200);

      expect(response.body).toMatchObject({
        valid: expect.any(Boolean),
        provider: expect.any(String),
        timestamp: expect.any(String)
      });
    });

    it('should test AI generation with mock provider', async () => {
      const response = await request(app)
        .post('/api/v2/ai/test-generation')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '# 测试题库\n\n1. 什么是AI？\nA. 人工智能\nB. 机器学习\n答案：A',
          provider: 'mock'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.html).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle unauthorized requests', async () => {
      const response = await request(app)
        .get('/api/v2/quiz')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid file uploads', async () => {
      const response = await request(app)
        .post('/api/v2/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('invalid content'), 'test.xyz')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle non-existent quiz requests', async () => {
      const response = await request(app)
        .get('/api/v2/quiz/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on AI endpoints', async () => {
      // 快速发送多个请求以触发速率限制
      const requests = Array(12).fill(null).map(() =>
        request(app)
          .get('/api/v2/ai/validate-key')
      );

      const responses = await Promise.all(requests);
      
      // 应该有一些请求被限制
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Data Validation', () => {
    it('should validate quiz creation data', async () => {
      const response = await request(app)
        .post('/api/v2/quiz/parse')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          orderMode: '顺序'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate user registration data', async () => {
      const response = await request(app)
        .post('/api/v2/auth/register')
        .send({
          name: 'Test',
          // Missing email and password
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  afterAll(async () => {
    // 清理测试数据
    if (userId) {
      // 删除测试用户创建的所有数据
      await request(app)
        .delete(`/api/v2/auth/user/${userId}`)
        .set('Authorization', `Bearer ${authToken}`);
    }
  });
});
