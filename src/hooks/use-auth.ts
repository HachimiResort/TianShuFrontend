"use client"

import { useState } from "react"
import { apiService } from "@/services/api"
import type { LoginRequest, RegisterRequest, User } from "@/types"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = async (credentials: LoginRequest) => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiService.login(credentials)

      if (response.success && response.data) {
        setUser(response.data.user)
        localStorage.setItem("token", response.data.token)
        return { success: true }
      } else {
        setError(response.error || "Login failed")
        return { success: false, error: response.error }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const register = async (userData: RegisterRequest) => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiService.register(userData)

      if (response.success && response.data) {
        setUser(response.data.user)
        localStorage.setItem("token", response.data.token)
        return { success: true }
      } else {
        setError(response.error || "Registration failed")
        return { success: false, error: response.error }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Registration failed"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("token")
  }

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
  }
}
