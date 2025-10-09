"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Brain, Plus, FileText, Calendar, Hash, BookOpen } from "lucide-react"
import { QuestionBank } from "./main-dashboard"

interface LeftSidebarProps {
  questionBanks: QuestionBank[]
  selectedQuestionBank: QuestionBank | null
  onCreateQuestionBank: (title: string, content: string) => void
  onSelectQuestionBank: (bank: QuestionBank) => void
  onSmartParsingClick: () => void
  onQuizLibraryClick?: () => void
}

export function LeftSidebar({
  questionBanks,
  selectedQuestionBank,
  onCreateQuestionBank,
  onSelectQuestionBank,
  onSmartParsingClick,
  onQuizLibraryClick,
}: LeftSidebarProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newBankTitle, setNewBankTitle] = useState("")
  const [newBankContent, setNewBankContent] = useState("")

  const handleCreateBank = () => {
    if (newBankTitle.trim() && newBankContent.trim()) {
      onCreateQuestionBank(newBankTitle.trim(), newBankContent.trim())
      setNewBankTitle("")
      setNewBankContent("")
      setShowCreateDialog(false)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 p-6">
      <div className="space-y-6">
        {/* 功能按钮 */}
        <div className="space-y-3">
          <Button
            onClick={onSmartParsingClick}
            className="w-full swordsman-button flex items-center justify-center space-x-2 py-3"
          >
            <Brain className="h-5 w-5" />
            <span>AI 智能解析</span>
          </Button>

          {onQuizLibraryClick && (
            <Button
              onClick={onQuizLibraryClick}
              variant="outline"
              className="w-full flex items-center justify-center space-x-2 py-3 border-2"
            >
              <BookOpen className="h-5 w-5" />
              <span>题库管理</span>
            </Button>
          )}

          <p className="text-xs text-gray-500 text-center">
            创建、管理和使用您的智能题库
          </p>
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">我的题库</h2>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="swordsman-button">
                  <Plus className="h-4 w-4 mr-1" />
                  新建
                </Button>
              </DialogTrigger>
              <DialogContent className="swordsman-card">
                <DialogHeader>
                  <DialogTitle>创建新题库</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="swordsman-label">题库标题</Label>
                    <Input
                      id="title"
                      value={newBankTitle}
                      onChange={(e) => setNewBankTitle(e.target.value)}
                      placeholder="请输入题库标题"
                      className="swordsman-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="content" className="swordsman-label">题库内容</Label>
                    <Textarea
                      id="content"
                      value={newBankContent}
                      onChange={(e) => setNewBankContent(e.target.value)}
                      placeholder="请输入题库内容..."
                      className="swordsman-input min-h-[200px]"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      取消
                    </Button>
                    <Button
                      onClick={handleCreateBank}
                      disabled={!newBankTitle.trim() || !newBankContent.trim()}
                      className="swordsman-button"
                    >
                      创建题库
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {questionBanks.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">暂无题库</p>
                  <p className="text-gray-400 text-xs mt-1">
                    点击"新建"或"AI 智能解析"创建题库
                  </p>
                </div>
              ) : (
                questionBanks.map((bank) => (
                  <Card
                    key={bank.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedQuestionBank?.id === bank.id
                        ? "ring-2 ring-blue-500 bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => onSelectQuestionBank(bank)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                            {bank.title}
                          </h3>
                          <div className="flex items-center space-x-3 text-xs text-gray-500">
                            <div className="flex items-center">
                              <Hash className="h-3 w-3 mr-1" />
                              <span>{bank.questionCount} 题</span>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>{formatDate(bank.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        {selectedQuestionBank?.id === bank.id && (
                          <Badge variant="secondary" className="ml-2">
                            当前
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
