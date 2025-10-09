const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// API响应类型
interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

// 用户类型
interface User {
  _id: string
  name: string
  email: string
  avatar?: string
  role: string
}

// 题库类型
interface Quiz {
  _id: string
  title: string
  description?: string
  status: 'draft' | 'completed' | 'published'
  stats: {
    totalQuestions: number
  }
  createdAt: string
  updatedAt: string
}

// 解析任务类型
interface ParseTask {
  taskId: string
  status: 'processing' | 'completed' | 'failed'
  progress: number
  quiz?: Quiz
  error?: string
}

// API客户端类
class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
    this.token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  }

  // 设置认证token
  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
    }
  }

  // 清除认证token
  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  // 基础请求方法
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '请求失败')
      }

      return data
    } catch (error) {
      console.error('API请求错误:', error)
      throw error
    }
  }

  // GET请求
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  // POST请求
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // PUT请求
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // DELETE请求
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // 文件上传
  async uploadFile<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const formData = new FormData()
    
    formData.append('file', file)
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value)
      })
    }

    const headers: Record<string, string> = {}
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '文件上传失败')
      }

      return data
    } catch (error) {
      console.error('文件上传错误:', error)
      throw error
    }
  }

  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health')
      return response.success
    } catch {
      return false
    }
  }

  // 认证相关API
  auth = {
    // 用户注册
    register: async (data: { name: string; email: string; password: string }) => {
      const response = await this.post<{ token: string; user: User }>('/api/auth/register', data)
      if (response.data?.token) {
        this.setToken(response.data.token)
      }
      return response
    },

    // 用户登录
    login: async (data: { email: string; password: string }) => {
      const response = await this.post<{ token: string; user: User }>('/api/auth/login', data)
      if (response.data?.token) {
        this.setToken(response.data.token)
      }
      return response
    },

    // 用户登出
    logout: async () => {
      const response = await this.post('/api/auth/logout')
      this.clearToken()
      return response
    },

    // 获取当前用户信息
    me: async () => {
      return this.get<{ user: User }>('/api/auth/me')
    },

    // 忘记密码
    forgotPassword: async (email: string) => {
      return this.post('/api/auth/forgot-password', { email })
    },
  }

  // 题库相关API
  quiz = {
    // 获取题库列表
    list: async (params?: { page?: number; limit?: number }) => {
      const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : ''
      return this.get<{ quizzes: Quiz[]; pagination: any }>(`/api/quizzes${queryString}`)
    },

    // 获取单个题库
    get: async (id: string) => {
      return this.get<{ quiz: Quiz }>(`/api/quizzes/${id}`)
    },

    // 创建题库
    create: async (data: { title: string; description?: string }) => {
      return this.post<{ quiz: Quiz }>('/api/quizzes', data)
    },

    // 更新题库
    update: async (id: string, data: Partial<Quiz>) => {
      return this.put<{ quiz: Quiz }>(`/api/quizzes/${id}`, data)
    },

    // 删除题库
    delete: async (id: string) => {
      return this.delete(`/api/quizzes/${id}`)
    },
  }

  // AI解析相关API
  ai = {
    // 验证API密钥
    validateKey: async (apiKey: string) => {
      return this.post<{ isValid: boolean }>('/api/ai/validate-key', { apiKey })
    },

    // 解析题库文件
    parseQuiz: async (file: File, options: { questionOrder: '顺序' | '随机'; title: string }) => {
      return this.uploadFile<ParseTask>('/api/ai/parse-quiz', file, options)
    },

    // 解析文本内容
    parseText: async (content: string, options: { questionOrder: '顺序' | '随机'; title: string }) => {
      return this.post<ParseTask>('/api/ai/parse-quiz', {
        content,
        ...options,
      })
    },

    // 获取解析状态
    getParseStatus: async (taskId: string) => {
      return this.get<ParseTask>(`/api/ai/parse-status/${taskId}`)
    },
  }

  // 练习相关API
  practice = {
    // 创建练习会话
    createSession: async (quizId: string) => {
      return this.post('/api/practice/sessions', { quizId })
    },

    // 更新练习会话
    updateSession: async (sessionId: string, data: any) => {
      return this.put(`/api/practice/sessions/${sessionId}`, data)
    },

    // 完成练习
    completeSession: async (sessionId: string, results: any) => {
      return this.post(`/api/practice/sessions/${sessionId}/complete`, results)
    },

    // 获取练习历史
    getHistory: async () => {
      return this.get('/api/practice/history')
    },
  }
}

// 创建API客户端实例
export const apiClient = new ApiClient()

// 导出类型
export type { User, Quiz, ParseTask, ApiResponse }

// 便捷方法
export const api = {
  // 检查服务器连接
  checkConnection: async (): Promise<boolean> => {
    try {
      return await apiClient.healthCheck()
    } catch {
      return false
    }
  },

  // 设置认证token
  setAuthToken: (token: string) => {
    apiClient.setToken(token)
  },

  // 清除认证
  clearAuth: () => {
    apiClient.clearToken()
  },

  // 获取当前token
  getToken: (): string | null => {
    return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  },

  // 检查是否已登录
  isAuthenticated: (): boolean => {
    return !!api.getToken()
  },
}

export default apiClient 