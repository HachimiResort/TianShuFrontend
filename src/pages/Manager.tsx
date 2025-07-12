"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Users, Edit, Trash2, ChevronLeft, ChevronRight, Shield, User, Mail, Phone } from "lucide-react"
import { apiService } from "@/services/api"

// 数据类型定义
interface UserData {
  username: string
  email: string
  phonenumber: string
  userid: number
  is_admin: boolean
}

interface UsersApiResponse {
  code: number
  message: {
    users: UserData[];
  };
}

interface EditUserData {
  username: string
  email: string
  phonenumber: string
  is_admin: boolean
}

// 分页配置
const ITEMS_PER_PAGE = 10

export default function UsersPage() {
  const { toast } = useToast()

  // 状态管理
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)

  // 编辑对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [editFormData, setEditFormData] = useState<EditUserData>({
    username: "",
    email: "",
    phonenumber: "",
    is_admin: false,
  })

  // 删除确认对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null)

  // 显示提示消息
  const showToast = useCallback(
    (message: string, variant: "default" | "destructive" | "success" = "default") => {
      console.log("Showing toast:", message, variant);
      toast({
        title: variant === "destructive" ? "错误" : variant === "success" ? "成功" : "提示",
        description: message,
        variant: variant === "destructive" ? "destructive" : variant === "success" ? "success" : "default",
      })
    },
    [toast],
  )

  // 获取用户列表
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiService.get<UsersApiResponse>("/auth/users")


      if (response.success && response.data) {
        showToast("获取用户数据成功", "success")
        if (response.data.code === 0) {
          const userData = response.data.message.users
          setUsers(userData)
          setTotalPages(Math.ceil(userData.length / ITEMS_PER_PAGE))
        } else {
          showToast("获取用户数据失败", "destructive")
        }
      } else {
        showToast(response.error || "获取用户数据失败", "destructive")
      }
    } catch (error) {
      showToast("网络请求失败", "destructive")
    } finally {
      setLoading(false)
    }
  }, [showToast])

  // 更新用户信息
  const updateUser = useCallback(
    async (userId: number, userData: EditUserData) => {
      console.log("userData",userData)
      try {
        const response = await apiService.put(`/auth/users/${userId}/updateProfile`, userData)
        console.log("用户信息更新",response)
        if (response.success) {
          showToast("用户信息更新成功", "success")
          await fetchUsers() // 重新获取用户列表
          return true
        } else {
          showToast(response.error || "更新用户信息失败", "destructive")
          return false
        }
      } catch (error) {
        showToast("网络请求失败", "destructive")
        return false
      }
    },
    [showToast, fetchUsers],
  )

  // 删除用户
  const deleteUser = useCallback(
    async (userId: number) => {
      try {
        const response = await apiService.delete(`/auth/users/${userId}`)

        if (response.success) {
          showToast("用户删除成功", "success")
          await fetchUsers() // 重新获取用户列表
          // 如果当前页没有数据了，回到上一页
          const newTotalPages = Math.ceil((users.length - 1) / ITEMS_PER_PAGE)
          if (currentPage > newTotalPages && newTotalPages > 0) {
            setCurrentPage(newTotalPages)
          }
          return true
        } else {
          showToast(response.error || "删除用户失败", "destructive")
          return false
        }
      } catch (error) {
        showToast("网络请求失败", "destructive")
        return false
      }
    },
    [showToast, fetchUsers, users.length, currentPage],
  )

  // 获取当前页的用户数据
  const getCurrentPageUsers = useCallback(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return users.slice(startIndex, endIndex)
  }, [users, currentPage])

  // 打开编辑对话框
  const handleEditUser = useCallback((user: UserData) => {
    setEditingUser(user)
    setEditFormData({
      username: user.username,
      email: user.email,
      phonenumber: user.phonenumber,
      is_admin: user.is_admin,
    })
    setEditDialogOpen(true)
  }, [])

  // 保存编辑
  const handleSaveEdit = useCallback(async () => {
    if (!editingUser) return

    // 表单验证
    if (!editFormData.username.trim()) {
      showToast("用户名不能为空", "destructive")
      return
    }

    if (!editFormData.email.trim()) {
      showToast("邮箱不能为空", "destructive")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(editFormData.email)) {
      showToast("请输入有效的邮箱地址", "destructive")
      return
    }

    const success = await updateUser(editingUser.userid, editFormData)
    if (success) {
      setEditDialogOpen(false)
      setEditingUser(null)
    }
  }, [editingUser, editFormData, updateUser, showToast])

  // 打开删除确认对话框
  const handleDeleteUser = useCallback((user: UserData) => {
    setDeletingUser(user)
    setDeleteDialogOpen(true)
  }, [])

  // 确认删除
  const handleConfirmDelete = useCallback(async () => {
    if (!deletingUser) return

    const success = await deleteUser(deletingUser.userid)
    if (success) {
      setDeleteDialogOpen(false)
      setDeletingUser(null)
    }
  }, [deletingUser, deleteUser])

  // 页面切换
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  // 组件挂载时获取数据
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // 渲染用户权限标识
  const renderUserRole = (isAdmin: boolean) => {
    if (isAdmin) {
      return (
        <Badge variant="destructive" className="transition-colors duration-300 ease-in-out">
          <Shield className="w-3 h-3 mr-1" />
          管理员
        </Badge>
      )
    }
    return (
      <Badge
        variant="secondary"
        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 transition-colors duration-300 ease-in-out"
      >
        <User className="w-3 h-3 mr-1" />
        普通用户
      </Badge>
    )
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in-0 duration-500">
      {/* 页面标题 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight transition-colors duration-300 ease-in-out">用户管理</h1>
        <p className="text-muted-foreground transition-colors duration-300 ease-in-out">管理系统用户账户和权限设置</p>
      </div>

      {/* 用户列表卡片 */}
      <Card className="transition-all duration-300 ease-in-out">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 transition-colors duration-300 ease-in-out">
            <Users className="w-5 h-5" />
            用户列表
          </CardTitle>
          <CardDescription className="transition-colors duration-300 ease-in-out">
            共 {users.length} 个用户，当前第 {currentPage} 页，共 {totalPages} 页
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground transition-colors duration-300 ease-in-out">加载中...</div>
            </div>
          ) : (
            <>
              {/* 用户表格 */}
              <div className="rounded-md border transition-colors duration-300 ease-in-out">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="transition-colors duration-300 ease-in-out">用户ID</TableHead>
                      <TableHead className="transition-colors duration-300 ease-in-out">用户名</TableHead>
                      <TableHead className="transition-colors duration-300 ease-in-out">邮箱</TableHead>
                      <TableHead className="transition-colors duration-300 ease-in-out">手机号</TableHead>
                      <TableHead className="transition-colors duration-300 ease-in-out">权限</TableHead>
                      <TableHead className="text-right transition-colors duration-300 ease-in-out">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getCurrentPageUsers().map((user) => (
                      <TableRow key={user.userid} className="transition-colors duration-300 ease-in-out">
                        <TableCell className="font-medium transition-colors duration-300 ease-in-out">
                          {user.userid}
                        </TableCell>
                        <TableCell className="transition-colors duration-300 ease-in-out">{user.username}</TableCell>
                        <TableCell className="transition-colors duration-300 ease-in-out">{user.email}</TableCell>
                        <TableCell className="transition-colors duration-300 ease-in-out">
                          {user.phonenumber || "未绑定"}
                        </TableCell>
                        <TableCell className="transition-colors duration-300 ease-in-out">
                          {renderUserRole(user.is_admin)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              className="transition-all duration-300 ease-in-out"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteUser(user)}
                              className="transition-all duration-300 ease-in-out"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 分页控件 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground transition-colors duration-300 ease-in-out">
                    显示第 {(currentPage - 1) * ITEMS_PER_PAGE + 1} 到{" "}
                    {Math.min(currentPage * ITEMS_PER_PAGE, users.length)} 条，共 {users.length} 条记录
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="transition-all duration-300 ease-in-out"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      上一页
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="w-8 h-8 p-0 transition-all duration-300 ease-in-out"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="transition-all duration-300 ease-in-out"
                    >
                      下一页
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 编辑用户对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="transition-colors duration-300 ease-in-out">编辑用户信息</DialogTitle>
            <DialogDescription className="transition-colors duration-300 ease-in-out">
              修改用户的基本信息和权限设置
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2 transition-colors duration-300 ease-in-out">
                <User className="w-4 h-4" />
                用户名
              </Label>
              <Input
                id="username"
                value={editFormData.username}
                onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                className="transition-all duration-300 ease-in-out"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 transition-colors duration-300 ease-in-out">
                <Mail className="w-4 h-4" />
                邮箱地址
              </Label>
              <Input
                id="email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="transition-all duration-300 ease-in-out"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="phonenumber"
                className="flex items-center gap-2 transition-colors duration-300 ease-in-out"
              >
                <Phone className="w-4 h-4" />
                手机号码
              </Label>
              <Input
                id="phonenumber"
                value={editFormData.phonenumber}
                onChange={(e) => setEditFormData({ ...editFormData, phonenumber: e.target.value })}
                placeholder="可选"
                className="transition-all duration-300 ease-in-out"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 transition-colors duration-300 ease-in-out">
                <Shield className="w-4 h-4" />
                管理员权限
              </Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editFormData.is_admin}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, is_admin: checked })}
                />
                <span className="text-sm text-muted-foreground transition-colors duration-300 ease-in-out">
                  {editFormData.is_admin ? "管理员用户" : "普通用户"}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="transition-all duration-300 ease-in-out"
            >
              取消
            </Button>
            <Button onClick={handleSaveEdit} className="transition-all duration-300 ease-in-out">
              保存更改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="transition-colors duration-300 ease-in-out">确认删除用户</AlertDialogTitle>
            <AlertDialogDescription className="transition-colors duration-300 ease-in-out">
              您确定要删除用户 "{deletingUser?.username}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="transition-all duration-300 ease-in-out">取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-300 ease-in-out"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
