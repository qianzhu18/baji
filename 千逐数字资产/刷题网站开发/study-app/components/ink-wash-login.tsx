"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react"

interface InkWashLoginProps {
  onLogin: (email?: string) => void
}

export function InkWashLogin({ onLogin }: InkWashLoginProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: "", password: "" })
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "", confirmPassword: "" })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 页面加载时的淡入动画
    setTimeout(() => setIsVisible(true), 100)
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // 传递用户邮箱给父组件
    onLogin(loginForm.email || "user@example.com")
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    // 传递用户邮箱给父组件
    onLogin(registerForm.email || "user@example.com")
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: "#F5F2E9" }}>
      {/* 水墨背景艺术 */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 主要剑痕笔触 */}
        <div
          className="absolute top-1/6 left-1/4 w-96 h-3 opacity-40"
          style={{
            background: `linear-gradient(90deg, transparent 0%, #1A1A1A 15%, #1A1A1A 85%, transparent 100%)`,
            transform: "rotate(-12deg)",
            filter: "blur(0.5px)",
          }}
        />

        <div
          className="absolute top-1/3 right-1/5 w-80 h-2 opacity-30"
          style={{
            background: `linear-gradient(90deg, transparent 0%, #1A1A1A 20%, #1A1A1A 80%, transparent 100%)`,
            transform: "rotate(18deg)",
            filter: "blur(0.3px)",
          }}
        />

        <div
          className="absolute bottom-1/4 left-1/6 w-72 h-1 opacity-25"
          style={{
            background: `linear-gradient(90deg, transparent 0%, #1A1A1A 25%, #1A1A1A 75%, transparent 100%)`,
            transform: "rotate(-25deg)",
          }}
        />

        {/* 墨点飞溅 */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-float-ink"
            style={{
              width: `${Math.random() * 8 + 2}px`,
              height: `${Math.random() * 8 + 2}px`,
              backgroundColor: "#1A1A1A",
              opacity: Math.random() * 0.4 + 0.1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${Math.random() * 3 + 2}s`,
            }}
          />
        ))}

        {/* 宣纸纹理 */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23D4C4A8' fillOpacity='0.3'%3E%3Cpath d='M9 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm48 25c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm-43-7c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm63 31c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM34 90c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* 淡墨渲染效果 */}
        <div
          className="absolute top-0 right-0 w-1/3 h-1/2 opacity-5"
          style={{
            background: `radial-gradient(ellipse at top right, #1A1A1A 0%, transparent 70%)`,
          }}
        />

        <div
          className="absolute bottom-0 left-0 w-1/2 h-1/3 opacity-8"
          style={{
            background: `radial-gradient(ellipse at bottom left, #1A1A1A 0%, transparent 60%)`,
          }}
        />
      </div>

      {/* 主内容区域 */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div
          className={`w-full max-w-md transition-all duration-700 ease-out ${
            isVisible ? "opacity-100 transform translate-y-0" : "opacity-0 transform translate-y-4"
          }`}
        >
          {/* 标题区域 */}
          <div className="text-center mb-8">
            <h1
              className="text-4xl md:text-5xl font-light mb-4"
              style={{
                fontFamily: "'Times New Roman', Georgia, serif",
                color: "#1A1A1A",
                textShadow: "1px 1px 2px rgba(0,0,0,0.1)",
              }}
            >
              智能题库
            </h1>

            {/* 印章装饰 */}
            <div
              className="inline-block px-3 py-1 border-2 mb-2"
              style={{
                borderColor: "#B93A32",
                backgroundColor: "rgba(185, 58, 50, 0.1)",
                transform: "rotate(-1deg)",
              }}
            >
              <span
                className="text-sm font-medium"
                style={{
                  color: "#B93A32",
                  fontFamily: "'Times New Roman', Georgia, serif",
                }}
              >
                墨隐侠踪
              </span>
            </div>
          </div>

          {/* 登录表单卡片 */}
          <div className="swordsman-card">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 swordsman-tabs">
                <TabsTrigger value="login" className="swordsman-tab">
                  登录
                </TabsTrigger>
                <TabsTrigger value="register" className="swordsman-tab">
                  注册
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-5">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="swordsman-label">
                      邮箱地址
                    </Label>
                    <div className="relative">
                      <Mail
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                        style={{ color: "#A9A9A9" }}
                      />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="请输入您的邮箱"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        className="swordsman-input pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="swordsman-label">
                      密码
                    </Label>
                    <div className="relative">
                      <Lock
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                        style={{ color: "#A9A9A9" }}
                      />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="请输入您的密码"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        className="swordsman-input pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors"
                        style={{ color: "#A9A9A9" }}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full swordsman-button">
                    登录
                  </Button>
                </form>

                <div className="text-center">
                  <a href="#" className="swordsman-link text-sm">
                    忘记密码？
                  </a>
                </div>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name" className="swordsman-label">
                      姓名
                    </Label>
                    <div className="relative">
                      <User
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                        style={{ color: "#A9A9A9" }}
                      />
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="请输入您的姓名"
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                        className="swordsman-input pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="swordsman-label">
                      邮箱地址
                    </Label>
                    <div className="relative">
                      <Mail
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                        style={{ color: "#A9A9A9" }}
                      />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="请输入您的邮箱"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        className="swordsman-input pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="swordsman-label">
                      密码
                    </Label>
                    <div className="relative">
                      <Lock
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                        style={{ color: "#A9A9A9" }}
                      />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="请输入密码"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        className="swordsman-input pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="swordsman-label">
                      确认密码
                    </Label>
                    <div className="relative">
                      <Lock
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                        style={{ color: "#A9A9A9" }}
                      />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="请再次输入密码"
                        value={registerForm.confirmPassword}
                        onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                        className="swordsman-input pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full swordsman-button">
                    注册账号
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          {/* 底部信息 */}
          <div className="text-center mt-8">
            <p
              className="text-sm"
              style={{
                color: "#A9A9A9",
                fontFamily: "'Times New Roman', Georgia, serif",
              }}
            >
              欢迎加入千千君子的智能题库
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
