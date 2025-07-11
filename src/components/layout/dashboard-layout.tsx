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
import { sidebarConfig } from "@/config/sidebar";

export function DashboardLayout() {

  const location = useLocation();
  const currentPath = location.pathname.split("/").pop();
  const getBreadcrumbItems = () => {
    const currentItem = sidebarConfig.find(item => item.url.split("/").pop() === currentPath);
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
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
