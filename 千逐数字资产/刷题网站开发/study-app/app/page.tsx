"use client"

import { useState } from "react"
import { SwordsmanIntro } from "@/components/swordsman-intro"
import { InkWashLogin } from "@/components/ink-wash-login"
import { MainDashboard } from "@/components/main-dashboard"

export default function App() {
  const [currentView, setCurrentView] = useState<"intro" | "login" | "dashboard">("intro")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState("")

  const handleIntroComplete = () => {
    setCurrentView("login")
  }

  const handleLogin = (email?: string) => {
    setIsLoggedIn(true)
    setUserEmail(email || "user@example.com")
    setCurrentView("dashboard")
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUserEmail("")
    setCurrentView("login")
  }

  if (currentView === "intro") {
    return <SwordsmanIntro onComplete={handleIntroComplete} />
  }

  if (currentView === "login") {
    return <InkWashLogin onLogin={handleLogin} />
  }

  return <MainDashboard onLogout={handleLogout} userEmail={userEmail} />
}
