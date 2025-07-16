"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { X, MapPin, Clock, TrendingUp, Activity, Zap, BarChart3 } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

// 站点数据类型
interface StationData {
  location_id: number
  location: { longitude: number; latitude: number }
  timeRange: { start: number; end: number }
  measurementData: FlowRecord[]
  predictionData: FlowRecord[]
}

interface FlowRecord {
  record_id: number
  time: number
  velocity_record: number
}

interface StationSidebarProps {
  isOpen: boolean
  onClose: () => void
  stationData: StationData | null
  currentTimeStep: number
  stepLength: number
  measurementStartTime: number
}

// 格式化时间戳
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000)
  // 只显示月-日 时:分:秒
  const MM = String(date.getMonth() + 1).padStart(2, '0')
  const DD = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${MM}-${DD} ${hh}:${mm}:${ss}`
}

// 格式化坐标
const formatCoordinate = (coord: number): string => {
  return coord.toFixed(6)
}

export function StationSidebar({
  isOpen,
  onClose,
  stationData,
  currentTimeStep,
  stepLength,
  measurementStartTime,
}: StationSidebarProps) {
  // 处理图表数据 - 从当前时间步开始显示接下来的20个时间步
  const chartData = useMemo(() => {
    if (!stationData) return []

    const DISPLAY_STEPS = 20
    const data: Array<{
      timeStep: number
      timestamp: string
      measurement?: number
      prediction?: number
    }> = []

    // 创建测量数据映射
    const measurementMap = new Map<number, number>()
    stationData.measurementData.forEach((record) => {
      const timeStep = Math.round((record.time - measurementStartTime) / stepLength)
      measurementMap.set(timeStep, record.velocity_record)
    })

    // 创建预测数据映射
    const predictionMap = new Map<number, number>()
    stationData.predictionData.forEach((record) => {
      const timeStep = Math.round((record.time - measurementStartTime) / stepLength)
      predictionMap.set(timeStep, record.velocity_record)
    })

    // 生成图表数据
    for (let i = 0; i < DISPLAY_STEPS; i++) {
      const timeStep = currentTimeStep + i
      const timestamp = measurementStartTime + timeStep * stepLength

      const dataPoint: any = {
        timeStep,
        timestamp: formatTimestamp(timestamp),
        displayStep: `步骤 ${timeStep + 1}`,
      }

      // 添加测量数据
      if (measurementMap.has(timeStep)) {
        dataPoint.measurement = measurementMap.get(timeStep)
      }

      // 添加预测数据
      if (predictionMap.has(timeStep)) {
        dataPoint.prediction = predictionMap.get(timeStep)
      }

      data.push(dataPoint)
    }

    return data
  }, [stationData, currentTimeStep, stepLength, measurementStartTime])

  // 计算统计数据
  const statistics = useMemo(() => {
    if (!stationData) return null

    const measurementStats = {
      count: stationData.measurementData.length,
      average:
        stationData.measurementData.length > 0
          ? stationData.measurementData.reduce((sum, record) => sum + record.velocity_record, 0) /
            stationData.measurementData.length
          : 0,
      max:
        stationData.measurementData.length > 0
          ? Math.max(...stationData.measurementData.map((r) => r.velocity_record))
          : 0,
      min:
        stationData.measurementData.length > 0
          ? Math.min(...stationData.measurementData.map((r) => r.velocity_record))
          : 0,
    }

    const predictionStats = {
      count: stationData.predictionData.length,
      average:
        stationData.predictionData.length > 0
          ? stationData.predictionData.reduce((sum, record) => sum + record.velocity_record, 0) /
            stationData.predictionData.length
          : 0,
      max:
        stationData.predictionData.length > 0
          ? Math.max(...stationData.predictionData.map((r) => r.velocity_record))
          : 0,
      min:
        stationData.predictionData.length > 0
          ? Math.min(...stationData.predictionData.map((r) => r.velocity_record))
          : 0,
    }

    return { measurementStats, predictionStats }
  }, [stationData])

  // 自定义工具提示
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{data.displayStep}</p>
          <p className="text-xs text-muted-foreground mb-2">{data.timestamp}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value?.toFixed(2)} km/h
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div
      className={`fixed top-0 right-0 h-full w-96 border-l shadow-xl z-20 flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "translate-x-full"}
        bg-white/70 dark:bg-zinc-900/60 backdrop-blur-lg rounded-l-2xl
        !overflow-hidden
      `}
      style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)' }}
    >
      <div className="flex flex-col h-full">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">站点详情</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!stationData ? (
            // 空状态
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <MapPin className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium">未选择站点</h3>
                <p className="text-sm text-muted-foreground max-w-xs">请在地图上左键点击站点标记，查看详细数据信息</p>
              </div>
            </div>
          ) : (
            <>
              {/* 基本信息卡片 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="w-4 h-4" />
                    站点 {stationData.location_id}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">经度:</span>
                      <p className="font-mono">{formatCoordinate(stationData.location.longitude)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">纬度:</span>
                      <p className="font-mono">{formatCoordinate(stationData.location.latitude)}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">数据时间范围</span>
                    </div>
                    <div className="text-xs space-y-1 pl-6">
                      <p>
                        <span className="text-muted-foreground">开始:</span>{" "}
                        {formatTimestamp(stationData.timeRange.start)}
                      </p>
                      <p>
                        <span className="text-muted-foreground">结束:</span>{" "}
                        {formatTimestamp(stationData.timeRange.end)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              
              {/* 数据趋势图表 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">数据趋势</CardTitle>
                  <CardDescription className="text-xs">从当前时间步开始的接下来20个时间步的数据变化</CardDescription>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis
                            dataKey="timestamp" // 修改为显示真实时间
                            tick={{ fontSize: 10 }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis
                            tick={{ fontSize: 10 }}
                            label={{
                              value: "速度 (km/h)",
                              angle: -90,
                              position: "insideLeft",
                              style: { fontSize: 10 },
                            }}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: "12px" }} iconType="line" />
                          <Line
                            type="monotone"
                            dataKey="measurement"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            name="测量数据"
                            connectNulls={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="prediction"
                            stroke="#f97316"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ r: 3 }}
                            name="预测数据"
                            connectNulls={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-center">
                      <div className="space-y-2">
                        <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto" />
                        <p className="text-sm text-muted-foreground">暂无图表数据</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 数据统计卡片 */}
              {statistics && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="w-4 h-4" />
                      数据统计
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 测量数据统计 */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">测量数据</span>
                        <Badge variant="outline" className="text-xs">
                          {statistics.measurementStats.count} 条记录
                        </Badge>
                      </div>
                      {statistics.measurementStats.count > 0 ? (
                        <div className="grid grid-cols-3 gap-2 text-xs pl-6">
                          <div>
                            <span className="text-muted-foreground">平均:</span>
                            <p className="font-medium">{statistics.measurementStats.average.toFixed(1)} km/h</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">最大:</span>
                            <p className="font-medium">{statistics.measurementStats.max.toFixed(1)} km/h</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">最小:</span>
                            <p className="font-medium">{statistics.measurementStats.min.toFixed(1)} km/h</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground pl-6">暂无测量数据</p>
                      )}
                    </div>

                    <Separator />

                    {/* 预测数据统计 */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium">预测数据</span>
                        <Badge variant="outline" className="text-xs">
                          {statistics.predictionStats.count} 条记录
                        </Badge>
                      </div>
                      {statistics.predictionStats.count > 0 ? (
                        <div className="grid grid-cols-3 gap-2 text-xs pl-6">
                          <div>
                            <span className="text-muted-foreground">平均:</span>
                            <p className="font-medium">{statistics.predictionStats.average.toFixed(1)} km/h</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">最大:</span>
                            <p className="font-medium">{statistics.predictionStats.max.toFixed(1)} km/h</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">最小:</span>
                            <p className="font-medium">{statistics.predictionStats.min.toFixed(1)} km/h</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground pl-6">暂无预测数据</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              
            </>
          )}
        </div>
      </div>
    </div>
  )
}
