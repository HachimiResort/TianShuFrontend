"use client"

import type React from "react"
import { Link, useLocation } from "react-router-dom"
import { adminsidebarConfig ,usersidebarConfig} from "@/config/sidebar"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarRail,
} from "@/components/ui/sidebar"
import { User, LogOut, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUserInfo } from "@/hooks/use-auth"
import {apiService} from "@/services/api.ts";
import {useEffect, useState} from "react";
import { type GetMeResponse } from "@/types"


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const userid = localStorage.getItem("userid")
  const { userInfo, loading, error } = useUserInfo(userid || "")
  const [sidebarConfig, setSidebarConfig] = useState(usersidebarConfig);

  useEffect(() => {
    const fetchUserRole = async () => {
        const response = await apiService.get<GetMeResponse>('/auth/me');
        console.log("response",response)
        if (response.success && response.data) {
          const role = response.data.message.role;
          setSidebarConfig(role === 'admin' ? adminsidebarConfig : usersidebarConfig);
        }
    };

    fetchUserRole();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token")
    window.location.href = "/login"
  }

  return (
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">天枢系统</span>
              <span className="truncate text-xs text-muted-foreground">管理平台</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>导航菜单</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sidebarConfig.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                        <Link to={item.url} className="transition-all duration-200 hover:scale-105">
                          <item.icon className="transition-transform duration-200" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.badge && <SidebarMenuBadge className="animate-pulse">{item.badge}</SidebarMenuBadge>}
                    </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted">
                  <User className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">

                  {loading ? (
                      <span className="truncate font-semibold">加载中...</span>
                  ) : error ? (
                      <span className="truncate font-semibold text-red-500">获取信息失败</span>
                  ) : userInfo ? (
                      <>
                        <span className="truncate font-semibold">{userInfo.message.username}</span>
                        <span className="truncate text-xs text-muted-foreground">{userInfo.message.email}</span>
                      </>
                  ) : (
                      <span className="truncate font-semibold">未获取到用户信息</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <ThemeToggle />
                  <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLogout}
                      className="size-8 hover:bg-destructive hover:text-destructive-foreground transition-colors duration-200"
                      title="退出登录"
                  >
                    <LogOut className="size-4" />
                  </Button>
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
  )
}