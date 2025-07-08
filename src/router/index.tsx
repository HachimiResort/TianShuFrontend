"use client"

import { useEffect } from "react"
import { useRoutes, useNavigate, useLocation } from "react-router-dom"
import { routes, type RouteConfig } from "./routes"

// 获取用户是否已认证的函数
const isAuthenticated = (): boolean => {
  return !!localStorage.getItem("token")
}

export const AppRouter = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const element = useRoutes(routes)

  useEffect(() => {
    // 查找当前路由配置
    const findRouteConfig = (routes: RouteConfig[], path: string): RouteConfig | undefined => {
      for (const route of routes) {
        if (route.path === path) {
          return route
        }
        if (route.children) {
          const childRoute = findRouteConfig(route.children, path)
          if (childRoute) {
            return childRoute
          }
        }
      }
      return undefined
    }

    // 扁平化路由配置
    const flattenRoutes = (routes: RouteConfig[]): RouteConfig[] => {
      return routes.reduce((acc: RouteConfig[], route) => {
        acc.push(route)
        if (route.children) {
          acc.push(...flattenRoutes(route.children))
        }
        return acc
      }, [])
    }

    const allRoutes = flattenRoutes(routes)
    const currentRoute = allRoutes.find((route) => route.path === location.pathname)

    // 路由守卫逻辑
    if (currentRoute?.meta?.requiresAuth && !isAuthenticated()) {
      navigate("/login", { replace: true })
    }

  }, [location, navigate])

  return element
}
