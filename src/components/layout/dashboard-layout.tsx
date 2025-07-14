import {Outlet, useLocation} from "react-router-dom"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { usersidebarConfig,adminsidebarConfig } from "@/config/sidebar";
import { useEffect, useState } from 'react';
import {apiService} from "@/services/api.ts";
import { type GetMeResponse } from "@/types/index"



export function DashboardLayout() {
  const [sidebarConfig, setSidebarConfig] = useState(usersidebarConfig);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const currentPath = location.pathname.split("/").pop();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await apiService.get<GetMeResponse>('/auth/me');
        if (response.success && response.data) {
          const role = response.data.message.role
          setSidebarConfig(role === 'admin' ? adminsidebarConfig : usersidebarConfig);
        }
      } catch (err) {
        // 忽略错误，使用默认配置
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  const getBreadcrumbItems = () => {
    if (loading) return null; // 或显示加载状态

    const currentItem = sidebarConfig.find(item => item.url.split("/").pop() === currentPath);
    //console.log("currentItem",currentItem)
    return (
        <>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink href="/dashboard">天枢系统</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          {currentItem ? (
              <BreadcrumbItem>
                <BreadcrumbPage>{currentItem.title}</BreadcrumbPage>
              </BreadcrumbItem>
          ) : (
              <BreadcrumbItem>
                <BreadcrumbPage>未知页面</BreadcrumbPage>
              </BreadcrumbItem>
          )}
        </>
    );
  };


  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-all duration-300">
          <SidebarTrigger className="-ml-1 transition-transform duration-200 hover:scale-110" />
          <Separator orientation="vertical" className="mr-2 h-4" />

          <Breadcrumb>
            <BreadcrumbList>


              {getBreadcrumbItems()}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min transition-all duration-300">

            <Outlet/>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
