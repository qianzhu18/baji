import { useState, useEffect, useCallback } from 'react'

export interface UserProfile {
  name: string
  email: string
  avatar: string
}

// 默认用户信息
const DEFAULT_PROFILE: UserProfile = {
  name: "张三",
  email: "user@example.com",
  avatar: "/placeholder.svg?height=32&width=32",
}

// 本地存储的键名
const PROFILE_STORAGE_KEY = 'user_profile'

// 全局状态管理 - 确保所有组件使用相同的状态
let globalProfile: UserProfile | null = null
const profileListeners = new Set<(profile: UserProfile) => void>()

const notifyProfileChange = (newProfile: UserProfile) => {
  globalProfile = newProfile
  profileListeners.forEach(listener => listener(newProfile))
}

export function useUserProfile(loginEmail?: string) {
  const [profile, setProfile] = useState<UserProfile>(() => {
    // 如果已有全局状态，直接使用
    if (globalProfile) {
      return globalProfile
    }

    // 从本地存储恢复用户信息
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(PROFILE_STORAGE_KEY)
        if (stored) {
          const parsedProfile = JSON.parse(stored)
          // 确保邮箱与登录邮箱一致
          if (loginEmail && parsedProfile.email !== loginEmail) {
            parsedProfile.email = loginEmail
          }
          globalProfile = parsedProfile
          return parsedProfile
        }
      } catch (error) {
        console.error('Failed to load user profile from localStorage:', error)
      }
    }

    // 返回默认配置，如果有登录邮箱则使用
    const defaultProfile = {
      ...DEFAULT_PROFILE,
      email: loginEmail || DEFAULT_PROFILE.email
    }
    globalProfile = defaultProfile
    return defaultProfile
  })

  // 注册监听器，当其他组件更新profile时同步更新
  useEffect(() => {
    const listener = (newProfile: UserProfile) => {
      setProfile(newProfile)
    }
    profileListeners.add(listener)

    return () => {
      profileListeners.delete(listener)
    }
  }, [])

  // 当登录邮箱变化时，更新profile的邮箱
  useEffect(() => {
    if (loginEmail && profile.email !== loginEmail) {
      const updatedProfile = { ...profile, email: loginEmail }
      setProfile(updatedProfile)
      notifyProfileChange(updatedProfile)
    }
  }, [loginEmail, profile.email])

  // 保存用户信息到本地存储
  const saveProfile = useCallback((newProfile: UserProfile) => {
    setProfile(newProfile)
    notifyProfileChange(newProfile)

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(newProfile))
      } catch (error) {
        console.error('Failed to save user profile to localStorage:', error)
      }
    }
  }, [])

  // 更新用户名
  const updateName = useCallback((name: string) => {
    const newProfile = { ...profile, name }
    saveProfile(newProfile)
  }, [profile, saveProfile])

  // 更新头像
  const updateAvatar = useCallback((avatar: string) => {
    const newProfile = { ...profile, avatar }
    saveProfile(newProfile)
  }, [profile, saveProfile])

  // 重置为默认值
  const resetProfile = useCallback(() => {
    const defaultProfile = {
      ...DEFAULT_PROFILE,
      email: loginEmail || DEFAULT_PROFILE.email
    }
    saveProfile(defaultProfile)
  }, [loginEmail, saveProfile])

  // 清除本地存储的用户信息
  const clearProfile = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PROFILE_STORAGE_KEY)
    }
    const defaultProfile = {
      ...DEFAULT_PROFILE,
      email: loginEmail || DEFAULT_PROFILE.email
    }
    setProfile(defaultProfile)
    notifyProfileChange(defaultProfile)
  }, [loginEmail])

  return {
    profile,
    saveProfile,
    updateName,
    updateAvatar,
    resetProfile,
    clearProfile,
  }
} 