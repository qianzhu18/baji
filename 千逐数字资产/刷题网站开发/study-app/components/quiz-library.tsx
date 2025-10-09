"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  BookOpen, 
  Search, 
  Calendar, 
  FileText, 
  Download, 
  Eye, 
  Trash2,
  Plus,
  Filter,
  Clock,
  Target
} from "lucide-react"

interface QuizLibraryItem {
  id: string
  title: string
  description?: string
  questionCount: number
  createdAt: Date
  lastAccessedAt?: Date
  htmlContent?: string
  tags?: string[]
  difficulty?: 'easy' | 'medium' | 'hard'
}

interface QuizLibraryProps {
  onCreateNew: () => void
  onPreview: (quiz: QuizLibraryItem) => void
}

export function QuizLibrary({ onCreateNew, onPreview }: QuizLibraryProps) {
  const [quizzes, setQuizzes] = useState<QuizLibraryItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all")

  // 模拟数据 - 实际应用中应该从API获取
  useEffect(() => {
    const mockQuizzes: QuizLibraryItem[] = [
      {
        id: "1",
        title: "JavaScript基础测试",
        description: "涵盖JavaScript基本语法、变量、函数等核心概念",
        questionCount: 25,
        createdAt: new Date("2024-01-15"),
        lastAccessedAt: new Date("2024-01-20"),
        tags: ["JavaScript", "前端", "基础"],
        difficulty: "easy"
      },
      {
        id: "2",
        title: "React高级特性",
        description: "深入理解React Hooks、Context、性能优化等高级特性",
        questionCount: 18,
        createdAt: new Date("2024-01-10"),
        lastAccessedAt: new Date("2024-01-18"),
        tags: ["React", "前端", "高级"],
        difficulty: "hard"
      },
      {
        id: "3",
        title: "数据结构与算法",
        description: "常见数据结构和算法题目练习",
        questionCount: 32,
        createdAt: new Date("2024-01-08"),
        tags: ["算法", "数据结构", "编程"],
        difficulty: "medium"
      }
    ]
    setQuizzes(mockQuizzes)
  }, [])

  // 过滤题库
  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesDifficulty = filterDifficulty === "all" || quiz.difficulty === filterDifficulty
    
    return matchesSearch && matchesDifficulty
  })

  // 下载题库
  const downloadQuiz = (quiz: QuizLibraryItem) => {
    if (quiz.htmlContent) {
      const blob = new Blob([quiz.htmlContent], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${quiz.title}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } else {
      alert("该题库暂无可下载的内容")
    }
  }

  // 删除题库
  const deleteQuiz = (quizId: string) => {
    if (confirm("确定要删除这个题库吗？此操作不可恢复。")) {
      setQuizzes(quizzes.filter(q => q.id !== quizId))
    }
  }

  // 格式化日期
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // 获取难度颜色
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // 获取难度文本
  const getDifficultyText = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return '简单'
      case 'medium': return '中等'
      case 'hard': return '困难'
      default: return '未知'
    }
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BookOpen className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">我的题库</h1>
            <p className="text-gray-600">管理和使用您的智能题库</p>
          </div>
        </div>
        
        <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-5 w-5 mr-2" />
          创建新题库
        </Button>
      </div>

      {/* 搜索和过滤 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索题库标题、描述或标签..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">所有难度</option>
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 题库列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredQuizzes.map((quiz) => (
          <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg line-clamp-2">{quiz.title}</CardTitle>
                {quiz.difficulty && (
                  <Badge className={`text-xs ${getDifficultyColor(quiz.difficulty)}`}>
                    {getDifficultyText(quiz.difficulty)}
                  </Badge>
                )}
              </div>
              {quiz.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{quiz.description}</p>
              )}
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* 统计信息 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <span>{quiz.questionCount} 道题</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <span>{formatDate(quiz.createdAt)}</span>
                </div>
              </div>

              {/* 标签 */}
              {quiz.tags && quiz.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {quiz.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {quiz.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{quiz.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* 最后访问时间 */}
              {quiz.lastAccessedAt && (
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>最后使用: {formatDate(quiz.lastAccessedAt)}</span>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => onPreview(quiz)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  预览
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadQuiz(quiz)}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-1" />
                  下载
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteQuiz(quiz.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 空状态 */}
      {filteredQuizzes.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {searchTerm || filterDifficulty !== "all" ? "未找到匹配的题库" : "还没有题库"}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || filterDifficulty !== "all" 
                ? "尝试调整搜索条件或过滤器" 
                : "创建您的第一个智能题库开始学习吧"
              }
            </p>
            {(!searchTerm && filterDifficulty === "all") && (
              <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-5 w-5 mr-2" />
                创建新题库
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
