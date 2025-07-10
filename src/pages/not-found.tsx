"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Home, ArrowLeft, Search } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center animate-in fade-in-0 zoom-in-95 duration-500">
        <CardContent className="pt-6 space-y-6">
          {/* 404 动画数字 */}
          <div className="space-y-4">
            <div className="text-8xl font-bold text-primary animate-bounce">
              4<span className="inline-block animate-pulse delay-100">0</span>
              <span className="inline-block animate-bounce delay-200">4</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">页面未找到</h1>
              <p className="text-muted-foreground">抱歉，您访问的页面不存在或已被移动</p>
            </div>
          </div>

          {/* 搜索图标动画 */}
          <div className="flex justify-center">
            <div className="relative">
              <Search className="w-16 h-16 text-muted-foreground animate-pulse" />
              <div className="absolute inset-0 w-16 h-16 border-2 border-primary rounded-full animate-ping opacity-20"></div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="space-y-3">
            <Button asChild className="w-full transition-all duration-200 hover:scale-105">
              <Link to="/dashboard">
                <Home className="w-4 h-4 mr-2" />
                返回首页
              </Link>
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="w-full transition-all duration-200 hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回上页
            </Button>
          </div>

          {/* 帮助信息 */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              如果您认为这是一个错误，请联系
              <a
                href="mailto:support@example.com"
                className="text-primary hover:underline ml-1 transition-colors duration-200"
              >
                技术支持
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
