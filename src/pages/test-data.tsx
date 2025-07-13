"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/services/api"
import { Play, Pause, Database, MapPin, Clock, Activity, TrendingUp, Loader2, CheckCircle, Zap } from "lucide-react"

// 数据类型定义
interface Scene {
  scene_id: number
  name: string
  description: string
  step_length: number
  area: string
  area_id: number
  measurement_start_time: number
  measurement_end_time: number
}

interface Location {
  location_id: number
  longitude: number
  latitude: number
}

interface GraphEdge {
  edge_id: number
  start_vertex: number
  end_vertex: number
}

interface FlowRecord {
  record_id: number
  time: number
  velocity_record: number
}

interface LocationMeasurement {
  location_id: number
  flow_data: FlowRecord[]
}

interface TrafficData {
  info: string
  start_time: number
  step: number
  measurements: LocationMeasurement[]
}

// API响应类型
interface ScenesResponse {
  code: number
  message: {
    info: string
    scenes: Scene[]
  }
}

interface LocationsResponse {
  code: number
  message: {
    info: string
    locations: Location[]
  }
}

interface GraphResponse {
  code: number
  message: {
    graph: GraphEdge[]
  }
}

interface TrafficResponse {
  code: number
  message: TrafficData
}

// 时间步状态类型
type TimeStepStatus =
  | "unloaded"
  | "measurement_loaded"
  | "prediction_loaded"
  | "both_loaded";

const TimeStepStatus = {
  UNLOADED: "unloaded" as TimeStepStatus,
  MEASUREMENT_LOADED: "measurement_loaded" as TimeStepStatus,
  PREDICTION_LOADED: "prediction_loaded" as TimeStepStatus,
  BOTH_LOADED: "both_loaded" as TimeStepStatus,
};

// 数据缓存管理
class DataCache {
  private measurementCache = new Map<string, TrafficData>()
  private predictionCache = new Map<string, TrafficData>()
  private timeStepStatus = new Map<number, TimeStepStatus>() // 记录每个时间步的加载状态

  getCacheKey(sceneId: number, startTime: number, step: number): string {
    return `${sceneId}-${startTime}-${step}`
  }

  getTimeStepStatus(timeStep: number): TimeStepStatus {
    return this.timeStepStatus.get(timeStep) || TimeStepStatus.UNLOADED
  }

  setTimeStepStatus(timeStep: number, status: TimeStepStatus): void {
    this.timeStepStatus.set(timeStep, status)
  }

  updateTimeStepStatus(timeStep: number, isPredicton: boolean): void {
    const currentStatus = this.getTimeStepStatus(timeStep)

    if (isPredicton) {
      if (currentStatus === TimeStepStatus.MEASUREMENT_LOADED) {
        this.setTimeStepStatus(timeStep, TimeStepStatus.BOTH_LOADED)
      } else {
        this.setTimeStepStatus(timeStep, TimeStepStatus.PREDICTION_LOADED)
      }
    } else {
      if (currentStatus === TimeStepStatus.PREDICTION_LOADED) {
        this.setTimeStepStatus(timeStep, TimeStepStatus.BOTH_LOADED)
      } else {
        this.setTimeStepStatus(timeStep, TimeStepStatus.MEASUREMENT_LOADED)
      }
    }
  }

  hasMeasurement(sceneId: number, startTime: number, step: number): boolean {
    return this.measurementCache.has(this.getCacheKey(sceneId, startTime, step))
  }

  hasPrediction(sceneId: number, startTime: number, step: number): boolean {
    return this.predictionCache.has(this.getCacheKey(sceneId, startTime, step))
  }

  setMeasurement(sceneId: number, startTime: number, step: number, data: TrafficData): void {
    this.measurementCache.set(this.getCacheKey(sceneId, startTime, step), data)
  }

  setPrediction(sceneId: number, startTime: number, step: number, data: TrafficData): void {
    this.predictionCache.set(this.getCacheKey(sceneId, startTime, step), data)
  }

  getMeasurement(sceneId: number, startTime: number, step: number): TrafficData | undefined {
    return this.measurementCache.get(this.getCacheKey(sceneId, startTime, step))
  }

  getPrediction(sceneId: number, startTime: number, step: number): TrafficData | undefined {
    return this.predictionCache.get(this.getCacheKey(sceneId, startTime, step))
  }

  getAllTimeStepStatuses(): Map<number, TimeStepStatus> {
    return new Map(this.timeStepStatus)
  }

  clear(): void {
    this.measurementCache.clear()
    this.predictionCache.clear()
    this.timeStepStatus.clear()
  }
}

export default function TestDataPage() {
  const { toast } = useToast()
  const dataCache = useRef(new DataCache())

  // 基础状态
  const [scenes, setScenes] = useState<Scene[]>([])
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([])

  // 时间控制状态
  const [currentTimeStep, setCurrentTimeStep] = useState(0)
  const [totalTimeSteps, setTotalTimeSteps] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [timeStepStatuses, setTimeStepStatuses] = useState<Map<number, TimeStepStatus>>(new Map())

  // 数据状态
  const [currentMeasurementData, setCurrentMeasurementData] = useState<TrafficData | null>(null)
  const [currentPredictionData, setCurrentPredictionData] = useState<TrafficData | null>(null)

  // 加载状态
  const [loadingStates, setLoadingStates] = useState({
    scenes: false,
    locations: false,
    graph: false,
    measurements: false,
    predictions: false,
    backgroundLoading: false, // 后台加载状态
  })

  const playIntervalRef = useRef<NodeJS.Timeout | null>(null)
  // Ref to control and interrupt the streaming load process
  const loadingControllerRef = useRef({ abort: false })

  // 显示提示消息
  const showToast = useCallback(
    (message: string, variant: "default" | "destructive" | "success" = "default") => {
      toast({
        title: variant === "destructive" ? "错误" : variant === "success" ? "成功" : "提示",
        description: message,
        variant: variant === "destructive" ? "destructive" : variant === "success" ? "success" : "default",
      })
    },
    [toast],
  )

  // 获取所有场景信息
  const fetchScenes = useCallback(async () => {
    setLoadingStates((prev) => ({ ...prev, scenes: true }))
    try {
      const response = await apiService.get<ScenesResponse>("/traffic/scenes")

      if (response.success && response.data?.code === 0) {
        setScenes(response.data.message.scenes)
        showToast(`成功加载 ${response.data.message.scenes.length} 个场景`, "success")
      } else {
        showToast("获取场景信息失败", "destructive")
      }
    } catch (error) {
      showToast("网络请求失败", "destructive")
    } finally {
      setLoadingStates((prev) => ({ ...prev, scenes: false }))
    }
  }, [showToast])

  // 获取场景的地点信息
  const fetchLocations = useCallback(
    async (sceneId: number) => {
      setLoadingStates((prev) => ({ ...prev, locations: true }))
      try {
        const response = await apiService.get<LocationsResponse>(`/traffic/scenes/${sceneId}/locations`)

        if (response.success && response.data?.code === 0) {
          setLocations(response.data.message.locations)
          return response.data.message.locations
        } else {
          showToast("获取地点信息失败", "destructive")
          return []
        }
      } catch (error) {
        showToast("获取地点信息失败", "destructive")
        return []
      } finally {
        setLoadingStates((prev) => ({ ...prev, locations: false }))
      }
    },
    [showToast],
  )

  // 获取图结构信息
  const fetchGraph = useCallback(
    async (areaId: number) => {
      setLoadingStates((prev) => ({ ...prev, graph: true }))
      try {
        const response = await apiService.get<GraphResponse>(`/traffic/graph?area_id=${areaId}`)

        if (response.success && response.data?.code === 0) {
          setGraphEdges(response.data.message.graph)
          return response.data.message.graph
        } else {
          showToast("获取图结构信息失败", "destructive")
          return []
        }
      } catch (error) {
        showToast("获取图结构信息失败", "destructive")
        return []
      } finally {
        setLoadingStates((prev) => ({ ...prev, graph: false }))
      }
    },
    [showToast],
  )

  // 获取测量数据
  const fetchMeasurementData = useCallback(
    async (sceneId: number, startTime: number, step = 12) => {
      // 检查缓存
      if (dataCache.current.hasMeasurement(sceneId, startTime, step)) {
        return dataCache.current.getMeasurement(sceneId, startTime, step)!
      }

      try {
        const response = await apiService.get<TrafficResponse>(
          `/traffic/scenes/${sceneId}/locations/traffic-measurements?start_time=${startTime}&step=${step}`,
        )

        if (response.success && response.data?.code === 0) {
          const data = response.data.message
          // Cache the entire chunk of data
          dataCache.current.setMeasurement(sceneId, startTime, step, data)
          return data
        } else {
          showToast("获取测量数据失败", "destructive")
          return null
        }
      } catch (error) {
        showToast("获取测量数据失败", "destructive")
        return null
      }
    },
    [showToast],
  )

  // 获取预测数据
  const fetchPredictionData = useCallback(
    async (sceneId: number, startTime: number, step = 12) => {
      // 检查缓存
      if (dataCache.current.hasPrediction(sceneId, startTime, step)) {
        return dataCache.current.getPrediction(sceneId, startTime, step)!
      }

      try {
        const response = await apiService.get<TrafficResponse>(
          `/traffic/scenes/${sceneId}/locations/traffic-predictions?start_time=${startTime}&step=${step}`,
        )

        if (response.success && response.data?.code === 0) {
          const data = response.data.message
          dataCache.current.setPrediction(sceneId, startTime, step, data)
          return data
        } else {
          showToast("获取预测数据失败", "destructive")
          return null
        }
      } catch (error) {
        showToast("获取预测数据失败", "destructive")
        return null
      }
    },
    [showToast],
  )

  // 后台同步加载数据（从当前时间步向右加载）
  /**
   * NEW: Manages the streaming buffer for measurement data.
   * It loads data in chunks, prioritizing the area to the right of the cursor,
   * then wraps around to fill in the rest.
   */
  const manageStreamingBuffer = useCallback(
    async (cursorTimeStep: number, controller: { abort: boolean }) => {
      if (!selectedScene) return

      setLoadingStates((prev) => ({ ...prev, backgroundLoading: true }))
      const CHUNK_SIZE = 12

      try {
        // Phase 1: Load data to the right of the cursor
        for (let i = cursorTimeStep; i < totalTimeSteps; i++) {
          if (controller.abort) return

          const status = dataCache.current.getTimeStepStatus(i)
          if (status === TimeStepStatus.UNLOADED || status === TimeStepStatus.PREDICTION_LOADED) {
            const startTime = selectedScene.measurement_start_time + i * selectedScene.step_length
            const data = await fetchMeasurementData(selectedScene.scene_id, startTime, CHUNK_SIZE)

            if (controller.abort) return
            if (!data) break // Stop this cycle on fetch error

            // Update status for all time steps in the fetched chunk
            for (let j = 0; j < CHUNK_SIZE && i + j < totalTimeSteps; j++) {
              dataCache.current.updateTimeStepStatus(i + j, false)
            }
            setTimeStepStatuses(new Map(dataCache.current.getAllTimeStepStatuses()))

            // If the cursor is still inside this newly loaded chunk, display the data
            if (currentTimeStep >= i && currentTimeStep < i + CHUNK_SIZE) {
               setCurrentMeasurementData(data)
            }
            
            i += CHUNK_SIZE - 1 // Jump the loop counter forward
            await new Promise((resolve) => setTimeout(resolve, 100)) // Prevent spamming API
          }
        }

        if (controller.abort) return

        // Phase 2: Wrap around and load data from the beginning (left of the cursor)
        for (let i = 0; i < cursorTimeStep; i++) {
          if (controller.abort) return

          const status = dataCache.current.getTimeStepStatus(i)
          if (status === TimeStepStatus.UNLOADED || status === TimeStepStatus.PREDICTION_LOADED) {
            const startTime = selectedScene.measurement_start_time + i * selectedScene.step_length
            const data = await fetchMeasurementData(selectedScene.scene_id, startTime, CHUNK_SIZE)

            if (controller.abort) return
            if (!data) break 

            for (let j = 0; j < CHUNK_SIZE && i + j < cursorTimeStep; j++) {
              dataCache.current.updateTimeStepStatus(i + j, false)
            }
            setTimeStepStatuses(new Map(dataCache.current.getAllTimeStepStatuses()))
            
            i += CHUNK_SIZE - 1
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
        }
      } finally {
        if (!controller.abort) {
          setLoadingStates((prev) => ({ ...prev, backgroundLoading: false }))
        }
      }
    },
    [selectedScene, totalTimeSteps, fetchMeasurementData, currentTimeStep],
  )

  // 手动请求预测数据
  const handleRequestPrediction = useCallback(async () => {
    if (!selectedScene) return

    setLoadingStates((prev) => ({ ...prev, predictions: true }))

    try {
      const targetTime = selectedScene.measurement_start_time + currentTimeStep * selectedScene.step_length
      const data = await fetchPredictionData(selectedScene.scene_id, targetTime)

      if (data) {
        dataCache.current.updateTimeStepStatus(currentTimeStep, true)
        setTimeStepStatuses(new Map(dataCache.current.getAllTimeStepStatuses()))
        setCurrentPredictionData(data)
        showToast("预测数据加载成功", "success")
      }
    } finally {
      setLoadingStates((prev) => ({ ...prev, predictions: false }))
    }
  }, [selectedScene, currentTimeStep, fetchPredictionData, showToast])

  // 选择场景
  const handleSceneSelect = useCallback(
    (scene: Scene) => {
      // Abort any ongoing loading from a previous scene
      loadingControllerRef.current.abort = true

      setSelectedScene(scene)
      setCurrentTimeStep(0)
      
      const steps = Math.floor((scene.measurement_end_time - scene.measurement_start_time) / scene.step_length)
      setTotalTimeSteps(steps)

      // Clear all previous data and statuses
      setCurrentMeasurementData(null)
      setCurrentPredictionData(null)
      dataCache.current.clear()
      setTimeStepStatuses(new Map())

      showToast(`已选择场景: ${scene.name}`, "success")
    },
    [showToast],
  )

  // 加载数据
  const handleLoadData = useCallback(async () => {
    if (!selectedScene) return

    showToast("开始加载数据...", "default")
    
    // Abort previous loading process and create a new one
    loadingControllerRef.current.abort = true
    loadingControllerRef.current = { abort: false }

    const [locationsData, graphData] = await Promise.all([
      fetchLocations(selectedScene.scene_id),
      fetchGraph(selectedScene.area_id),
    ])

    if (locationsData.length > 0 && graphData.length > 0) {
      showToast(`成功加载 ${locationsData.length} 个地点和 ${graphData.length} 条边`, "success")
      
      // Start streaming from the beginning (time step 0)
      manageStreamingBuffer(0, loadingControllerRef.current)
    }
  }, [selectedScene, fetchLocations, fetchGraph, manageStreamingBuffer, showToast])

  // 时间步变化处理
  const handleTimeStepChange = useCallback(
    async (newTimeStep: number) => {
      if (newTimeStep === currentTimeStep || !selectedScene) return

      setCurrentTimeStep(newTimeStep)

      // Abort the previous loading process and create a new controller for the new one
      loadingControllerRef.current.abort = true
      const newController = { abort: false }
      loadingControllerRef.current = newController

      const CHUNK_SIZE = 12
      // Find the start of the chunk that this time step belongs to
      const chunkStartStep = Math.floor(newTimeStep / CHUNK_SIZE) * CHUNK_SIZE
      const chunkStartTime = selectedScene.measurement_start_time + chunkStartStep * selectedScene.step_length

      // Immediately try to update view from cache using the correct chunk key
      const cachedMeasurement = dataCache.current.getMeasurement(selectedScene.scene_id, chunkStartTime, CHUNK_SIZE)
      setCurrentMeasurementData(cachedMeasurement || null)
      
      const targetTime = selectedScene.measurement_start_time + newTimeStep * selectedScene.step_length
      const cachedPrediction = dataCache.current.getPrediction(selectedScene.scene_id, targetTime, 12)
      setCurrentPredictionData(cachedPrediction || null)

      // Start the streaming load from the new cursor position.
      manageStreamingBuffer(newTimeStep, newController)
    },
    [selectedScene, locations.length, currentTimeStep, manageStreamingBuffer],
  )

  // 播放控制
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
        playIntervalRef.current = null
      }
      setIsPlaying(false)
    } else {
      setIsPlaying(true)
      playIntervalRef.current = setInterval(() => {
        setCurrentTimeStep((prev) => {
          const next = prev + 1
          if (next >= totalTimeSteps) {
            setIsPlaying(false)
            return prev
          }
          return next
        })
      }, 2000) // 每2秒切换一个时间步
    }
  }, [isPlaying, totalTimeSteps])

  // 格式化时间戳
  const formatTimestamp = useCallback((timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }, [])

  // 计算当前时间戳
  const getCurrentTimestamp = useCallback(() => {
    if (!selectedScene) return 0
    return selectedScene.measurement_start_time + currentTimeStep * selectedScene.step_length
  }, [selectedScene, currentTimeStep])

  // 自定义Slider样式
  const getSliderStyle = useCallback(() => {
    if (!selectedScene || totalTimeSteps === 0) return {}

    const gradientStops: string[] = []

    for (let i = 0; i < totalTimeSteps; i++) {
      const percentage = (i / (totalTimeSteps - 1)) * 100
      const status = timeStepStatuses.get(i) || TimeStepStatus.UNLOADED

      let color = "#e2e8f0" // 默认未加载颜色 (slate-200)

      switch (status) {
        case TimeStepStatus.MEASUREMENT_LOADED:
          color = "#ff5d5dff" // 蓝色浅色 (blue-100)
          break
        case TimeStepStatus.PREDICTION_LOADED:
          color = "#e7c950ff" // 黄色浅色 (amber-100)
          break
        case TimeStepStatus.BOTH_LOADED:
          color = "#3fee7cff" // 绿色浅色 (green-100)
          break
      }

      gradientStops.push(`${color} ${percentage}%`)
    }

    return {
      background: `linear-gradient(to right, ${gradientStops.join(", ")})`,
    }
  }, [selectedScene, totalTimeSteps, timeStepStatuses])

  // 组件挂载时获取场景数据
  useEffect(() => {
    fetchScenes()
  }, [fetchScenes])

  // 清理定时器和后台加载
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }

    }
  }, [])

  return (
    <div className="p-6 space-y-6 animate-in fade-in-0 duration-500">
      {/* 页面标题 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight transition-colors duration-300 ease-in-out">数据测试页面</h1>
        <p className="text-muted-foreground transition-colors duration-300 ease-in-out">交通数据测试与可视化平台</p>
      </div>

      {/* 场景选择区域 */}
      <Card className="transition-all duration-300 ease-in-out">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            场景信息
            {loadingStates.scenes && <Loader2 className="w-4 h-4 animate-spin" />}
          </CardTitle>
          <CardDescription>选择要分析的交通场景</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {scenes.map((scene) => (
              <Card
                key={scene.scene_id}
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  selectedScene?.scene_id === scene.scene_id ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
                onClick={() => handleSceneSelect(scene)}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{scene.name}</h3>
                      {selectedScene?.scene_id === scene.scene_id && <CheckCircle className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{scene.description}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline">{scene.area}</Badge>
                      <Badge variant="outline">步长: {scene.step_length}s</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <div>开始: {formatTimestamp(scene.measurement_start_time)}</div>
                      <div>结束: {formatTimestamp(scene.measurement_end_time)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedScene && (
            <div className="mt-4 pt-4 border-t">
              <Button
                onClick={handleLoadData}
                disabled={loadingStates.locations || loadingStates.graph}
                className="transition-all duration-300 ease-in-out"
              >
                {(loadingStates.locations || loadingStates.graph) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                加载数据
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 时间控制区域 */}
      {selectedScene && locations.length > 0 && (
        <Card className="transition-all duration-300 ease-in-out animate-in slide-in-from-bottom-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              时间控制
              {loadingStates.backgroundLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
            </CardTitle>
            <CardDescription>
              当前时间: {formatTimestamp(getCurrentTimestamp())} | 步骤: {currentTimeStep + 1} / {totalTimeSteps}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 自定义进度条 */}
            <div className="space-y-2">
              <div className="relative">
                {/* 背景进度条 */}
                <div className="h-2 rounded-full border" style={getSliderStyle()} />
                {/* 原始滑块 */}
                <Slider
                  value={[currentTimeStep]}
                  onValueChange={([value]) => handleTimeStepChange(value)}
                  max={totalTimeSteps - 1}
                  step={1}
                  className="absolute inset-0 [&>span:first-child]:bg-transparent [&>span:first-child]:border-0"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTimestamp(selectedScene.measurement_start_time)}</span>
                <span>{formatTimestamp(selectedScene.measurement_end_time)}</span>
              </div>

              {/* 图例 */}
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-slate-200"></div>
                  <span>未加载</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-100"></div>
                  <span>已加载测量数据</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-amber-100"></div>
                  <span>已加载预测数据</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-100"></div>
                  <span>已加载全部数据</span>
                </div>
              </div>
            </div>

            {/* 控制按钮 */}
            <div className="flex items-center gap-4">
              <Button
                onClick={handlePlayPause}
                variant="outline"
                size="sm"
                className="transition-all duration-300 ease-in-out bg-transparent"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? "暂停" : "播放"}
              </Button>

              <Button
                onClick={handleRequestPrediction}
                variant="outline"
                size="sm"
                disabled={loadingStates.predictions}
                className="transition-all duration-300 ease-in-out bg-transparent"
              >
                {loadingStates.predictions ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                请求预测数据
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 数据展示区域 */}
      {(currentMeasurementData || currentPredictionData) && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* 测量数据 */}
          {currentMeasurementData && (
            <Card className="transition-all duration-300 ease-in-out animate-in slide-in-from-left-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  当前测量数据
                </CardTitle>
                <CardDescription>
                  时间: {formatTimestamp(getCurrentTimestamp())} | 地点数: {currentMeasurementData.measurements.length}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {currentMeasurementData.measurements.map((measurement) => {
                    // 计算当前时间步的精确时间戳
                    let exactCurrentTime = 0;
                    let currentTimeData = undefined;
                    if (selectedScene) {
                      exactCurrentTime = selectedScene.measurement_start_time + currentTimeStep * selectedScene.step_length;
                      currentTimeData = measurement.flow_data.find(
                        (record) => Math.abs(record.time - exactCurrentTime) <= selectedScene.step_length / 2,
                      ) || measurement.flow_data[0];
                    } else {
                      currentTimeData = measurement.flow_data[0];
                    }

                    return (
                      <div key={measurement.location_id} className="p-3 bg-muted/50 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">地点 {measurement.location_id}</span>
                          <Badge variant="outline" className="text-xs">
                            <MapPin className="w-3 h-3 mr-1" />
                            ID: {measurement.location_id}
                          </Badge>
                        </div>
                        {currentTimeData ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">流量速度</span>
                              <span className="font-mono text-sm font-semibold text-primary">
                                {currentTimeData.velocity_record.toFixed(2)} km/h
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">记录时间</span>
                              <span className="text-xs font-mono">{formatTimestamp(exactCurrentTime)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">记录ID</span>
                              <span className="text-xs font-mono">#{currentTimeData.record_id}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground text-center py-2">当前时间步无数据</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 预测数据 */}
          {currentPredictionData && (
            <Card className="transition-all duration-300 ease-in-out animate-in slide-in-from-right-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  当前预测数据
                </CardTitle>
                <CardDescription>
                  时间: {formatTimestamp(getCurrentTimestamp())} | 地点数: {currentPredictionData.measurements.length}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {currentPredictionData.measurements.map((measurement) => {
                    // 找到当前时间步对应的预测数据点
                    const currentTimeData =
                      measurement.flow_data.find((record) => record.time === getCurrentTimestamp()) ||
                      measurement.flow_data[0] // 如果找不到精确匹配，使用第一个数据点

                    return (
                      <div
                        key={measurement.location_id}
                        className="p-3 bg-primary/5 rounded-lg border border-primary/20"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">地点 {measurement.location_id}</span>
                          <Badge variant="default" className="text-xs">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            预测
                          </Badge>
                        </div>
                        {currentTimeData ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">预测速度</span>
                              <span className="font-mono text-sm font-semibold text-primary">
                                {currentTimeData.velocity_record.toFixed(2)} km/h
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">预测时间</span>
                              <span className="text-xs font-mono">{formatTimestamp(currentTimeData.time)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">预测ID</span>
                              <span className="text-xs font-mono">#{currentTimeData.record_id}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground text-center py-2">当前时间步无预测数据</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 统计信息 */}
      {selectedScene && (
        <Card className="transition-all duration-300 ease-in-out">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              统计信息
            </CardTitle>
            <CardDescription>
              当前时间步: {currentTimeStep + 1} / {totalTimeSteps}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{locations.length}</div>
                <div className="text-sm text-muted-foreground">地点数量</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{graphEdges.length}</div>
                <div className="text-sm text-muted-foreground">连接边数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{totalTimeSteps}</div>
                <div className="text-sm text-muted-foreground">时间步数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {
                    Array.from(timeStepStatuses.values()).filter(
                      (status) => status === TimeStepStatus.MEASUREMENT_LOADED || status === TimeStepStatus.BOTH_LOADED,
                    ).length
                  }
                </div>
                <div className="text-sm text-muted-foreground">已加载测量</div>
              </div>
            </div>

            {/* 添加当前时间信息 */}
            <div className="mt-4 pt-4 border-t">
              <div className="grid gap-2 md:grid-cols-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">当前时间:</span>
                  <span className="font-mono">{formatTimestamp(getCurrentTimestamp())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">步长:</span>
                  <span className="font-mono">{selectedScene.step_length}秒</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
