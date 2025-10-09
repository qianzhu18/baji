"use client"

import { useState } from "react"

interface SwordsmanIntroProps {
  onComplete: () => void
}

export function SwordsmanIntro({ onComplete }: SwordsmanIntroProps) {
  const [isClicked, setIsClicked] = useState(false)
  const [animationPhase, setAnimationPhase] = useState(0)

  const handleClick = () => {
    if (!isClicked) {
      setIsClicked(true)

      // 动画时序控制
      setTimeout(() => setAnimationPhase(1), 50) // 入字消散
      setTimeout(() => setAnimationPhase(2), 200) // 第一道剑痕
      setTimeout(() => setAnimationPhase(3), 400) // 第二道剑痕
      setTimeout(() => setAnimationPhase(4), 600) // 第三道剑痕
      setTimeout(() => setAnimationPhase(5), 800) // 第四道剑痕
      setTimeout(() => setAnimationPhase(6), 1000) // 墨点飞溅
      setTimeout(() => setAnimationPhase(7), 1200) // 完成切换
      setTimeout(onComplete, 1400)
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden cursor-pointer" onClick={handleClick}>
      {/* 黑色背景层 */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          animationPhase >= 7 ? "opacity-0" : "opacity-100"
        }`}
        style={{ backgroundColor: "#1A1A1A" }}
      />

      {/* 宣纸背景层（被剑痕切开后显现） */}
      <div className="absolute inset-0" style={{ backgroundColor: "#F5F2E9" }}>
        {/* 背景水墨装饰 */}
        <div className="absolute inset-0 pointer-events-none">
          {/* 淡墨渲染 */}
          <div
            className="absolute top-0 right-0 w-1/3 h-1/2 opacity-5"
            style={{
              background: `radial-gradient(ellipse at top right, #1A1A1A 0%, transparent 70%)`,
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-1/2 h-1/3 opacity-8"
            style={{
              background: `radial-gradient(ellipse at bottom left, #1A1A1A 0%, transparent 60%)`,
            }}
          />

          {/* 宣纸纹理 */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23D4C4A8' fillOpacity='0.3'%3E%3Cpath d='M9 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm48 25c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm-43-7c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm63 31c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM34 90c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>
      </div>

      {/* 剑痕遮罩层 */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 第一道剑痕 - 从左上到右下 */}
        <div
          className={`absolute transition-all duration-200 ease-out ${
            animationPhase >= 2 ? "sword-slash-1" : "opacity-0"
          }`}
          style={{
            top: "10%",
            left: "-20%",
            width: "140%",
            height: "8px",
            background: `linear-gradient(90deg, transparent 0%, #1A1A1A 20%, #1A1A1A 40%, rgba(26,26,26,0.8) 60%, rgba(26,26,26,0.4) 80%, transparent 100%)`,
            transform: "rotate(-25deg)",
            transformOrigin: "left center",
            clipPath: animationPhase >= 2 ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
          }}
        />

        {/* 第二道剑痕 - 从右上到左下 */}
        <div
          className={`absolute transition-all duration-200 ease-out ${
            animationPhase >= 3 ? "sword-slash-2" : "opacity-0"
          }`}
          style={{
            top: "25%",
            right: "-20%",
            width: "120%",
            height: "6px",
            background: `linear-gradient(90deg, transparent 0%, rgba(26,26,26,0.6) 15%, #1A1A1A 35%, #1A1A1A 65%, rgba(26,26,26,0.7) 85%, transparent 100%)`,
            transform: "rotate(30deg)",
            transformOrigin: "right center",
            clipPath: animationPhase >= 3 ? "inset(0 0 0 0)" : "inset(0 0 0 100%)",
          }}
        />

        {/* 第三道剑痕 - 垂直切割 */}
        <div
          className={`absolute transition-all duration-200 ease-out ${
            animationPhase >= 4 ? "sword-slash-3" : "opacity-0"
          }`}
          style={{
            top: "-10%",
            left: "60%",
            width: "4px",
            height: "120%",
            background: `linear-gradient(180deg, transparent 0%, rgba(26,26,26,0.5) 20%, #1A1A1A 50%, rgba(26,26,26,0.8) 80%, transparent 100%)`,
            transform: "rotate(-8deg)",
            transformOrigin: "center top",
            clipPath: animationPhase >= 4 ? "inset(0 0 0 0)" : "inset(100% 0 0 0)",
          }}
        />

        {/* 第四道剑痕 - 横向扫过 */}
        <div
          className={`absolute transition-all duration-200 ease-out ${
            animationPhase >= 5 ? "sword-slash-4" : "opacity-0"
          }`}
          style={{
            bottom: "30%",
            left: "-10%",
            width: "120%",
            height: "5px",
            background: `linear-gradient(90deg, transparent 0%, rgba(26,26,26,0.4) 25%, #1A1A1A 50%, rgba(26,26,26,0.6) 75%, transparent 100%)`,
            transform: "rotate(5deg)",
            transformOrigin: "left center",
            clipPath: animationPhase >= 5 ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
          }}
        />
      </div>

      {/* 墨点飞溅效果 */}
      {animationPhase >= 6 && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-ink-splash"
              style={{
                width: `${Math.random() * 6 + 2}px`,
                height: `${Math.random() * 6 + 2}px`,
                backgroundColor: "#1A1A1A",
                opacity: Math.random() * 0.6 + 0.2,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.05}s`,
                animationDuration: "0.8s",
              }}
            />
          ))}
        </div>
      )}

      {/* 中心的"入"字 */}
      {!isClicked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="text-8xl font-bold cursor-pointer select-none animate-breathe hover:scale-110 transition-transform duration-300"
            style={{
              color: "#B93A32",
              fontFamily: "'Times New Roman', Georgia, serif",
              textShadow: "0 0 20px rgba(185, 58, 50, 0.5)",
            }}
          >
            入
          </div>
        </div>
      )}

      {/* 入字消散效果 */}
      {isClicked && animationPhase >= 1 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="text-8xl font-bold animate-character-dissolve"
            style={{
              color: "#B93A32",
              fontFamily: "'Times New Roman', Georgia, serif",
            }}
          >
            入
          </div>
        </div>
      )}

      {/* 提示文字（仅在未点击时显示） */}
      {!isClicked && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
          <p
            className="text-sm opacity-60 animate-pulse"
            style={{
              color: "#B93A32",
              fontFamily: "'Times New Roman', Georgia, serif",
            }}
          >
            点击进入
          </p>
        </div>
      )}
    </div>
  )
}
