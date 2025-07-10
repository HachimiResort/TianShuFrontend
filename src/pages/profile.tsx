"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Phone, Shield, Edit, Save, X } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"


// 模拟用户数据
const mockUser = {
  username: "张三",
  email: "zhangsan@example.com",
  phone: "138****8888", // 可能为空
  role: "admin", // "user" | "admin"
  avatar: "/placeholder.svg?height=100&width=100",
  joinDate: "2024-01-15",
  lastLogin: "2024-12-10 14:30:25",
}

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(mockUser)

  const handleSave = () => {
    // 这里可以调用API保存数据
    console.log("保存用户信息:", formData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setFormData(mockUser)
    setIsEditing(false)
  }

  const getRoleBadge = (role: string) => {
    if (role === "admin") {
      return (
        <Badge variant="destructive" className="transition-colors duration-500">
          <Shield className="w-3 h-3 mr-1" />
          管理员
        </Badge>
      )
    }
    return (
      <Badge
        variant="secondary"
        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 transition-colors duration-300"
      >
        <User className="w-3 h-3 mr-1" />
        普通用户
      </Badge>
    )
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in-0 duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight transition-colors duration-300">个人信息</h1>
        <p className="text-muted-foreground transition-colors duration-300">管理您的个人资料和账户设置</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* 用户头像和基本信息 */}
        <Card className="md:col-span-1 hover:shadow-lg animate-in slide-in-from-left-4 transition-colors duration-300">
          <CardHeader className="text-center">
            <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4 transition-colors duration-300">
              <User className="w-12 h-12 text-muted-foreground transition-colors duration-300" />
            </div>
            <CardTitle className="text-xl transition-colors duration-300">{formData.username}</CardTitle>
            <CardDescription className="transition-colors duration-300">{formData.email}</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {getRoleBadge(formData.role)}
            <Separator className="transition-colors duration-300" />
            <div className="space-y-2 text-sm text-muted-foreground transition-colors duration-300">
              <p>加入时间: {formData.joinDate}</p>
              <p>最后登录: {formData.lastLogin}</p>
            </div>
          </CardContent>
        </Card>

        {/* 详细信息编辑 */}
        <Card className="md:col-span-2 hover:shadow-lg animate-in slide-in-from-right-4 transition-colors duration-300">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="transition-colors duration-300">账户详情</CardTitle>
              <CardDescription className="transition-colors duration-300">编辑您的个人信息</CardDescription>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="transition-colors duration-300"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  编辑
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    className="transition-colors duration-300 bg-transparent"
                  >
                    <X className="w-4 h-4 mr-2" />
                    取消
                  </Button>
                  <Button size="sm" onClick={handleSave} className="transition-colors duration-300">
                    <Save className="w-4 h-4 mr-2" />
                    保存
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="username"
                  className="flex items-center gap-2 transition-colors duration-300"
                >
                  <User className="w-4 h-4" />
                  用户名
                </Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!isEditing}
                  className="transition-colors duration-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 transition-colors duration-300">
                  <Mail className="w-4 h-4" />
                  邮箱地址
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                  className="transition-colors duration-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2 transition-colors duration-300">
                  <Phone className="w-4 h-4" />
                  绑定手机
                </Label>
                <Input
                  id="phone"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!isEditing}
                  placeholder={formData.phone ? formData.phone : "未绑定手机号"}
                  className="transition-colors duration-300"
                />
                {!formData.phone && (
                  <p className="text-sm text-muted-foreground transition-colors duration-300">
                    建议绑定手机号以提高账户安全性
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 transition-colors duration-300">
                  <Shield className="w-4 h-4" />
                  用户权限
                </Label>
                <div className="flex items-center gap-2">
                  {getRoleBadge(formData.role)}
                  <span className="text-sm text-muted-foreground transition-colors duration-300">
                    {formData.role === "admin" ? "拥有系统管理权限" : "普通用户权限"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
