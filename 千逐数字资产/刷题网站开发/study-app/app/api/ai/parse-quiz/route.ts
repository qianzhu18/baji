import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type')

    let response: Response

    if (contentType?.includes('multipart/form-data')) {
      // 处理文件上传 - 使用新的转换端点
      const formData = await request.formData()

      // 从localStorage获取API密钥（这里需要从请求中获取）
      const apiKey = formData.get('apiKey') || request.headers.get('x-api-key')
      if (apiKey && typeof apiKey === 'string') {
        formData.set('apiKey', apiKey)
      }

      response = await fetch(`${BACKEND_URL}/api/ai/convert-quiz`, {
        method: 'POST',
        body: formData,
      })
    } else {
      // 处理JSON请求 - 文字粘贴模式
      const body = await request.json()

      // 确保包含API密钥
      if (!body.apiKey) {
        return NextResponse.json(
          { success: false, message: 'API密钥是必需的' },
          { status: 400 }
        )
      }

      response = await fetch(`${BACKEND_URL}/api/ai/convert-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    }

    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('API代理错误:', error)
    return NextResponse.json(
      { success: false, message: '服务器连接失败' },
      { status: 500 }
    )
  }
}
