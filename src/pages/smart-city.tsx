"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import MapReact, { Marker } from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/services/api"
import { Play, Pause, Database, Loader2, CheckCircle, Zap, ChevronDown, ChevronUp } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import ColorLine from "@/components/map/ColorLine"

// 复用 test-data.tsx 的数据类型定义
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
type TimeStepStatus = "unloaded" | "measurement_loaded" | "prediction_loaded" | "both_loaded"

const TimeStepStatus = {
  UNLOADED: "unloaded" as TimeStepStatus,
  MEASUREMENT_LOADED: "measurement_loaded" as TimeStepStatus,
  PREDICTION_LOADED: "prediction_loaded" as TimeStepStatus,
  BOTH_LOADED: "both_loaded" as TimeStepStatus,
}

// 定义时间步状态颜色常量
const TIME_STEP_STATUS_COLORS = {
  [TimeStepStatus.UNLOADED]: "#e2e8f0",
  [TimeStepStatus.MEASUREMENT_LOADED]: "#ff5d5dff",
  [TimeStepStatus.PREDICTION_LOADED]: "#e7c950ff",
  [TimeStepStatus.BOTH_LOADED]: "#3fee7cff",
}


// 单个时间步所有地点的数据
type PerLocationData = Map<number, FlowRecord>

interface TimeStepData {
  measurement?: PerLocationData
  prediction?: PerLocationData
}

// 数据缓存管理类（复用 test-data.tsx 的逻辑）
class DataCache {
  private chunkCache = new Map<string, TrafficData>()
  private timeStepDataCache = new Map<number, TimeStepData>()
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

  processAndCacheData(scene: Scene, chunkData: TrafficData, isPrediction: boolean): void {
    const key = this.getChunkCacheKey(scene.scene_id, chunkData.start_time, chunkData.step)
    this.chunkCache.set(key, chunkData)

    chunkData.measurements.forEach((locationMeasurement) => {
      locationMeasurement.flow_data.forEach((flowRecord) => {
        const timeStep = Math.round((flowRecord.time - scene.measurement_start_time) / scene.step_length)
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


export default function CityMap() {
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
  const [currentMeasurementData, setCurrentMeasurementData] = useState<PerLocationData | null>(null)
  const [currentPredictionData, setCurrentPredictionData] = useState<PerLocationData | null>(null)

  // UI状态
  const [isTopBarOpen, setIsTopBarOpen] = useState(true)

  // 加载状态
  const [loadingStates, setLoadingStates] = useState({
    scenes: false,
    locations: false,
    graph: false,
    predictions: false,
    backgroundLoading: false,
  })

  const playIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const loadingControllerRef = useRef({ abort: false })

  // 地图视口状态
  const [viewState, setViewState] = useState({
    longitude: 116.39657,
    latitude: 39.95616,
    zoom: 13,
  })

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

  // 复用 test-data.tsx 的 API 调用逻辑
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

  // 后台数据加载逻辑
  const manageStreamingBuffer = useCallback(
    async (cursorTimeStep: number, controller: { abort: boolean }) => {
      if (!selectedScene) return

      setLoadingStates((prev) => ({ ...prev, backgroundLoading: true }))
      const CHUNK_SIZE = 12

      try {
        // 从当前时间步向右加载
        for (let i = cursorTimeStep; i < totalTimeSteps; i++) {
          if (controller.abort) return

          const status = dataCache.current.getTimeStepStatus(i)
          if (status === TimeStepStatus.UNLOADED || status === TimeStepStatus.PREDICTION_LOADED) {
            const startTime = selectedScene.measurement_start_time + i * selectedScene.step_length
            const data = await fetchAndProcessMeasurementData(selectedScene, startTime, CHUNK_SIZE)

            if (controller.abort) return
            if (!data) break

            for (let j = 0; j < CHUNK_SIZE && i + j < totalTimeSteps; j++) {
              dataCache.current.updateTimeStepStatus(i + j, false)
            }
            setTimeStepStatuses(new Map(dataCache.current.getAllTimeStepStatuses()))

            if (currentTimeStep >= i && currentTimeStep < i + CHUNK_SIZE) {
              const stepData = dataCache.current.getDataForTimeStep(currentTimeStep)
              setCurrentMeasurementData(stepData?.measurement || null)
            }

            i += CHUNK_SIZE - 1
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
        }

        if (controller.abort) return

        // 回到开头加载剩余数据
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

  // 请求预测数据
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
      loadingControllerRef.current.abort = true
      setSelectedScene(scene)
      setCurrentTimeStep(0)

      const steps = Math.floor((scene.measurement_end_time - scene.measurement_start_time) / scene.step_length)
      setTotalTimeSteps(steps)

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

    loadingControllerRef.current.abort = true
    loadingControllerRef.current = { abort: false }

    const [locationsData, graphData] = await Promise.all([
      fetchLocations(selectedScene.scene_id),
      fetchGraph(selectedScene.area_id),
    ])

    if (locationsData.length > 0 && graphData.length > 0) {
      showToast(`成功加载 ${locationsData.length} 个地点和 ${graphData.length} 条边`, "success")

      // 调整地图视角到数据范围
      if (locationsData.length > 0) {
        const bounds = locationsData.reduce(
          (acc, location) => ({
            minLng: Math.min(acc.minLng, location.longitude),
            maxLng: Math.max(acc.maxLng, location.longitude),
            minLat: Math.min(acc.minLat, location.latitude),
            maxLat: Math.max(acc.maxLat, location.latitude),
          }),
          {
            minLng: locationsData[0].longitude,
            maxLng: locationsData[0].longitude,
            minLat: locationsData[0].latitude,
            maxLat: locationsData[0].latitude,
          },
        )

        const centerLng = (bounds.minLng + bounds.maxLng) / 2
        const centerLat = (bounds.minLat + bounds.maxLat) / 2

        setViewState({
          longitude: centerLng,
          latitude: centerLat,
          zoom: 12,
        })
      }

      manageStreamingBuffer(0, loadingControllerRef.current)
    }
  }, [selectedScene, fetchLocations, fetchGraph, manageStreamingBuffer, showToast])

  // 时间步变化处理
  const handleTimeStepChange = useCallback(
    (newTimeStep: number) => {
      if (newTimeStep === currentTimeStep || !selectedScene) return
      setCurrentTimeStep(newTimeStep)
    },
    [selectedScene, currentTimeStep],
  )

  // 监听当前时间步变化，更新显示数据
  useEffect(() => {
    if (!selectedScene) return
    const dataForStep = dataCache.current.getDataForTimeStep(currentTimeStep)
    setCurrentMeasurementData(dataForStep?.measurement ?? null)
    setCurrentPredictionData(dataForStep?.prediction ?? null)
  }, [currentTimeStep, selectedScene, timeStepStatuses])

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
      }, 2000)
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

  // 计算速度颜色映射
  const getVelocityColorMapping = useMemo(() => {
    if (!currentMeasurementData || currentMeasurementData.size === 0) {
      return { minVelocity: 0, maxVelocity: 100, getColor: () => "#808080" }
    }

    // 过滤掉0值，最小值取非零最小
    const velocities = Array.from(currentMeasurementData.values()).map((record) => record.velocity_record)
    const nonZeroVelocities = velocities.filter((v) => v > 0)
    const minVelocity = nonZeroVelocities.length > 0 ? Math.min(...nonZeroVelocities) : 0
    const maxVelocity = Math.max(...velocities)

    const getColor = (velocity: number): string => {
      if (maxVelocity === minVelocity) return "#00FF00" // 如果所有速度相同，使用绿色
      const ratio = (velocity - minVelocity) / (maxVelocity - minVelocity)
      const red = Math.round(255 * (1 - ratio))
      const green = Math.round(255 * ratio)
      // 返回16进制字符串
      return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}00`
    }

    return { minVelocity, maxVelocity, getColor }
  }, [currentMeasurementData])

  // 生成地图上的点标记
  const mapMarkers = useMemo(() => {
    if (!currentMeasurementData || !locations.length) return []

    return locations.map((location) => {
      const data = currentMeasurementData.get(location.location_id)
      const color = data ? getVelocityColorMapping.getColor(data.velocity_record) : "#808080"

      return (
        <Marker key={location.location_id} longitude={location.longitude} latitude={location.latitude}>
          <div
            className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
            style={{ backgroundColor: color }}
            title={`地点 ${location.location_id}: ${data?.velocity_record.toFixed(2) || "N/A"} km/h`}
          />
        </Marker>
      )
    })
  }, [currentMeasurementData, locations, getVelocityColorMapping])

  // 生成连接线
  const mapLines = useMemo(() => {
    if (!currentMeasurementData || !locations.length || !graphEdges.length) return []

    const locationMap = new Map(locations.map((loc) => [loc.location_id, loc]))

    return graphEdges
      .map((edge) => {
        const startLocation = locationMap.get(edge.start_vertex)
        const endLocation = locationMap.get(edge.end_vertex)

        if (!startLocation || !endLocation) return null

        const startData = currentMeasurementData.get(edge.start_vertex)
        const endData = currentMeasurementData.get(edge.end_vertex)

        const startColor = startData ? getVelocityColorMapping.getColor(startData.velocity_record) : "#808080"
        const endColor = endData ? getVelocityColorMapping.getColor(endData.velocity_record) : "#808080"

        return (
          <ColorLine
            key={`${edge.start_vertex}-${edge.end_vertex}`}
            startPoint={[startLocation.longitude, startLocation.latitude]}
            endPoint={[endLocation.longitude, endLocation.latitude]}
            startColor={startColor}
            endColor={endColor}
          />
        )
      })
      .filter(Boolean)
  }, [currentMeasurementData, locations, graphEdges, getVelocityColorMapping])

  // 自定义Slider样式
  const getSliderStyle = useCallback(() => {
    if (!selectedScene || totalTimeSteps === 0) return {}

    const gradientStops: string[] = []

    for (let i = 0; i < totalTimeSteps; i++) {
      const percentage = (i / (totalTimeSteps - 1)) * 100
      const status = timeStepStatuses.get(i) || TimeStepStatus.UNLOADED
      const color = TIME_STEP_STATUS_COLORS[status]
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

  // 清理定时器
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
  }, [])

  return (
    <div style={{ height: "100vh", width: "100vw", position: "fixed", top: 0, left: 0, zIndex: 0 }}>
      {/* 全屏地图 */}
      <MapReact
        initialViewState={{
          longitude: 116.39657,
          latitude: 39.95616,
          zoom: 13,
        }}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: "100vw", height: "100vh", position: "absolute", top: 0, left: 0 }}
        mapStyle="https://api.maptiler.com/maps/streets/style.json?key=AKUofKhmm1j1S5bzzZ0F"
      >
        {mapMarkers}
        {mapLines}
      </MapReact>

      {/* 顶部可折叠状态栏 */}
      <div className="absolute top-2 left-2 right-2 z-10 max-w-xl mx-auto">
        <Collapsible open={isTopBarOpen} onOpenChange={setIsTopBarOpen}>
          <Card className="bg-background/95 backdrop-blur-sm border transition-all duration-300 ease-in-out text-sm p-2">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors p-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Database className="w-5 h-5" />
                    城市交通地图可视化
                    {loadingStates.backgroundLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                  </CardTitle>
                  {isTopBarOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
                {selectedScene && (
                  <CardDescription className="text-xs">
                    当前场景: {selectedScene.name} | 时间: {formatTimestamp(getCurrentTimestamp())} | 步骤: {currentTimeStep + 1} / {totalTimeSteps}
                  </CardDescription>
                )}
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="space-y-2 p-2 text-sm">
                {/* 场景选择 */}
                <div className="space-y-1">
                  <h3 className="text-xs font-medium">选择场景</h3>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {scenes.map((scene) => (
                      <Card
                        key={scene.scene_id}
                        className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                          selectedScene?.scene_id === scene.scene_id
                            ? "ring-2 ring-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        } text-xs p-2`}
                        onClick={() => handleSceneSelect(scene)}
                      >
                        <CardContent className="p-2">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-xs">{scene.name}</h4>
                              {selectedScene?.scene_id === scene.scene_id && (
                                <CheckCircle className="w-3 h-3 text-primary" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{scene.description}</p>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-xs">
                                {scene.area}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                步长: {scene.step_length}s
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* 操作按钮 */}
                {selectedScene && (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleLoadData}
                      disabled={loadingStates.locations || loadingStates.graph}
                      size="sm"
                      className="text-xs px-2 py-1"
                    >
                      {(loadingStates.locations || loadingStates.graph) && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      加载数据
                    </Button>

                    <Button
                      onClick={handleRequestPrediction}
                      variant="outline"
                      size="sm"
                      disabled={loadingStates.predictions || !locations.length}
                      className="text-xs px-2 py-1"
                    >
                      {loadingStates.predictions ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      请求预测数据
                    </Button>
                  </div>
                )}

                {/* 统计信息 */}
                {selectedScene && locations.length > 0 && (
                  <div className="grid gap-2 md:grid-cols-4 text-center text-xs">
                    <div>
                      <div className="text-base font-bold text-primary">{locations.length}</div>
                      <div className="text-xs text-muted-foreground">地点数量</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-primary">{graphEdges.length}</div>
                      <div className="text-xs text-muted-foreground">连接边数</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-primary">{totalTimeSteps}</div>
                      <div className="text-xs text-muted-foreground">时间步数</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-primary">
                        {getVelocityColorMapping.minVelocity.toFixed(1)} - {getVelocityColorMapping.maxVelocity.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">速度范围 (km/h)</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* 底部时间控制条 */}
      {selectedScene && locations.length > 0 && (
        <div className="absolute bottom-2 left-2 right-2 z-10 max-w-xl mx-auto">
          <Card className="bg-background/60 backdrop-blur-md border-none shadow-none transition-all duration-300 ease-in-out p-2 text-sm">
            <CardContent className="p-2 space-y-2 bg-transparent">
              {/* 时间滑块 */}
              <div className="space-y-1">
                <div className="relative">
                  <div className="h-2 rounded-full border" style={getSliderStyle()} />
                  <Slider
                    value={[currentTimeStep]}
                    onValueChange={([value]) => handleTimeStepChange(value)}
                    max={totalTimeSteps - 1}
                    step={1}
                    className="absolute inset-0 [&>span:first-child]:bg-transparent [&>span:first-child]:border-0"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{selectedScene && formatTimestamp(selectedScene.measurement_start_time)}</span>
                  <span>{selectedScene && formatTimestamp(selectedScene.measurement_end_time)}</span>
                </div>
              </div>

              {/* 控制按钮和图例 */}
              <div className="flex items-center justify-between">
                <Button onClick={handlePlayPause} variant="outline" size="sm" className="bg-transparent text-xs px-2 py-1">
                  {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {isPlaying ? "暂停" : "播放"}
                </Button>

                {/* 颜色图例 */}
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: "#FF0000" }}></div>
                    <span>拥堵 ({getVelocityColorMapping.minVelocity.toFixed(1)} km/h)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: "#00FF00" }}></div>
                    <span>通畅 ({getVelocityColorMapping.maxVelocity.toFixed(1)} km/h)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
