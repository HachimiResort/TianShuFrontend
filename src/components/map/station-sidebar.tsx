"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { X, MapPin, Clock, TrendingUp, Activity, Zap, BarChart3, Gauge, AlertTriangle, Users } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

// 接口定义 (与之前保持一致)
interface FlowRecord {
  record_id: number
  time: number
  velocity_record: number
}

interface StationData {
  location_id: number
  location: { longitude: number; latitude: number }
  timeRange: { start: number; end: number }
  measurementData: FlowRecord[]
  predictionData: FlowRecord[]
}

// 新增 Location 接口, 因为 props 需要
interface Location {
  location_id: number
  longitude: number
  latitude: number
}

// 扩展 props
interface StationSidebarProps {
  isOpen: boolean
  onClose: () => void
  stationData: StationData | null
  currentTimeStep: number
  stepLength: number
  measurementStartTime: number
  allLocations: Location[] // 新增: 所有地点信息
  currentMeasurementData: Map<number, FlowRecord> | null // 新增: 当前时间步的所有数据
}

// 新增: 统计数据接口
interface SceneStatisticsData {
  averageSpeed: number
  congestionIndex: number
  topCongestedStations: Array<{ location_id: number; velocity: number; location: Location }>
  abnormalStations: Array<{ location_id: number; velocity: number; location: Location }>
}

// 格式化函数 (与之前保持一致)
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000)
  const MM = String(date.getMonth() + 1).padStart(2, "0")
  const DD = String(date.getDate()).padStart(2, "0")
  const hh = String(date.getHours()).padStart(2, "0")
  const mm = String(date.getMinutes()).padStart(2, "0")
  const ss = String(date.getSeconds()).padStart(2, "0")
  return `${MM}-${DD} ${hh}:${mm}:${ss}`
}

const formatCoordinate = (coord: number): string => coord.toFixed(6)

// 新增: 场景统计视图组件
function SceneStatisticsView({ stats }: { stats: SceneStatisticsData }) {
  const getCongestionColor = (index: number) => {
    if (index > 75) return "text-red-500"
    if (index > 50) return "text-orange-500"
    if (index > 25) return "text-yellow-500"
    return "text-green-500"
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">当前场景平均速度</CardTitle>
          <Gauge className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.averageSpeed.toFixed(2)} km/h</div>
          <p className="text-xs text-muted-foreground">基于当前有数据的站点计算</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">实时拥堵指数</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getCongestionColor(stats.congestionIndex)}`}>
            {stats.congestionIndex.toFixed(0)}
            <span className="text-sm font-normal text-muted-foreground">/ 100</span>
          </div>
          <p className="text-xs text-muted-foreground">指数越高, 代表相对越拥堵</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">最拥堵的3个站点</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {stats.topCongestedStations.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {stats.topCongestedStations.map((s, index) => (
                <li key={s.location_id} className="flex items-center justify-between">
                  <span>
                    <span className="font-mono bg-muted rounded px-1.5 py-0.5 mr-2 text-xs">{index + 1}</span>
                    站点 {s.location_id}
                  </span>
                  <span className="font-semibold">{s.velocity.toFixed(2)} km/h</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">无足够数据进行排名</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">异常流量预警</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {stats.abnormalStations.length > 0 ? (
            <ul className="space-y-2 text-sm text-amber-600 dark:text-amber-400">
              {stats.abnormalStations.map((s) => (
                <li key={s.location_id} className="flex items-center justify-between">
                  <span>站点 {s.location_id} 速度过低</span>
                  <span className="font-semibold">{s.velocity.toFixed(2)} km/h</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">当前无异常流量</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function StationSidebar({
  isOpen,
  onClose,
  stationData,
  currentTimeStep,
  stepLength,
  measurementStartTime,
  allLocations,
  currentMeasurementData,
}: StationSidebarProps) {
  const [activeView, setActiveView] = useState<"details" | "stats">("details")

  // 当选择一个新站点时, 自动切换到详情视图
  useEffect(() => {
    if (stationData) {
      setActiveView("details")
    }
  }, [stationData])

  // 计算全局统计数据
  // 计算全局统计数据
  const sceneStatistics = useMemo<SceneStatisticsData>(() => {
    if (!currentMeasurementData || currentMeasurementData.size === 0 || !allLocations || allLocations.length === 0) {
      return { averageSpeed: 0, congestionIndex: 0, topCongestedStations: [], abnormalStations: [] }
    }

    const locationMap = new Map(allLocations.map((loc) => [loc.location_id, loc]))

    // 1. 创建包含所有站点信息的列表，并过滤掉速度为0的
    const allStationsData = Array.from(currentMeasurementData.entries())
      .filter(([_, data]) => data.velocity_record > 0) // 过滤掉速度为0的记录
      .map(([location_id, data]) => ({
        location_id,
        velocity: data.velocity_record,
        location: locationMap.get(location_id),
      }))
      .filter((item) => item.location) as Array<{ location_id: number; velocity: number; location: Location }>

    if (allStationsData.length === 0) {
      return { averageSpeed: 0, congestionIndex: 0, topCongestedStations: [], abnormalStations: [] }
    }

    // 2. 计算平均速度和拥堵指数
    const velocities = allStationsData.map(s => s.velocity)
    const totalSpeed = velocities.reduce((sum, v) => sum + v, 0)
    const averageSpeed = totalSpeed / velocities.length

    const maxSpeed = Math.max(...velocities)
    const minSpeed = Math.min(...velocities)
    const congestionIndex =
      maxSpeed === minSpeed ? 50 : ((maxSpeed - averageSpeed) / (maxSpeed - minSpeed)) * 100

    // 3. 计算最拥堵的3个站点（已经过滤了速度为0的）
    const topCongestedStations = [...allStationsData]
      .sort((a, b) => a.velocity - b.velocity)
      .slice(0, 3)

    // 4. 计算异常站点（速度低于阈值）
    const ABNORMAL_THRESHOLD = 10 // km/h
    const abnormalStations = allStationsData.filter((s) => s.velocity < ABNORMAL_THRESHOLD)

    return { 
      averageSpeed, 
      congestionIndex: isNaN(congestionIndex) ? 0 : congestionIndex, 
      topCongestedStations, 
      abnormalStations 
    }
  }, [currentMeasurementData, allLocations])

  // ... (原有的 chartData, statistics, yAxisDomain, CustomTooltip 的 useMemo 计算保持不变) ...
  // --- 开始: 原有计算逻辑 (为保持完整性而复制) ---
  const chartData = useMemo(() => {
    if (!stationData) return []
    const DISPLAY_STEPS = 20
    const data: Array<{ timeStep: number; timestamp: string; measurement?: number; prediction?: number }> = []
    const measurementMap = new Map<number, number>()
    stationData.measurementData.forEach((record) => {
      const timeStep = Math.round((record.time - measurementStartTime) / stepLength)
      measurementMap.set(timeStep, record.velocity_record)
    })
    const predictionMap = new Map<number, number>()
    stationData.predictionData.forEach((record) => {
      const timeStep = Math.round((record.time - measurementStartTime) / stepLength)
      predictionMap.set(timeStep, record.velocity_record)
    })
    for (let i = 0; i < DISPLAY_STEPS; i++) {
      const timeStep = currentTimeStep + i
      const timestamp = measurementStartTime + timeStep * stepLength
      const dataPoint: any = {
        timeStep,
        timestamp: formatTimestamp(timestamp),
        displayStep: `步骤 ${timeStep + 1}`,
      }
      if (measurementMap.has(timeStep)) dataPoint.measurement = measurementMap.get(timeStep)
      if (predictionMap.has(timeStep)) dataPoint.prediction = predictionMap.get(timeStep)
      data.push(dataPoint)
    }
    return data
  }, [stationData, currentTimeStep, stepLength, measurementStartTime])

  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return ["auto", "auto"]
    const allValues: number[] = []
    chartData.forEach((item) => {
      if (item.measurement !== undefined) allValues.push(item.measurement)
      if (item.prediction !== undefined) allValues.push(item.prediction)
    })
    if (allValues.length === 0) return ["auto", "auto"]
    const min = Math.min(...allValues)
    const max = Math.max(...allValues)
    const range = max - min
    const yMin = min - range * 0.1
    const yMax = max + range * 0.1
    return [yMin, yMax]
  }, [chartData])

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

  const CustomTooltip = ({ active, payload }: any) => {
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
  // --- 结束: 原有计算逻辑 ---

  return (
    <div
      className={`fixed top-0 right-0 h-full w-96 border-l shadow-xl z-20 flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "translate-x-full"}
        bg-white/70 dark:bg-zinc-900/60 backdrop-blur-lg rounded-l-2xl
        !overflow-hidden`}
      style={{ boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.18)" }}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">数据分析面板</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 新增: 视图切换器 */}
        <div className="p-2 border-b">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={activeView === "details" ? "secondary" : "ghost"}
              onClick={() => setActiveView("details")}
              size="sm"
            >
              站点详情
            </Button>
            <Button
              variant={activeView === "stats" ? "secondary" : "ghost"}
              onClick={() => setActiveView("stats")}
              size="sm"
            >
              场景统计
            </Button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeView === "stats" && <SceneStatisticsView stats={sceneStatistics} />}

          {activeView === "details" &&
            (!stationData ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 pt-16">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">未选择站点</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    请在地图上点击站点, 或切换到“场景统计”查看全局数据.
                  </p>
                </div>
              </div>
            ) : (
              // 这是原有的站点详情内容
              <div className="space-y-4">
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

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">数据趋势</CardTitle>
                    <CardDescription className="text-xs">未来20个时间步的数据变化</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {chartData.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                            <YAxis domain={yAxisDomain} tick={{ fontSize: 10 }} label={{ value: "速度 (km/h)", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: "12px" }} iconType="line" />
                            <Line type="monotone" dataKey="measurement" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="测量数据" connectNulls={false} />
                            <Line type="monotone" dataKey="prediction" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="预测数据" connectNulls={false} />
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

                {statistics && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="w-4 h-4" />
                        数据统计
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium">测量数据</span>
                          <Badge variant="outline" className="text-xs">{statistics.measurementStats.count} 条记录</Badge>
                        </div>
                        {statistics.measurementStats.count > 0 ? (
                          <div className="grid grid-cols-3 gap-2 text-xs pl-6">
                            <div><span className="text-muted-foreground">平均:</span><p className="font-medium">{statistics.measurementStats.average.toFixed(1)} km/h</p></div>
                            <div><span className="text-muted-foreground">最大:</span><p className="font-medium">{statistics.measurementStats.max.toFixed(1)} km/h</p></div>
                            <div><span className="text-muted-foreground">最小:</span><p className="font-medium">{statistics.measurementStats.min.toFixed(1)} km/h</p></div>
                          </div>
                        ) : (<p className="text-xs text-muted-foreground pl-6">暂无测量数据</p>)}
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-medium">预测数据</span>
                          <Badge variant="outline" className="text-xs">{statistics.predictionStats.count} 条记录</Badge>
                        </div>
                        {statistics.predictionStats.count > 0 ? (
                          <div className="grid grid-cols-3 gap-2 text-xs pl-6">
                            <div><span className="text-muted-foreground">平均:</span><p className="font-medium">{statistics.predictionStats.average.toFixed(1)} km/h</p></div>
                            <div><span className="text-muted-foreground">最大:</span><p className="font-medium">{statistics.predictionStats.max.toFixed(1)} km/h</p></div>
                            <div><span className="text-muted-foreground">最小:</span><p className="font-medium">{statistics.predictionStats.min.toFixed(1)} km/h</p></div>
                          </div>
                        ) : (<p className="text-xs text-muted-foreground pl-6">暂无预测数据</p>)}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}