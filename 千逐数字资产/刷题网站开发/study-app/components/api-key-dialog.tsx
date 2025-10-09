"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle } from "lucide-react"

interface ApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ApiKeyDialog({ open, onOpenChange }: ApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState("")
  const [savedApiKey, setSavedApiKey] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [isValid, setIsValid] = useState<boolean | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem("gemini_api_key")
    if (saved) {
      setSavedApiKey(saved)
      setIsValid(true)
    }
  }, [])

  const handleSave = async () => {
    if (!apiKey.trim()) return

    setIsValidating(true)
    setIsValid(null)

    try {
      // 调用后端API验证密钥
      const response = await fetch('/api/ai/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: apiKey.trim() })
      })

      const result = await response.json()

      if (result.success) {
        // 验证成功，保存密钥
        localStorage.setItem("gemini_api_key", apiKey.trim())
        setSavedApiKey(apiKey.trim())
        setIsValid(true)
        setApiKey("")

        // 延迟关闭对话框，让用户看到成功状态
        setTimeout(() => {
          onOpenChange(false)
        }, 1000)
      } else {
        // 验证失败
        setIsValid(false)
      }
    } catch (error) {
      console.error('API密钥验证失败:', error)
      setIsValid(false)
    } finally {
      setIsValidating(false)
    }
  }

  const handleCancel = () => {
    setApiKey("")
    setIsValid(null)
    onOpenChange(false)
  }

  const handleRemove = () => {
    localStorage.removeItem("gemini_api_key")
    setSavedApiKey("")
    setIsValid(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>配置您的 Gemini API Key</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {savedApiKey && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800">API Key 已配置</span>
                </div>
                <Badge variant="outline" className="text-green-700 border-green-300">
                  有效
                </Badge>
              </div>
              <p className="text-xs text-green-600 mt-1">密钥: ****{savedApiKey.slice(-4)}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                className="mt-2 text-red-600 border-red-300 hover:bg-red-50 bg-transparent"
              >
                移除密钥
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="api-key">{savedApiKey ? "更新 Gemini API Key" : "您的 Gemini API Key"}</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="请输入您的 API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          {isValidating && (
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">正在验证 API Key...</span>
            </div>
          )}

          {isValid === false && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">API Key 无效，请检查后重试</span>
            </div>
          )}

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>隐私保护：</strong>我们不会存储您的密钥，它仅用于在您的浏览器和 Gemini
              服务之间进行题库解析，请放心使用。
            </p>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCancel}>
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={!apiKey.trim() || isValidating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isValidating ? "验证中..." : savedApiKey ? "更新" : "保存"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
