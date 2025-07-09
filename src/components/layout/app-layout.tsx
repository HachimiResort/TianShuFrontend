import { Outlet } from "react-router-dom"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background theme-transition">
      <header className="sticky top-0 z-10 border-b bg-background theme-transition">
        <div className="container flex h-16 items-center justify-between">
          <div className="font-bold">应用名称</div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {/* 这里可以添加其他导航元素，如用户菜单等 */}
          </div>
        </div>
      </header>
      <main className="container py-6">
        <Outlet />
      </main>
    </div>
  )
}
