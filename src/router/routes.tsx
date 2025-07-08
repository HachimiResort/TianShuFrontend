import type React from "react"
import { lazy, Suspense } from "react"
import { Navigate } from "react-router-dom"
import { AppLayout } from "@/components/layout/app-layout"
import { AuthLayout } from "@/components/layout/auth-layout"
import { Login } from "@/pages/Login"

// // 使用React.lazy进行代码分割
// const Dashboard = lazy(() => import("@/pages/dashboard"))
// const Profile = lazy(() => import("@/pages/profile"))
// const NotFound = lazy(() => import("@/pages/not-found"))

// 加载状态组件
const PageLoading = () => <div className="flex h-screen items-center justify-center">加载中...</div>

// 路由配置类型
export interface RouteConfig {
  path: string
  element: React.ReactNode
  children?: RouteConfig[]
  meta?: {
    title?: string
    requiresAuth?: boolean
    roles?: string[]
  }
}

// 路由配置
export const routes: RouteConfig[] = [
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: "/",
    element: <AppLayout />,
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: "dashboard",
        element: (
          <Suspense fallback={<PageLoading />}>
            {/* <Dashboard /> */}
          </Suspense>
        ),
        meta: {
          title: "仪表盘",
        },
      },
      {
        path: "profile",
        element: (
          <Suspense fallback={<PageLoading />}>
            {/* <Profile /> */}
          </Suspense>
        ),
        meta: {
          title: "个人资料",
        },
      },
    ],
  },
  {
    path: "/",
    element: <AuthLayout />,
    children: [
      {
        path: "login",
        element: <Login />,
        meta: {
          title: "登录",
        },
      },
    ],
  },
  {
    path: "*",
    element: (
      <Suspense fallback={<PageLoading />}>
        {/* <NotFound /> */}
      </Suspense>
    ),
    meta: {
      title: "页面未找到",
    },
  },
]
