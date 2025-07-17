import type React from "react"
import { lazy, Suspense } from "react"
import { Navigate } from "react-router-dom"
import { AuthLayout } from "@/components/layout/auth-layout"
import { DashboardLayout } from "@/components/layout/dashboard-layout" // Updated import
import { Login } from "@/pages/Login"


// 使用React.lazy进行代码分割
const Dashboard = lazy(() => import("@/pages/DashBoard"))
const Profile = lazy(() => import("@/pages/profile"))
const NotFound = lazy(() => import("@/pages/not-found"))
const LocationPage = lazy(() => import("@/pages/Location"))
const Manager = lazy(()=> import("@/pages/Manager"))
const TestData = lazy(() => import("@/pages/test-data"))
const SmartCity = lazy(() => import("@/pages/smart-city"))
const LogsPage=lazy(() => import("@/pages/Logs"))
const Setting=lazy(() => import("@/pages/setting"))

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
    element: <Navigate to="/profile" replace />,
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: "/",
    element: <DashboardLayout />,
    children: [
      {
        path: "profile",
        element: (
          <Suspense fallback={<PageLoading />}>
            <Profile />
          </Suspense>
        ),
        meta: {
          title: "个人资料",
          requiresAuth: true,
        },
      },
      {
        path: "dashboard",
        element: (
            <Suspense fallback={<PageLoading />}>
              <Dashboard />
            </Suspense>
        ),
        meta: {
          title: "仪表盘",
          requiresAuth: true,
        },
      },
      {
        path: "management",
        element: <Manager/>,
        meta: {
          title: "用户管理",
          requiresAuth: true,
        },
      },
      {
        path: "smart-city",
        element: <SmartCity/>,

        meta: {
          title: "智慧城市交通",
          requiresAuth: true,
        },
      },
      {
        path: "logs",
        element: <LogsPage/>,

        meta: {
          title: "日志查看",
          requiresAuth: true,
        },
      },
      {
        path: "setting",
        element: <Setting/>,

        meta: {
          title: "设置",
          requiresAuth: true,
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
          requiresAuth: false,
        },
      },
    ],
  },
  {
    path: "location",
    element: (
      <Suspense fallback={<PageLoading />}>
        <LocationPage/>
      </Suspense>
    ),
    meta: {
      title: "测试地图",
    },
  },
  {
    path: "testdata",
    element: (
      <Suspense fallback={<PageLoading />}>
        <TestData></TestData>
      </Suspense>
    ),
    meta: {
      title: "数据接口测试",
      requiresAuth: true,
    },
  },

  {
    path: "*",
    element: (
      <Suspense fallback={<PageLoading />}>
        <NotFound />
      </Suspense>
    ),
    meta: {
      title: "页面未找到",
      requiresAuth: false,
    },
  },
]
