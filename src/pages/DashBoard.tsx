"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Users, Building2, TrendingUp } from "lucide-react"
import { apiService } from "@/services/api.ts"
import { toast } from "@/components/ui/use-toast.tsx"
import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from "recharts"
import { ChartAreaInteractive } from "@/components/cool-chart"

const stats = [
  {
    title: "总访问量",
    value: "",
    icon: TrendingUp,
    trend: "stable",
  },
  {
    title: "智慧城市节点",
    value: "",
    icon: Building2,
    trend: "up",
  },
  {
    title: "总用户数",
    value: "",
    icon: Users,
    trend: "up",
  },
  {
    title: "活跃设备",
    value: "",
    icon: Activity,
    trend: "up",
  },
]

interface UserData {
  message: {
    total_users: number
  }
}

interface LocationData {
  message: {
    total_locations: number
  }
}

interface VisitData {
  message: {
    total_visits: number
  }
}

interface DeviceData {
  message: {
    total_devices: number
  }
}

interface LoginDataResponse {
  code: number
  message: {
    days: {
      day: string
      total_requests: number
    }[]
  }
}

export default function Dashboard() {
  const [totalUsers, setTotalUsers] = useState("")
  const [devices, setDevices] = useState("")
  const [locations, setLocations] = useState("")
  const [visits, setVisits] = useState("")
  const [loginData, setLoginData] = useState<{ day: string; total_requests: number }[]>([])

  useEffect(() => {
    getTotalUsers()
    getDevices()
    getLocations()
    getVisits()
    getLoginData()
  }, [])

  const getLoginData = async () => {
    try {
      const response = await apiService.get<LoginDataResponse>(`/statistics/login-count-by-day`)
      console.log("response", response)
      if (response.success && response.data) {
        setLoginData(response.data.message.days)
      } else {
        toast({
          description: "获取登录数据失败!",
          variant: "destructive",
          duration: 2000,
        })
      }
    } catch (error) {
      toast({
        description: "总用户数请求失败!",
        variant: "destructive",
        duration: 2000,
      })
    }
  }

  const getTotalUsers = async () => {
    try {
      const response = await apiService.get(`/statistics/users`)
      console.log("response", response)
      if (response.success) {
        const responseData = response.data as UserData
        setTotalUsers(responseData.message.total_users.toString())
      }
    } catch (error) {
      toast({
        description: "总用户数请求失败!",
        variant: "destructive",
        duration: 2000,
      })
    }
  }

  const getDevices = async () => {
    try {
      const response = await apiService.get(`/statistics/device`)
      console.log("response", response)
      if (response.success) {
        const responseData = response.data as DeviceData
        setDevices(responseData.message.total_devices.toString())
      }
    } catch (error) {
      toast({
        description: "活跃设备数请求失败!",
        variant: "destructive",
        duration: 2000,
      })
    }
  }

  const getLocations = async () => {
    try {
      const response = await apiService.get(`/statistics/locations`)
      console.log("response", response)
      if (response.success) {
        const responseData = response.data as LocationData
        setLocations(responseData.message.total_locations.toString())
      }
    } catch (error) {
      toast({
        description: "智慧城市数请求失败!",
        variant: "destructive",
        duration: 2000,
      })
    }
  }

  const getVisits = async () => {
    try {
      const response = await apiService.get(`/statistics/visits`)
      console.log("response", response)
      if (response.success) {
        const responseData = response.data as VisitData
        setVisits(responseData.message.total_visits.toString())
      }
    } catch (error) {
      toast({
        description: "总访问量请求失败!",
        variant: "destructive",
        duration: 2000,
      })
    }
  }

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
                  <div className="text-2xl font-bold transition-colors duration-300 ease-in-out">
                    {stat.title === "总用户数" ? totalUsers : stat.value}
                    {stat.title === "活跃设备" ? devices : stat.value}
                    {stat.title === "智慧城市节点" ? locations : stat.value}
                    {stat.title === "总访问量" ? visits : stat.value}
                  </div>
                </CardContent>
              </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card
              className="col-span-full hover:shadow-lg animate-in slide-in-from-left-4 transition-all duration-300 ease-in-out"
          >
            <CardHeader>
              <CardTitle className="transition-colors duration-300 ease-in-out">系统概览</CardTitle>
              <CardDescription className="transition-colors duration-300 ease-in-out">
                最近 30 天的系统登录次数
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ChartAreaInteractive data={loginData} />
            </CardContent>
          </Card>
        </div>
      </div>
  )
}