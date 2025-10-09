"use client"

import { useEffect, useState } from "react"

interface InkWashSplashProps {
  onComplete: () => void
}

export function InkWashSplash({ onComplete }: InkWashSplashProps) {
  const [animationPhase, setAnimationPhase] = useState(0)

  useEffect(() => {
    const phases = [
      { delay: 500, phase: 1 },
      { delay: 1200, phase: 2 },
      { delay: 2000, phase: 3 },
      { delay: 2800, phase: 4 },
    ]

    phases.forEach(({ delay, phase }) => {
      setTimeout(() => setAnimationPhase(phase), delay)
    })

    setTimeout(onComplete, 3800)
  }, [onComplete])

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: "#F5F2E9" }}>
      {/* 水墨背景层 */}
      <div className="absolute inset-0">
        {/* 主要墨迹笔触 - 剑痕效果 */}
        <div
          className={`absolute top-1/4 left-1/3 w-96 h-2 transition-all duration-1500 ease-out ${
            animationPhase >= 1 ? "opacity-60 scale-x-100" : "opacity-0 scale-x-0"
          }`}
          style={{
            background: `linear-gradient(90deg, transparent 0%, #1A1A1A 20%, #1A1A1A 80%, transparent 100%)`,
            transform: "rotate(-15deg)",
            transformOrigin: "left center",
          }}
        />

        {/* 第二道剑痕 */}
        <div
          className={`absolute top-1/2 right-1/4 w-80 h-1 transition-all duration-1200 ease-out delay-300 ${
            animationPhase >= 2 ? "opacity-40 scale-x-100" : "opacity-0 scale-x-0"
          }`}
          style={{
            background: `linear-gradient(90deg, transparent 0%, #1A1A1A 30%, #1A1A1A 70%, transparent 100%)`,
            transform: "rotate(25deg)",
            transformOrigin: "right center",
          }}
        />

        {/* 第三道剑痕 */}
        <div
          className={`absolute bottom-1/3 left-1/5 w-64 h-1 transition-all duration-1000 ease-out delay-600 ${
            animationPhase >= 3 ? "opacity-30 scale-x-100" : "opacity-0 scale-x-0"
          }`}
          style={{
            background: `linear-gradient(90deg, transparent 0%, #1A1A1A 40%, #1A1A1A 60%, transparent 100%)`,
            transform: "rotate(-35deg)",
            transformOrigin: "left center",
          }}
        />

        {/* 墨点飞溅效果 */}
        <div
          className={`absolute top-1/3 left-2/5 w-3 h-3 rounded-full transition-all duration-800 ease-out delay-400 ${
            animationPhase >= 2 ? "opacity-50 scale-100" : "opacity-0 scale-0"
          }`}
          style={{ backgroundColor: "#1A1A1A" }}
        />

        <div
          className={`absolute top-2/5 left-1/2 w-2 h-2 rounded-full transition-all duration-600 ease-out delay-700 ${
            animationPhase >= 3 ? "opacity-40 scale-100" : "opacity-0 scale-0"
          }`}
          style={{ backgroundColor: "#1A1A1A" }}
        />

        <div
          className={`absolute bottom-2/5 right-2/5 w-4 h-4 rounded-full transition-all duration-700 ease-out delay-900 ${
            animationPhase >= 3 ? "opacity-35 scale-100" : "opacity-0 scale-0"
          }`}
          style={{ backgroundColor: "#1A1A1A" }}
        />

        <div
          className={`absolute top-3/5 right-1/3 w-1 h-1 rounded-full transition-all duration-500 ease-out delay-1100 ${
            animationPhase >= 4 ? "opacity-60 scale-100" : "opacity-0 scale-0"
          }`}
          style={{ backgroundColor: "#1A1A1A" }}
        />

        {/* 动态墨滴效果 */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 rounded-full transition-all duration-1000 ease-out ${
              animationPhase >= 2 ? "opacity-30 animate-float-ink" : "opacity-0"
            }`}
            style={{
              backgroundColor: "#1A1A1A",
              left: `${20 + i * 8}%`,
              top: `${30 + (i % 3) * 15}%`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}

        {/* 宣纸纹理效果 */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23D4C4A8' fillOpacity='0.1'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* 中心文字 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <h1
            className={`text-5xl md:text-7xl font-light mb-6 transition-all duration-1500 delay-800 ${
              animationPhase >= 2 ? "opacity-100 transform translate-y-0" : "opacity-0 transform translate-y-8"
            }`}
            style={{
              fontFamily: "'Times New Roman', Georgia, serif",
              color: "#1A1A1A",
              textShadow: "2px 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            智能题库
          </h1>

          {/* 印章效果 */}
          <div
            className={`inline-block px-4 py-2 border-2 transition-all duration-1000 delay-1200 ${
              animationPhase >= 3 ? "opacity-100 transform scale-100" : "opacity-0 transform scale-0"
            }`}
            style={{
              borderColor: "#B93A32",
              backgroundColor: "rgba(185, 58, 50, 0.1)",
              transform: "rotate(-2deg)",
            }}
          >
            <span
              className="text-lg font-medium"
              style={{
                color: "#B93A32",
                fontFamily: "'Times New Roman', Georgia, serif",
              }}
            >
              墨隐侠踪
            </span>
          </div>

          {/* 加载指示器 */}
          <div
            className={`mt-8 flex justify-center transition-all duration-500 delay-1800 ${
              animationPhase >= 4 ? "opacity-60" : "opacity-0"
            }`}
          >
            <div className="flex space-x-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{
                    backgroundColor: "#1A1A1A",
                    animationDelay: `${i * 0.3}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
