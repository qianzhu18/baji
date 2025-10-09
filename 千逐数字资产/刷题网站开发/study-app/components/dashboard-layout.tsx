"use client"

import type { ReactNode } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { BookOpen, GraduationCap, LogOut, Settings, Plus } from "lucide-react"

interface DashboardLayoutProps {
  children?: ReactNode
  onLogout: () => void
  onStartParsing: () => void
  onConfigureApi: () => void
  onStartStudying: () => void
}

export function DashboardLayout({
  children,
  onLogout,
  onStartParsing,
  onConfigureApi,
  onStartStudying,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* 侧边栏 */}
      <div className="w-64 bg-gray-900 text-white flex flex-col">
        {/* 用户信息区域 */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src="/placeholder.svg?height=40&width=40" />
              <AvatarFallback>用户</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">user@example.com</p>
            </div>
          </div>
        </div>

        {/* 导航区域 */}
        <div className="flex-1 p-4">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300">我的题库</h3>
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-white h-6 w-6 p-0"
                onClick={onStartParsing}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <nav className="space-y-2">
              <button
                className="flex items-center space-x-3 w-full p-2 rounded hover:bg-gray-800 text-left"
                onClick={onStartStudying}
              >
                <BookOpen className="h-4 w-4" />
                <span className="text-sm">高等数学题库</span>
              </button>
              <button
                className="flex items-center space-x-3 w-full p-2 rounded hover:bg-gray-800 text-left"
                onClick={onStartStudying}
              >
                <GraduationCap className="h-4 w-4" />
                <span className="text-sm">英语词汇题库</span>
              </button>
            </nav>
          </div>

          <div className="mb-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
              onClick={onConfigureApi}
            >
              <Settings className="h-4 w-4 mr-3" />
              API 配置
            </Button>
          </div>
        </div>

        {/* 退出登录按钮 */}
        <div className="p-4 border-t border-gray-700">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4 mr-3" />
            退出登录
          </Button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-auto">
        {children || (
          <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">欢迎使用智能题库系统</h1>
            <p className="text-gray-600 mb-6">选择左侧的题库开始学习，或创建新的题库。</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">创建新题库</h3>
                <p className="text-gray-600 mb-4">上传您的学习材料，让AI帮您生成专属题库</p>
                <Button onClick={onStartParsing} className="bg-blue-600 hover:bg-blue-700">
                  开始创建
                </Button>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">学习统计</h3>
                <p className="text-gray-600 mb-4">查看您的学习进度和成绩统计</p>
                <Button variant="outline">查看详情</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
