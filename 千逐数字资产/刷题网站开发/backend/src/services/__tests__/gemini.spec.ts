import { GeminiProvider } from '../../providers/GeminiProvider';
import { AiProviderError, AI_ERROR_CODES } from '../../interfaces/IAiProvider';

// Mock Google Generative AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn()
    })
  }))
}));

describe('GeminiProvider', () => {
  let provider: GeminiProvider;
  let mockGenerateContent: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create provider instance with proper config
    provider = new GeminiProvider({
      apiKey: 'test-api-key',
      model: 'gemini-pro',
      timeout: 30000
    });

    // Get mock function reference
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const mockGenAI = new GoogleGenerativeAI();
    const mockModel = mockGenAI.getGenerativeModel();
    mockGenerateContent = mockModel.generateContent;
  });

  describe('validateKey', () => {
    it('should return valid=true for successful validation', async () => {
      // Mock successful response
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Test response'
        }
      });

      const result = await provider.validateKey('valid-api-key');

      expect(result.valid).toBe(true);
      expect(result.quota).toBeDefined();
      expect(mockGenerateContent).toHaveBeenCalledWith('Test validation prompt');
    });

    it('should return valid=false for invalid API key', async () => {
      // Mock API key error
      const error = new Error('API key not valid');
      error.message = '[400 Bad Request] API key not valid. Please pass a valid API key.';
      mockGenerateContent.mockRejectedValue(error);

      const result = await provider.validateKey('invalid-api-key');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('API key not valid');
    });

    it('should handle quota exceeded error', async () => {
      // Mock quota exceeded error
      const error = new Error('Quota exceeded');
      error.message = '[429] Quota exceeded';
      mockGenerateContent.mockRejectedValue(error);

      const result = await provider.validateKey('quota-exceeded-key');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Quota exceeded');
    });

    it('should handle rate limit error', async () => {
      // Mock rate limit error
      const error = new Error('Rate limit exceeded');
      error.message = '[429] Too many requests';
      mockGenerateContent.mockRejectedValue(error);

      const result = await provider.validateKey('rate-limited-key');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Rate limit exceeded');
    });

    it('should handle network errors', async () => {
      // Mock network error
      const error = new Error('Network error');
      error.message = 'fetch failed';
      mockGenerateContent.mockRejectedValue(error);

      const result = await provider.validateKey('network-error-key');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Network error');
    });
  });

  describe('generateQuizHtml', () => {
    it('should generate quiz HTML successfully', async () => {
      // Mock successful response
      const mockHtml = '<div class="quiz">Test Quiz</div>';
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => mockHtml
        }
      });

      const options = {
        content: '# Test Quiz\n\n1. What is AI?\nA. Artificial Intelligence\nB. Machine Learning\n\nAnswer: A',
        orderMode: '顺序' as const
      };
      const result = await provider.generateQuizHtml(options);

      expect(result.html).toBe(mockHtml);
      expect(result.metadata).toBeDefined();
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('should throw AiProviderError for invalid API key', async () => {
      // Mock API key error
      const error = new Error('API key not valid');
      error.message = '[400 Bad Request] API key not valid';
      mockGenerateContent.mockRejectedValue(error);

      const options = { content: 'Test content', orderMode: '顺序' as const };

      await expect(provider.generateQuizHtml(options)).rejects.toThrow(AiProviderError);
      await expect(provider.generateQuizHtml(options)).rejects.toThrow('API key is invalid');
    });

    it('should throw AiProviderError for quota exceeded', async () => {
      // Mock quota exceeded error
      const error = new Error('Quota exceeded');
      error.message = '[429] Quota exceeded';
      mockGenerateContent.mockRejectedValue(error);

      const options = { content: 'Test content', orderMode: '顺序' as const };

      await expect(provider.generateQuizHtml(options)).rejects.toThrow(AiProviderError);

      try {
        await provider.generateQuizHtml(options);
      } catch (error) {
        expect(error).toBeInstanceOf(AiProviderError);
        expect((error as AiProviderError).code).toBe(AI_ERROR_CODES.QUOTA_EXCEEDED);
      }
    });

    it('should handle basic error cases', async () => {
      // Mock error
      const error = new Error('Service error');
      mockGenerateContent.mockRejectedValue(error);

      const options = { content: 'Test content', orderMode: '顺序' as const };

      await expect(provider.generateQuizHtml(options)).rejects.toThrow(AiProviderError);
    });
  });

  describe('healthCheck', () => {
    it('should return true for healthy service', async () => {
      // Mock successful validation
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Test response'
        }
      });

      const result = await provider.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false for unhealthy service', async () => {
      // Mock error
      const error = new Error('Service unavailable');
      mockGenerateContent.mockRejectedValue(error);

      const result = await provider.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('provider properties', () => {
    it('should have correct name', () => {
      expect(provider.name).toBe('gemini');
    });
  });
});
