"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Users, Building2, TrendingUp } from "lucide-react"



const stats = [
  {
    title: "总用户数",
    value: "2,847",
    description: "+12% 较上月",
    icon: Users,
    trend: "up",
  },
  {
    title: "活跃设备",
    value: "1,234",
    description: "+8% 较上月",
    icon: Activity,
    trend: "up",
  },
  {
    title: "智慧城市节点",
    value: "156",
    description: "+3 新增",
    icon: Building2,
    trend: "up",
  },
  {
    title: "系统性能",
    value: "98.5%",
    description: "运行稳定",
    icon: TrendingUp,
    trend: "stable",
  },
]



export default function Dashboard() {
  return (
    <div className="p-6 space-y-6 animate-in fade-in-0 duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight transition-colors duration-300 ease-in-out">仪表盘</h1>
        <p className="text-muted-foreground transition-colors duration-300 ease-in-out">欢迎回到天枢系统管理平台</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="hover:shadow-lg animate-in slide-in-from-bottom-4 transition-all duration-300 ease-in-out"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium transition-colors duration-300 ease-in-out">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground transition-colors duration-300 ease-in-out" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold transition-colors duration-300 ease-in-out">{stat.value}</div>
              <p className="text-xs text-muted-foreground transition-colors duration-300 ease-in-out">
                {stat.description}
              </p>

            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card
            className="col-span-4 hover:shadow-lg animate-in slide-in-from-left-4 transition-all duration-300 ease-in-out">
          <CardHeader>
            <CardTitle className="transition-colors duration-300 ease-in-out">系统概览</CardTitle>
            <CardDescription className="transition-colors duration-300 ease-in-out">
              最近30天的系统运行状态
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div
                className="h-[200px] flex items-center justify-center text-muted-foreground transition-colors duration-300 ease-in-out">
              图表区域 - 可集成 Chart.js 或其他图表库
            </div>
          </CardContent>
        </Card>

        <Card
            className="col-span-3 hover:shadow-lg animate-in slide-in-from-right-4 transition-all duration-300 ease-in-out">
          <CardHeader>
            <CardTitle className="transition-colors duration-300 ease-in-out">最近活动</CardTitle>
            <CardDescription className="transition-colors duration-300 ease-in-out">系统最新动态</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {time: "2分钟前", event: "用户 张三 登录系统"},
                {time: "5分钟前", event: "智慧城市节点 #156 上线"},
                {time: "10分钟前", event: "系统备份完成"},
                {time: "15分钟前", event: "新用户注册"},
              ].map((activity, index) => (
                  <div
                      key={index}
                      className="flex items-center space-x-4 animate-in fade-in-0 slide-in-from-bottom-2"
                  >
                    <div className="w-2 h-2 bg-primary rounded-full transition-colors duration-300 ease-in-out"></div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none transition-colors duration-300 ease-in-out">
                        {activity.event}
                      </p>
                      <p className="text-sm text-muted-foreground transition-colors duration-300 ease-in-out">
                        {activity.time}
                      </p>
                    </div>
                  </div>
              ))}
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  )
}
