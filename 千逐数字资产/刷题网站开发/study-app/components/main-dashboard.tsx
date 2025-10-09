"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { LeftSidebar } from "@/components/left-sidebar"
import { RightContent } from "@/components/right-content"
import { SmartParsingPage } from "@/components/smart-parsing-page"
import { QuizLibrary } from "@/components/quiz-library"
import { QuizPreview } from "@/components/quiz-preview"
import { ApiKeyDialog } from "@/components/api-key-dialog"
import { ProfileDialog } from "@/components/profile-dialog"
import { ContactAuthorDialog } from "@/components/contact-author-dialog"
import { DonationDialog } from "@/components/donation-dialog"

interface MainDashboardProps {
  onLogout: () => void
  userEmail?: string // 用户登录邮箱
}

export interface QuestionBank {
  id: string
  title: string
  content: string
  createdAt: Date
  questionCount: number
}

export interface ParsedQuestion {
  id: string
  question: string
  answer: string
  type: "multiple-choice" | "short-answer" | "essay"
  options?: string[]
}

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

export function MainDashboard({ onLogout, userEmail = "user@example.com" }: MainDashboardProps) {
  const [showApiDialog, setShowApiDialog] = useState(false)
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [showContactDialog, setShowContactDialog] = useState(false)
  const [showDonationDialog, setShowDonationDialog] = useState(false)
  const [currentView, setCurrentView] = useState<"dashboard" | "smart-parsing" | "quiz-library">("dashboard")
  const [previewQuiz, setPreviewQuiz] = useState<QuizLibraryItem | null>(null)
  
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([
    {
      id: "1",
      title: "高等数学题库",
      content: "这是高等数学的题库内容...",
      createdAt: new Date("2024-01-15"),
      questionCount: 45,
    },
    {
      id: "2",
      title: "英语词汇题库",
      content: "这是英语词汇的题库内容...",
      createdAt: new Date("2024-01-10"),
      questionCount: 120,
    },
  ])
  const [selectedQuestionBank, setSelectedQuestionBank] = useState<QuestionBank | null>(null)
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  const handleCreateQuestionBank = (title: string, content: string) => {
    const newBank: QuestionBank = {
      id: Date.now().toString(),
      title,
      content,
      createdAt: new Date(),
      questionCount: Math.floor(Math.random() * 50) + 10,
    }
    setQuestionBanks([newBank, ...questionBanks])
    setSelectedQuestionBank(newBank)

    const mockQuestions: ParsedQuestion[] = [
      {
        id: "1",
        question: "什么是函数的导数？",
        answer: "函数的导数是函数在某一点的瞬时变化率，表示函数图像在该点切线的斜率。",
        type: "short-answer",
      },
      {
        id: "2",
        question: "下列哪个是正确的导数公式？",
        answer: "d/dx(x²) = 2x",
        type: "multiple-choice",
        options: ["d/dx(x²) = x", "d/dx(x²) = 2x", "d/dx(x²) = x²", "d/dx(x²) = 2"],
      },
    ]
    setParsedQuestions(mockQuestions)
    setCurrentQuestionIndex(0)
  }

  const handleSelectQuestionBank = (bank: QuestionBank) => {
    setSelectedQuestionBank(bank)
    const mockQuestions: ParsedQuestion[] = [
      {
        id: "1",
        question: `来自 ${bank.title} 的示例问题`,
        answer: `这是 ${bank.title} 的示例答案`,
        type: "short-answer",
      },
    ]
    setParsedQuestions(mockQuestions)
    setCurrentQuestionIndex(0)
  }

  const handleCreateNewQuiz = () => {
    setCurrentView("smart-parsing")
  }

  const handlePreviewQuiz = (quiz: QuizLibraryItem) => {
    setPreviewQuiz(quiz)
  }

  const handleClosePreview = () => {
    setPreviewQuiz(null)
  }

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
    }
  }

  const handleSmartParsingClick = () => {
    setCurrentView("smart-parsing")
  }

  const handleQuizLibraryClick = () => {
    setCurrentView("quiz-library")
  }

  const handleBackToDashboard = () => {
    setCurrentView("dashboard")
  }

  if (currentView === "smart-parsing") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onLogout={onLogout}
          onOpenApiDialog={() => setShowApiDialog(true)}
          onOpenProfileDialog={() => setShowProfileDialog(true)}
          onOpenContactDialog={() => setShowContactDialog(true)}
          onOpenDonationDialog={() => setShowDonationDialog(true)}
          showBackButton={true}
          onBack={handleBackToDashboard}
          userEmail={userEmail}
        />

        <SmartParsingPage />

        <ApiKeyDialog open={showApiDialog} onOpenChange={setShowApiDialog} />
        <ProfileDialog
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          loginEmail={userEmail}
        />
        <ContactAuthorDialog open={showContactDialog} onOpenChange={setShowContactDialog} />
        <DonationDialog open={showDonationDialog} onOpenChange={setShowDonationDialog} />
      </div>
    )
  }

  if (currentView === "quiz-library") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onLogout={onLogout}
          onOpenApiDialog={() => setShowApiDialog(true)}
          onOpenProfileDialog={() => setShowProfileDialog(true)}
          onOpenContactDialog={() => setShowContactDialog(true)}
          onOpenDonationDialog={() => setShowDonationDialog(true)}
          showBackButton={true}
          onBack={handleBackToDashboard}
          userEmail={userEmail}
        />

        <div className="p-6">
          {previewQuiz ? (
            <QuizPreview
              htmlContent={previewQuiz.htmlContent || ""}
              title={previewQuiz.title}
              onDownload={() => downloadQuiz(previewQuiz)}
              onClose={handleClosePreview}
            />
          ) : (
            <QuizLibrary
              onCreateNew={handleCreateNewQuiz}
              onPreview={handlePreviewQuiz}
            />
          )}
        </div>

        <ApiKeyDialog open={showApiDialog} onOpenChange={setShowApiDialog} />
        <ProfileDialog
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          loginEmail={userEmail}
        />
        <ContactAuthorDialog open={showContactDialog} onOpenChange={setShowContactDialog} />
        <DonationDialog open={showDonationDialog} onOpenChange={setShowDonationDialog} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onLogout={onLogout}
        onOpenApiDialog={() => setShowApiDialog(true)}
        onOpenProfileDialog={() => setShowProfileDialog(true)}
        onOpenContactDialog={() => setShowContactDialog(true)}
        onOpenDonationDialog={() => setShowDonationDialog(true)}
        userEmail={userEmail}
      />

      <div className="flex h-[calc(100vh-64px)]">
        <LeftSidebar
          questionBanks={questionBanks}
          selectedQuestionBank={selectedQuestionBank}
          onCreateQuestionBank={handleCreateQuestionBank}
          onSelectQuestionBank={handleSelectQuestionBank}
          onSmartParsingClick={handleSmartParsingClick}
          onQuizLibraryClick={handleQuizLibraryClick}
        />

        <RightContent
          selectedQuestionBank={selectedQuestionBank}
          parsedQuestions={parsedQuestions}
          currentQuestionIndex={currentQuestionIndex}
          onQuestionIndexChange={setCurrentQuestionIndex}
        />
      </div>

      <ApiKeyDialog open={showApiDialog} onOpenChange={setShowApiDialog} />
      <ProfileDialog 
        open={showProfileDialog} 
        onOpenChange={setShowProfileDialog}
        loginEmail={userEmail}
      />
      <ContactAuthorDialog open={showContactDialog} onOpenChange={setShowContactDialog} />
      <DonationDialog open={showDonationDialog} onOpenChange={setShowDonationDialog} />
    </div>
  )
}
