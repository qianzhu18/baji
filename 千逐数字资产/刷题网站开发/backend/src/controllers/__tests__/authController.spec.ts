import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import authRoutes from '../../routes/v2/auth';

// Mock Prisma
jest.mock('@prisma/client');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaClient;

// Mock bcrypt
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Controller', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v2/auth', authRoutes);
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('POST /api/v2/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      // Mock Prisma responses
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null);
      mockPrisma.user.create = jest.fn().mockResolvedValue({
        id: '1',
        name: userData.name,
        email: userData.email,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Mock bcrypt
      mockBcrypt.hash = jest.fn().mockResolvedValue('hashedPassword');

      // Mock JWT
      mockJwt.sign = jest.fn().mockReturnValue('mock-token');

      const response = await request(app)
        .post('/api/v2/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('registered'),
        user: {
          id: '1',
          name: userData.name,
          email: userData.email
        }
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: userData.email }
      });
      expect(mockBcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should return error if user already exists', async () => {
      const userData = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'password123'
      };

      // Mock existing user
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
        id: '1',
        email: userData.email
      });

      const response = await request(app)
        .post('/api/v2/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('already exists')
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v2/auth/register')
        .send({
          name: 'Test User'
          // Missing email and password
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v2/auth/login', () => {
    it('should login user with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: '1',
        name: 'Test User',
        email: loginData.email,
        password: 'hashedPassword',
        emailVerified: true
      };

      // Mock Prisma and bcrypt
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);
      mockBcrypt.compare = jest.fn().mockResolvedValue(true);
      mockJwt.sign = jest.fn().mockReturnValue('mock-token');

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('successful'),
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email
        },
        token: 'mock-token'
      });

      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        loginData.password,
        mockUser.password
      );
    });

    it('should return error for invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      // Mock user not found
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Invalid')
      });
    });

    it('should return error for wrong password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const mockUser = {
        id: '1',
        email: loginData.email,
        password: 'hashedPassword'
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);
      mockBcrypt.compare = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v2/auth/me', () => {
    it('should return user profile with valid token', async () => {
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: true
      };

      // Mock JWT verification
      mockJwt.verify = jest.fn().mockReturnValue({ userId: '1' });
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/v2/auth/me')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email
        }
      });
    });

    it('should return error without token', async () => {
      const response = await request(app)
        .get('/api/v2/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.user.findUnique = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});
