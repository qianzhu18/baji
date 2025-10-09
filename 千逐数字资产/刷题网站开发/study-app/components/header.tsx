"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings, User, LogOut, Key, Heart, MessageCircle, ArrowLeft } from "lucide-react"
import { useUserProfile } from "@/hooks/use-user-profile"

interface HeaderProps {
  onLogout: () => void
  onOpenApiDialog: () => void
  onOpenProfileDialog: () => void
  onOpenContactDialog: () => void
  onOpenDonationDialog: () => void
  showBackButton?: boolean
  onBack?: () => void
  userEmail?: string // 用户登录邮箱
}

export function Header({ 
  onLogout, 
  onOpenApiDialog, 
  onOpenProfileDialog,
  onOpenContactDialog,
  onOpenDonationDialog,
  showBackButton = false,
  onBack,
  userEmail
}: HeaderProps) {
  const { profile } = useUserProfile(userEmail)

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showBackButton && onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>返回</span>
            </Button>
          )}
          <h1 className="text-xl font-bold text-gray-900">智能题库系统</h1>
        </div>

        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenContactDialog}
            className="flex items-center space-x-2 bg-transparent swordsman-button text-sm px-3 py-2"
          >
            <MessageCircle className="h-4 w-4" />
            <span>联系作者</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenDonationDialog}
            className="flex items-center space-x-2 bg-transparent text-sm px-3 py-2"
            style={{
              background: "linear-gradient(135deg, #b93a32 0%, #a02e27 100%)",
              color: "#f5f2e9",
              borderColor: "#b93a32"
            }}
          >
            <Heart className="h-4 w-4" />
            <span>打赏作者</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenApiDialog}
            className="flex items-center space-x-2 bg-transparent"
          >
            <Key className="h-4 w-4" />
            <span>API 配置</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-3 px-3 py-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile.avatar} alt={profile.name} />
                  <AvatarFallback>{profile.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium">{profile.name}</p>
                  <p className="text-xs text-gray-500">{profile.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={onOpenProfileDialog}>
                <User className="mr-2 h-4 w-4" />
                <span>个人资料</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenApiDialog}>
                <Settings className="mr-2 h-4 w-4" />
                <span>设置</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenContactDialog}>
                <MessageCircle className="mr-2 h-4 w-4" />
                <span>联系作者</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenDonationDialog}>
                <Heart className="mr-2 h-4 w-4" />
                <span>打赏作者</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>退出登录</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
