"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, Upload, User, Mail, AlertCircle } from "lucide-react"
import { useUserProfile } from "@/hooks/use-user-profile"

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loginEmail?: string // 登录时的邮箱，不可修改
}

export function ProfileDialog({ open, onOpenChange, loginEmail = "user@example.com" }: ProfileDialogProps) {
  const { profile, saveProfile } = useUserProfile(loginEmail)
  const [tempProfile, setTempProfile] = useState(profile)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 当dialog打开时，同步最新的profile数据
  useEffect(() => {
    if (open) {
      setTempProfile(profile)
      setUploadError("")
    }
  }, [open, profile])

  const handleSave = () => {
    // 验证表单
    if (!tempProfile.name.trim()) {
      setUploadError("请输入显示名称")
      return
    }
    
    if (!tempProfile.email.trim()) {
      setUploadError("请输入邮箱地址")
      return
    }

    // 邮箱必须和登录邮箱一致
    if (tempProfile.email !== loginEmail) {
      setUploadError("邮箱地址必须与登录邮箱一致")
      return
    }

    // 保存到全局状态和本地存储
    saveProfile(tempProfile)
    setUploadError("")
    onOpenChange(false)
  }

  const handleCancel = () => {
    setTempProfile(profile)
    setUploadError("")
    onOpenChange(false)
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setUploadError("请上传 JPG、PNG、GIF 或 WebP 格式的图片")
      return
    }

    // 检查文件大小 (最大 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("图片文件大小不能超过 5MB")
      return
    }

    setIsUploading(true)
    setUploadError("")

    try {
      // 创建本地预览URL
      const imageUrl = URL.createObjectURL(file)
      
      // 模拟上传过程
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setTempProfile({ ...tempProfile, avatar: imageUrl })
    } catch (error) {
      setUploadError("头像上传失败，请重试")
    } finally {
      setIsUploading(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md swordsman-card">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>个人资料设置</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col items-center space-y-4">
            <div className="relative group">
              <Avatar className="h-20 w-20 cursor-pointer transition-all group-hover:ring-4 group-hover:ring-blue-200" onClick={handleAvatarClick}>
                <AvatarImage src={tempProfile.avatar} alt={tempProfile.name} />
                <AvatarFallback className="text-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {tempProfile.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              {/* 头像上的相机图标遮罩 */}
              <div 
                className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={handleAvatarClick}
              >
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAvatarClick}
              disabled={isUploading}
              className="swordsman-button text-sm"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "上传中..." : "更换头像"}
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name" className="swordsman-label">
                显示名称
              </Label>
              <Input
                id="display-name"
                value={tempProfile.name}
                onChange={(e) => setTempProfile({ ...tempProfile, name: e.target.value })}
                placeholder="请输入您的显示名称"
                className="swordsman-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="swordsman-label">
                邮箱地址
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={tempProfile.email}
                  onChange={(e) => setTempProfile({ ...tempProfile, email: e.target.value })}
                  placeholder="请输入您的邮箱地址"
                  className="swordsman-input pl-10"
                  readOnly={tempProfile.email === loginEmail}
                />
              </div>
              <p className="text-sm text-gray-500">
                邮箱地址必须与登录邮箱一致
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCancel}>
              取消
            </Button>
            <Button onClick={handleSave} className="swordsman-button">
              保存更改
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
