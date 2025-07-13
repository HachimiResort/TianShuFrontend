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

// 定义时间步状态颜色常量，便于统一维护
const TIME_STEP_STATUS_COLORS = {
  [TimeStepStatus.UNLOADED]: "#e2e8f0", // slate-200
  [TimeStepStatus.MEASUREMENT_LOADED]: "#ff5d5dff", // 蓝色浅色
  [TimeStepStatus.PREDICTION_LOADED]: "#e7c950ff", // 黄色浅色
  [TimeStepStatus.BOTH_LOADED]: "#3fee7cff", // 绿色浅色
};

// 单个时间步所有地点的数据
// key: location_id, value: FlowRecord
// 用于渲染卡片
// eslint-disable-next-line @typescript-eslint/ban-types
// eslint-disable-next-line @typescript-eslint/no-empty-interface
type PerLocationData = Map<number, FlowRecord>

interface TimeStepData {
  measurement?: PerLocationData
  prediction?: PerLocationData
}

// 数据缓存管理
class DataCache {
  // 缓存原始数据块，避免重复请求
  private chunkCache = new Map<string, TrafficData>()
  // 按时间步缓存处理后的数据
  private timeStepDataCache = new Map<number, TimeStepData>()
  // 进度条状态
  private timeStepStatus = new Map<number, TimeStepStatus>()

  getChunkCacheKey(sceneId: number, startTime: number, step: number): string {
    return `${sceneId}-${startTime}-${step}`
  }

  hasChunk(sceneId: number, startTime: number, step: number): boolean {
    return this.chunkCache.has(this.getChunkCacheKey(sceneId, startTime, step))
  }

  getChunk(sceneId: number, startTime: number, step: number): TrafficData | undefined {
    return this.chunkCache.get(this.getChunkCacheKey(sceneId, startTime, step))
  }

  // 处理数据块并拆分到每个时间步
  processAndCacheData(
    scene: Scene,
    chunkData: TrafficData,
    isPrediction: boolean,
  ): void {
    const key = this.getChunkCacheKey(scene.scene_id, chunkData.start_time, chunkData.step)
    this.chunkCache.set(key, chunkData)

    chunkData.measurements.forEach((locationMeasurement) => {
      locationMeasurement.flow_data.forEach((flowRecord) => {
        // 计算该数据点属于哪个时间步
        const timeStep = Math.round(
          (flowRecord.time - scene.measurement_start_time) / scene.step_length
        );
        const currentStepData = this.timeStepDataCache.get(timeStep) || {}
        const dataMap = isPrediction ? "prediction" : "measurement"
        if (!currentStepData[dataMap]) {
          currentStepData[dataMap] = new Map<number, FlowRecord>()
        }
        currentStepData[dataMap]!.set(locationMeasurement.location_id, flowRecord)
        this.timeStepDataCache.set(timeStep, currentStepData)
        this.updateTimeStepStatus(timeStep, isPrediction)
      })
    })
  }

  getDataForTimeStep(timeStep: number): TimeStepData | undefined {
    return this.timeStepDataCache.get(timeStep)
  }

  getTimeStepStatus(timeStep: number): TimeStepStatus {
    return this.timeStepStatus.get(timeStep) || TimeStepStatus.UNLOADED
  }

  setTimeStepStatus(timeStep: number, status: TimeStepStatus): void {
    this.timeStepStatus.set(timeStep, status)
  }

  updateTimeStepStatus(timeStep: number, isPrediction: boolean): void {
    const currentStatus = this.getTimeStepStatus(timeStep)
    if (isPrediction) {
      if (currentStatus === TimeStepStatus.MEASUREMENT_LOADED) {
        this.setTimeStepStatus(timeStep, TimeStepStatus.BOTH_LOADED)
      } else if (currentStatus === TimeStepStatus.BOTH_LOADED) {
        // do nothing
      } else {
        this.setTimeStepStatus(timeStep, TimeStepStatus.PREDICTION_LOADED)
      }
    } else {
      if (currentStatus === TimeStepStatus.PREDICTION_LOADED) {
        this.setTimeStepStatus(timeStep, TimeStepStatus.BOTH_LOADED)
      } else if (currentStatus === TimeStepStatus.BOTH_LOADED) {
        // do nothing
      } else {
        this.setTimeStepStatus(timeStep, TimeStepStatus.MEASUREMENT_LOADED)
      }
    }
  }

  getAllTimeStepStatuses(): Map<number, TimeStepStatus> {
    return new Map(this.timeStepStatus)
  }

  clear(): void {
    this.chunkCache.clear()
    this.timeStepDataCache.clear()
    this.timeStepStatus.clear()
  }
}

export default function TestDataPage() {
  const { toast } = useToast()
  const dataCache = useRef(new DataCache())
  // 拖拽相关状态
  const [isDragging, setIsDragging] = useState(false)

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
  // REFACTORED: State now holds processed data for the *current* step only, not the whole chunk.
  const [currentMeasurementData, setCurrentMeasurementData] = useState<PerLocationData | null>(null)
  const [currentPredictionData, setCurrentPredictionData] = useState<PerLocationData | null>(null)

  // 加载状态
  const [loadingStates, setLoadingStates] = useState({
    scenes: false,
    locations: false,
    graph: false,
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

  // REFACTORED: Fetches data and immediately processes it into the granular cache.
  const fetchAndProcessMeasurementData = useCallback(
    async (scene: Scene, startTime: number, step = 12) => {
      if (dataCache.current.hasChunk(scene.scene_id, startTime, step)) {
        return dataCache.current.getChunk(scene.scene_id, startTime, step)!
      }
      try {
        const response = await apiService.get<TrafficResponse>(
          `/traffic/scenes/${scene.scene_id}/locations/traffic-measurements?start_time=${startTime}&step=${step}`,
        )
        if (response.success && response.data?.code === 0) {
          const data = response.data.message
          dataCache.current.processAndCacheData(scene, data, false)
          return data
        }
        return null
      } catch (error) {
        showToast("获取测量数据失败", "destructive")
        return null
      }
    },
    [showToast],
  )

  // REFACTORED: Fetches prediction data and processes it.
  const fetchAndProcessPredictionData = useCallback(
    async (scene: Scene, startTime: number, step = 30) => {
      if (dataCache.current.hasChunk(scene.scene_id, startTime, step)) {
        return dataCache.current.getChunk(scene.scene_id, startTime, step)!
      }
      try {
        const response = await apiService.get<TrafficResponse>(
          `/traffic/scenes/${scene.scene_id}/locations/traffic-predictions?start_time=${startTime}&step=${step}`,
        )
        if (response.success && response.data?.code === 0) {
          const data = response.data.message
          if (!data.measurements || data.measurements.length === 0) {
            showToast("该时间段暂无预测数据", "default")
            return null
          }
          dataCache.current.processAndCacheData(scene, data, true)
          return data
        }
        return null
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
            const data = await fetchAndProcessMeasurementData(selectedScene, startTime, CHUNK_SIZE)

            if (controller.abort) return
            if (!data) break // Stop this cycle on fetch error

            // Update status for all time steps in the fetched chunk
            for (let j = 0; j < CHUNK_SIZE && i + j < totalTimeSteps; j++) {
              dataCache.current.updateTimeStepStatus(i + j, false)
            }
            setTimeStepStatuses(new Map(dataCache.current.getAllTimeStepStatuses()))

            // If the cursor is still inside this newly loaded chunk, display the data
            if (currentTimeStep >= i && currentTimeStep < i + CHUNK_SIZE) {
               // REFACTORED: Update the view for the current step after fetching.
               const stepData = dataCache.current.getDataForTimeStep(currentTimeStep)
               setCurrentMeasurementData(stepData?.measurement || null)
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
            const data = await fetchAndProcessMeasurementData(selectedScene, startTime, CHUNK_SIZE)

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
    [selectedScene, totalTimeSteps, fetchAndProcessMeasurementData, currentTimeStep],
  )

  // handleRequestPrediction 逻辑调整
  const handleRequestPrediction = useCallback(async () => {
    if (!selectedScene) return
    setLoadingStates((prev) => ({ ...prev, predictions: true }))
    try {
      const targetTime = selectedScene.measurement_start_time + currentTimeStep * selectedScene.step_length
      const data = await fetchAndProcessPredictionData(selectedScene, targetTime, 30)
      for (let i = 0; i < 30 && currentTimeStep + i < totalTimeSteps; i++) {
        dataCache.current.updateTimeStepStatus(currentTimeStep + i, true)
      }
      setTimeStepStatuses(new Map(dataCache.current.getAllTimeStepStatuses()))
      if (data) {
        showToast("预测数据加载成功", "success")
        // REFACTORED: Update the view for the current step after fetching.
        const stepData = dataCache.current.getDataForTimeStep(currentTimeStep)
        setCurrentPredictionData(stepData?.prediction || null)
      } else {
        setCurrentPredictionData(null)
        showToast("该时间段暂无预测数据", "default")
      }
    } catch (error) {
      setCurrentPredictionData(null)
      showToast("预测数据请求失败", "destructive")
    } finally {
      setLoadingStates((prev) => ({ ...prev, predictions: false }))
    }
  }, [selectedScene, currentTimeStep, fetchAndProcessPredictionData, showToast, totalTimeSteps])

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

  // handleTimeStepChange 只更新 currentTimeStep
  const handleTimeStepChange = useCallback((newTimeStep: number) => {
    if (newTimeStep === currentTimeStep || !selectedScene) return;
    setCurrentTimeStep(newTimeStep);
  }, [selectedScene, currentTimeStep]);

  // 监听 currentTimeStep 变化，自动从缓存拉取数据
  useEffect(() => {
    if (!selectedScene) return;
    const dataForStep = dataCache.current.getDataForTimeStep(currentTimeStep);
    setCurrentMeasurementData(dataForStep?.measurement ?? null);
    setCurrentPredictionData(dataForStep?.prediction ?? null);
  }, [currentTimeStep, selectedScene, timeStepStatuses]);

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

  // 拖拽逻辑
  const handleSliderPointerDown = () => setIsDragging(true);
  const handleSliderPointerUp = () => {
    setIsDragging(false);
    loadingControllerRef.current.abort = true;
    const newController = { abort: false };
    loadingControllerRef.current = newController;
    manageStreamingBuffer(currentTimeStep, newController);
  };

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
                  onPointerDown={handleSliderPointerDown}
                  onPointerUp={handleSliderPointerUp}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTimestamp(selectedScene.measurement_start_time)}</span>
                <span>{formatTimestamp(selectedScene.measurement_end_time)}</span>
              </div>

              {/* 图例 */}
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ background: TIME_STEP_STATUS_COLORS[TimeStepStatus.UNLOADED] }}></div>
                  <span>未加载</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ background: TIME_STEP_STATUS_COLORS[TimeStepStatus.MEASUREMENT_LOADED] }}></div>
                  <span>已加载测量数据</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ background: TIME_STEP_STATUS_COLORS[TimeStepStatus.PREDICTION_LOADED] }}></div>
                  <span>已加载预测数据</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ background: TIME_STEP_STATUS_COLORS[TimeStepStatus.BOTH_LOADED] }}></div>
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
      {/* REFACTORED: Data Display Area with cleaner conditional logic */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Measurement Data Card: Renders only if there is data for the current time step */}
        {currentMeasurementData && currentMeasurementData.size > 0 && (
          <Card className="transition-all duration-300 ease-in-out animate-in slide-in-from-left-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" />当前测量数据</CardTitle>
              <CardDescription>
                时间: {formatTimestamp(getCurrentTimestamp())} | 地点数: {currentMeasurementData.size}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {Array.from(currentMeasurementData.entries()).map(([locationId, data]) => (
                  <div key={locationId} className="p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">地点 {locationId}</span>
                      <Badge variant="outline" className="text-xs">
                        <MapPin className="w-3 h-3 mr-1" />ID: {locationId}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">流量速度</span>
                        <span className="font-mono text-sm font-semibold text-primary">
                          {data.velocity_record.toFixed(2)} km/h
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">记录时间</span>
                        <span className="text-xs font-mono">{formatTimestamp(data.time)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">记录ID</span>
                        <span className="text-xs font-mono">#{data.record_id}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {/* Prediction Data Card: Renders only if there is data for the current time step */}
        {currentPredictionData && currentPredictionData.size > 0 && (
          <Card className="transition-all duration-300 ease-in-out animate-in slide-in-from-right-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" />当前预测数据</CardTitle>
              <CardDescription>
                时间: {formatTimestamp(getCurrentTimestamp())} | 地点数: {currentPredictionData.size}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {Array.from(currentPredictionData.entries()).map(([locationId, data]) => (
                  <div key={locationId} className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">地点 {locationId}</span>
                      <Badge variant="default" className="text-xs">
                        <TrendingUp className="w-3 h-3 mr-1" />预测
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">预测速度</span>
                        <span className="font-mono text-sm font-semibold text-primary">
                          {data.velocity_record.toFixed(2)} km/h
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">预测时间</span>
                        <span className="text-xs font-mono">{formatTimestamp(data.time)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">预测ID</span>
                        <span className="text-xs font-mono">#{data.record_id}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
