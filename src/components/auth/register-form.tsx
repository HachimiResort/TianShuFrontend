"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
// import { Toast } from "@/components/ui/toast"
import { User, Mail, Lock, UserPlus } from "lucide-react"

interface RegisterFormProps {
  onSwitchToLogin: () => void
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    region: "+86"
  })
  const [showToast, setShowToast] = useState<{
    show: boolean
    message: string
    variant: "default" | "destructive" | "success"
  }>({ show: false, message: "", variant: "default" })

  const { register, loading } = useAuth()

  const validateForm = () => {
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      return "请填写所有字段"
    }

    if (formData.password !== formData.confirmPassword) {
      return "密码和确认密码不匹配"
    }

    if (formData.password.length < 6) {
      return "密码长度至少为6位"
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      return "请输入有效的邮箱地址"
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setShowToast({
        show: true,
        message: validationError,
        variant: "destructive",
      })
      setTimeout(() => setShowToast((prev) => ({ ...prev, show: false })), 3000)
      return
    }

    const result = await register(formData)

    if (result.success) {
      setShowToast({
        show: true,
        message: "注册成功！",
        variant: "success",
      })
      setTimeout(() => {
        onSwitchToLogin()
      }, 1000)
    } else {
      setShowToast({
        show: true,
        message: result.error || "注册失败",
        variant: "destructive",
      })
    }

    setTimeout(() => setShowToast((prev) => ({ ...prev, show: false })), 3000)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  return (
    <>
      <Card className="w-full max-w-md p-8 space-y-6 bg-card text-card-foreground shadow-xl">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <UserPlus className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">创建账户</h2>
          <p className="text-muted-foreground">请填写以下信息注册</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="请输入用户名"
                value={formData.username}
                onChange={handleInputChange}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">邮箱地址</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="请输入邮箱地址"
                value={formData.email}
                onChange={handleInputChange}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="请输入密码（至少6位）"
                value={formData.password}
                onChange={handleInputChange}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认密码</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "创建中..." : "创建账户"}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            已有账户？{" "}
            <button type="button" onClick={onSwitchToLogin} className="text-primary hover:underline font-medium">
              立即登录
            </button>
          </p>
        </div>
      </Card>
      {showToast.show}
    </>
  )
}
