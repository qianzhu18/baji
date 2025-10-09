"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { User, X } from "lucide-react"

interface ContactAuthorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContactAuthorDialog({ open, onOpenChange }: ContactAuthorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>联系作者</span>
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-4">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold mb-2">扫码添加微信</h3>
            <p className="text-sm text-gray-600">
              有任何问题或建议，欢迎联系千逐
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <img
              src="/个人微信联系方式.jpg"
              alt="个人微信联系方式"
              className="w-64 h-64 object-contain"
            />
          </div>
          
          <div className="text-center text-sm text-gray-500">
            <p className="mb-1">千逐 (湖南·长沙)</p>
            <p>扫一扫上面的二维码图案，加我为朋友</p>
          </div>
          
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full swordsman-button"
          >
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 