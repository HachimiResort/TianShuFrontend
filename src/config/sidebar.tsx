import type React from "react"
import { User, Users, Building2, Home, Settings } from "lucide-react"

export interface SidebarItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

export const sidebarConfig: SidebarItem[] = [
  {
    title: "仪表盘",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "个人信息",
    url: "/profile",
    icon: User,
  },
  {
    title: "用户管理",
    url: "/users",
    icon: Users,
    badge: "管理",
  },
  {
    title: "智慧城市",
    url: "/smart-city",
    icon: Building2,
    badge: "新",
  },
  {
    title: "设置",
    url: "/settings",
    icon: Settings,
  },
]
