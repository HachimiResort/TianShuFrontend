"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { Toast } from "@/components/ui/toast"
import { User, Lock } from "lucide-react"

interface LoginFormProps {
  onSwitchToRegister: () => void
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })
  const [showToast, setShowToast] = useState<{
    show: boolean
    message: string
    variant: "default" | "destructive" | "success"
  }>({ show: false, message: "", variant: "default" })

  const { login, loading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.username || !formData.password) {
      setShowToast({
        show: true,
        message: "请填写所有字段",
        variant: "destructive",
      })
      setTimeout(() => setShowToast((prev) => ({ ...prev, show: false })), 3000)
      return
    }

    const result = await login(formData)

    if (result.success) {
      setShowToast({
        show: true,
        message: "登录成功！",
        variant: "success",
      })
    } else {
      setShowToast({
        show: true,
        message: result.error || "登录失败",
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
            <User className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">欢迎回来</h2>
          <p className="text-muted-foreground">请登录您的账户</p>
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
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="请输入密码"
                value={formData.password}
                onChange={handleInputChange}
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "登录中..." : "登录"}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            还没有账户？{" "}
            <button type="button" onClick={onSwitchToRegister} className="text-primary hover:underline font-medium">
              立即注册
            </button>
          </p>
        </div>
      </Card>

      {showToast.show && <Toast variant={showToast.variant}>{showToast.message}</Toast>}
    </>
  )
}
