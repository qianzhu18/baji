"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Heart, X } from "lucide-react"

interface DonationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DonationDialog({ open, onOpenChange }: DonationDialogProps) {
  const [activeTab, setActiveTab] = useState("wechat")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-red-500" />
              <span>打赏作者</span>
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
        
        <div className="py-4">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold mb-2">感谢您的支持</h3>
            <p className="text-sm text-gray-600">
              您的打赏是对作者最大的鼓励与支持
            </p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 swordsman-tabs">
              <TabsTrigger value="wechat" className="swordsman-tab">
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">💬</span>
                  <span>微信支付</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="alipay" className="swordsman-tab">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600">💰</span>
                  <span>支付宝</span>
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="wechat" className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <img
                    src="/微信支付.jpg"
                    alt="微信支付二维码"
                    className="w-56 h-56 object-contain"
                  />
                </div>
                <div className="text-center text-sm text-gray-500">
                  <p className="font-medium text-green-600 mb-1">微信扫码支付</p>
                  <p>千逐(**鸿)</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="alipay" className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <img
                    src="/支付宝支付.jpg"
                    alt="支付宝支付二维码"
                    className="w-56 h-56 object-contain"
                  />
                </div>
                <div className="text-center text-sm text-gray-500">
                  <p className="font-medium text-blue-600 mb-1">支付宝扫码支付</p>
                  <p>千逐(**鸿)</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 text-center">
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full swordsman-button"
            >
              关闭
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 