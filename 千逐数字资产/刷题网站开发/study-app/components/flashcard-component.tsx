"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

const sampleQuestions = [
  {
    id: 1,
    question: "什么是函数的导数？",
    answer:
      "函数的导数是函数在某一点的瞬时变化率，表示函数图像在该点切线的斜率。导数的定义为：f'(x) = lim(h→0) [f(x+h) - f(x)] / h",
  },
  {
    id: 2,
    question: "请解释牛顿第二定律。",
    answer:
      "牛顿第二定律表述为：物体的加速度与作用在物体上的合外力成正比，与物体的质量成反比。数学表达式为 F = ma，其中F是合外力，m是物体质量，a是加速度。",
  },
  {
    id: 3,
    question: "什么是DNA？",
    answer:
      "DNA（脱氧核糖核酸）是携带遗传信息的生物大分子，由四种碱基（A、T、G、C）组成，具有双螺旋结构。DNA存储了生物体的遗传信息，是生命的基础。",
  },
]

export function FlashcardComponent() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  const currentQuestion = sampleQuestions[currentIndex]

  const handleNext = () => {
    if (currentIndex < sampleQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setIsFlipped(false)
    }
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold mb-2">在线刷题</h2>
        <p className="text-gray-600">
          问题 {currentIndex + 1} / {sampleQuestions.length}
        </p>
      </div>

      <div className="perspective-1000 mb-6">
        <div
          className={`relative w-full h-80 transition-transform duration-700 transform-style-preserve-3d ${
            isFlipped ? "rotate-y-180" : ""
          }`}
        >
          {/* 正面 - 问题 */}
          <Card className={`absolute inset-0 backface-hidden ${isFlipped ? "rotate-y-180" : ""}`}>
            <CardContent className="p-8 h-full flex flex-col justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-4">
                  问题 {currentIndex + 1}/{sampleQuestions.length}
                </div>
                <div className="text-lg leading-relaxed">{currentQuestion.question}</div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleFlip} className="bg-blue-600 hover:bg-blue-700">
                  显示答案
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 背面 - 答案 */}
          <Card className={`absolute inset-0 backface-hidden rotate-y-180 ${isFlipped ? "rotate-y-0" : ""}`}>
            <CardContent className="p-8 h-full flex flex-col justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-4">答案</div>
                <div className="text-lg leading-relaxed">{currentQuestion.answer}</div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleFlip} variant="outline">
                  返回问题
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 导航按钮 */}
      <div className="flex justify-between items-center">
        <Button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          variant="outline"
          className="flex items-center space-x-2 bg-transparent"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>上一题</span>
        </Button>

        <div className="flex space-x-2">
          {sampleQuestions.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index)
                setIsFlipped(false)
              }}
              className={`w-3 h-3 rounded-full ${index === currentIndex ? "bg-blue-600" : "bg-gray-300"}`}
            />
          ))}
        </div>

        <Button
          onClick={handleNext}
          disabled={currentIndex === sampleQuestions.length - 1}
          variant="outline"
          className="flex items-center space-x-2 bg-transparent"
        >
          <span>下一题</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
