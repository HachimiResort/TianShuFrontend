"use client"

import { useEffect } from "react"
import { useRoutes, useNavigate, useLocation } from "react-router-dom"
import { routes, type RouteConfig } from "./routes"

// 获取用户是否已认证的函数
const isAuthenticated = (): boolean => {
  const token = localStorage.getItem("token");
  if (token) {
    return true;
  }
  // 如果 token 过期，清除 localStorage 中的 token 和 userid
  localStorage.removeItem("token");
  localStorage.removeItem("userid");
  return false;
}

// 改进的扁平化函数：拼接父路径和子路径
const flattenRoutes = (routes: RouteConfig[], parentPath = ""): RouteConfig[] => {
  return routes.flatMap(route => {
    // 处理父路径（移除末尾斜杠）
    const normalizedParentPath = parentPath.endsWith("/")
        ? parentPath.slice(0, -1)
        : parentPath;

    // 处理当前路径（移除开头斜杠，避免双斜杠）
    const normalizedChildPath = route.path?.startsWith("/")
        ? route.path.slice(1)
        : route.path;

    // 拼接完整路径
    const fullPath = normalizedChildPath
        ? `${normalizedParentPath}/${normalizedChildPath}`
        : normalizedParentPath;

    // 确保路径至少为 "/"
    const finalPath = fullPath || "/";

    // 递归处理子路由
    const routeWithFullPath = { ...route, path: finalPath };
    return route.children
        ? [routeWithFullPath, ...flattenRoutes(route.children, finalPath)]
        : [routeWithFullPath];
  });
};

// 改进的路径匹配函数：支持动态路由和精确匹配
const matchRoutePath = (routePath: string, actualPath: string): boolean => {
  const routeSegments = routePath.split("/").filter(Boolean);
  const actualSegments = actualPath.split("/").filter(Boolean);

  if (routeSegments.length !== actualSegments.length) return false;

  return routeSegments.every((segment, index) => {
    if (segment.startsWith(":")) return true;
    return segment === actualSegments[index];
  });
};


export const AppRouter = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const element = useRoutes(routes);

  useEffect(() => {
    // 扁平化路由配置
    const allRoutes = flattenRoutes(routes);

    // 查找匹配的路由
    const currentRoute = allRoutes.find(
        route => route.path && matchRoutePath(route.path, location.pathname)
    );

    // 路由守卫逻辑
    if (currentRoute?.meta?.requiresAuth && !isAuthenticated()) {
      //console.log("[路由守卫] 未认证，重定向到登录页");
      navigate("/login", {
        replace: true,
        state: { message: "请先登录！", variant: "destructive" }
      });


    } else {
      //console.log("[路由守卫] 允许访问:", location.pathname);
    }
  }, [location, navigate]);

  return element;
};