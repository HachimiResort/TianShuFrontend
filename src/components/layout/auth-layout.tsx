import { Outlet } from "react-router-dom"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col theme-transition">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <Outlet />
      </div>
    </div>
  )
}
