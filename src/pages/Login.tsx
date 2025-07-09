"use client"

import { useState } from "react"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"

export function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleSwitchToRegister = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setIsLogin(false)
      setIsAnimating(false)
    }, 150)
  }

  const handleSwitchToLogin = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setIsLogin(true)
      setIsAnimating(false)
    }, 150)
  }

  return (
    <div className="w-full max-w-md">
      <div
        className={`transition-all duration-300 ease-in-out ${
          isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        {isLogin ? (
          <LoginForm onSwitchToRegister={handleSwitchToRegister} />
        ) : (
          <RegisterForm onSwitchToLogin={handleSwitchToLogin} />
        )}
      </div>
    </div>
  )
}
