import type React from "react"
import { User, Users, Building2, Home, Settings,Book } from "lucide-react"

export interface SidebarItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

//管理员导航菜单
export const adminsidebarConfig: SidebarItem[] = [
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
    url: "/management",
    icon: Users,
  },
  {
    title: "智慧城市",
    url: "/smart-city",
    icon: Building2,
  },
  {
    title: "日志查看",
    url: "/logs",
    icon: Book
  },
  {
    title: "设置",
    url: "/settings",
    icon: Settings,
  },
]

//用户导航菜单
export const usersidebarConfig: SidebarItem[] = [
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
