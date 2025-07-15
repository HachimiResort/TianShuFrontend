"use client"

import {useEffect, useState} from "react"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"
import {useLocation} from "react-router-dom";
import { toast } from "@/components/ui/use-toast"

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

  const location = useLocation();
  const { message, variant } = location.state || {};

  useEffect(() => {
    if (message) {
      toast({
        description: message,
        variant: variant,
        duration: 2000,
      })
    }
  }, [message, variant]);


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
