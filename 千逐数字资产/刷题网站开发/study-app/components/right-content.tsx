"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight, RotateCcw, CheckCircle, XCircle } from "lucide-react"
import type { QuestionBank, ParsedQuestion } from "./main-dashboard"

interface RightContentProps {
  selectedQuestionBank: QuestionBank | null
  parsedQuestions: ParsedQuestion[]
  currentQuestionIndex: number
  onQuestionIndexChange: (index: number) => void
}

export function RightContent({
  selectedQuestionBank,
  parsedQuestions,
  currentQuestionIndex,
  onQuestionIndexChange,
}: RightContentProps) {
  const [showAnswer, setShowAnswer] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set())

  const currentQuestion = parsedQuestions[currentQuestionIndex]
  const progress = parsedQuestions.length > 0 ? ((currentQuestionIndex + 1) / parsedQuestions.length) * 100 : 0

  const handleNext = () => {
    if (currentQuestionIndex < parsedQuestions.length - 1) {
      onQuestionIndexChange(currentQuestionIndex + 1)
      setShowAnswer(false)
      setSelectedOption(null)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      onQuestionIndexChange(currentQuestionIndex - 1)
      setShowAnswer(false)
      setSelectedOption(null)
    }
  }

  const handleShowAnswer = () => {
    setShowAnswer(true)
    setAnsweredQuestions((prev) => new Set([...prev, currentQuestionIndex]))
  }

  const handleReset = () => {
    setShowAnswer(false)
    setSelectedOption(null)
    onQuestionIndexChange(0)
    setAnsweredQuestions(new Set())
  }

  if (!selectedQuestionBank) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">选择题库开始学习</h3>
          <p className="text-gray-500">从左侧选择一个题库，或创建新的题库来开始您的学习之旅</p>
        </div>
      </div>
    )
  }

  if (parsedQuestions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <RotateCcw className="h-12 w-12 text-blue-600 animate-spin" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">正在解析题库</h3>
          <p className="text-gray-500">AI正在智能解析您的题库内容，请稍候...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedQuestionBank.title}</h2>
              <p className="text-gray-600">
                问题 {currentQuestionIndex + 1} / {parsedQuestions.length}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline">
                已完成: {answeredQuestions.size}/{parsedQuestions.length}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                重新开始
              </Button>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {currentQuestion.type === "multiple-choice" ? "选择题" : "问答题"}
              </CardTitle>
              {answeredQuestions.has(currentQuestionIndex) && <CheckCircle className="h-5 w-5 text-green-600" />}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-lg leading-relaxed">{currentQuestion.question}</div>

            {currentQuestion.type === "multiple-choice" && currentQuestion.options && !showAnswer && (
              <div className="space-y-2">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedOption(option)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedOption === option ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                    {option}
                  </button>
                ))}
              </div>
            )}

            {showAnswer && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">答案</span>
                </div>
                <div className="text-green-700 leading-relaxed">{currentQuestion.answer}</div>
                {selectedOption && currentQuestion.type === "multiple-choice" && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <div className="flex items-center">
                      {selectedOption === currentQuestion.answer ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 mr-2" />
                      )}
                      <span className="text-sm">您的答案: {selectedOption}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center pt-4">
              <Button variant="outline" onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                上一题
              </Button>

              {!showAnswer ? (
                <Button onClick={handleShowAnswer} className="bg-blue-600 hover:bg-blue-700">
                  显示答案
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={currentQuestionIndex === parsedQuestions.length - 1}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  下一题
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {parsedQuestions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onQuestionIndexChange(index)
                    setShowAnswer(false)
                    setSelectedOption(null)
                  }}
                  className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                    index === currentQuestionIndex
                      ? "border-blue-500 bg-blue-600 text-white"
                      : answeredQuestions.has(index)
                        ? "border-green-500 bg-green-100 text-green-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
