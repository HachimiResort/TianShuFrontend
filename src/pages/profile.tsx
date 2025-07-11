"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Phone, Shield, Edit, Save, X } from "lucide-react"
import { useState, useEffect } from "react"
import { useUserInfo } from "@/hooks/use-auth"
import type {ApiResponse, UserInfoResponse} from "@/types";
import {apiService} from "@/services/api.ts";

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    role: "",
    avatar: "/placeholder.svg?height=100&width=100",
    joinDate: "",
    lastLogin: ""
  })

  const userid = localStorage.getItem("userid")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { userInfo, loading: userLoading, error: userError } = useUserInfo(userid || "")

  useEffect(() => {
    if (userLoading) {
      setLoading(true)
      return
    }

    if (userError) {
      setError(userError)
      setLoading(false)
      return
    }

    if (userInfo) {
      setFormData({
        username: userInfo.message.username,
        email: userInfo.message.email,
        phone: userInfo.message.phonenumber || "",
        role: userInfo.message.is_admin ? "admin" : "user",
        avatar: "/placeholder.svg?height=100&width=100",
        joinDate: "",
        lastLogin: ""
      })
      setLoading(false)
    }
  }, [userInfo, userLoading, userError])

  const handleSave = async () => {
    try {
      const body = {
        username: formData.username,
        email: formData.email,
        phonenumber: formData.phone
      };
      const response: ApiResponse<UserInfoResponse> = await apiService.put('/auth/updateProfile', body);
      if (response.success && response.data) {
        console.log("用户信息更新成功:", response.data);
        // 更新本地状态
        setFormData({
          ...formData,
          username: response.data.message.username,
          email: response.data.message.email,
          phone: response.data.message.phonenumber || ""
        });
      } else {
        setError(response.error || "更新用户信息失败");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "更新用户信息失败";
      setError(errorMessage);
    }
    setIsEditing(false);
  }

  const handleCancel = () => {
    // 重置为服务器数据
    if (userInfo) {
      setFormData({
        username: userInfo.message.username,
        email: userInfo.message.email,
        phone: userInfo.message.phonenumber || "",
        role: userInfo.message.is_admin ? "admin" : "user",
        avatar: "/placeholder.svg?height=100&width=100",
        joinDate: "",
        lastLogin: ""
      })
    }
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

  // 处理加载状态
  if (loading) {
    return (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    )
  }

  // 处理错误状态
  if (error) {
    return (
        <div className="p-6 text-center text-red-500">
          <X className="w-12 h-12 mx-auto mb-4" />
          <p>{error}</p>
        </div>
    )
  }

  // 处理没有用户信息的情况
  if (!userInfo) {
    return (
        <div className="p-6 text-center text-gray-500">
          <User className="w-12 h-12 mx-auto mb-4" />
          <p>无法获取用户信息</p>
        </div>
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