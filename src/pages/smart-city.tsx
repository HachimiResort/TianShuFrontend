"use client"

import type React from "react"
import { TourProvider, useTour } from '@reactour/tour'
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import MapReact, { Marker, Popup } from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/services/api"
import { Play, Pause, Database, Loader2, CheckCircle, Zap, ChevronDown, ChevronUp, ChevronLeft, Lightbulb, Eye, EyeOff } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import ColorLine from "@/components/map/ColorLine"
import PredictionHeatmap from "@/components/map/PredictionHeatmap"
import { StationSidebar } from "@/components/map/station-sidebar"
import { useTheme } from "@/components/theme-context"
import { TrafficLightMarker } from "@/components/map/TrafficLightMarker"


const tour_steps = [
  {
    selector: '[data-tour="top-bar"]',
    content: '顶部状态栏可以选择场景',
  },
  {
    selector: '[data-tour="scene-select"]',
    content: '点击场景选择栏，选择一个场景',
  },
  {
    selector: '[data-tour="top-load-data-button"]',
    content: '点击加载数据按钮，加载数据',
  },
  {
    selector: '[data-tour="bottom-bar"]',
    content: '拖动进度条,查看不同时间点的数据情况.',
  },
  {
    selector: '[data-tour="marker-0"]',
    content: '这是地图上的信息站点，点击可以查看该站点的数据',
  },
  {
    selector: '[data-tour="tour-map"]',
    content: '右键可以快速折叠或者展开站点信息栏',
  },
] 



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

// 侧栏站点数据类型
interface StationData {
  location_id: number
  location: { longitude: number; latitude: number }
  timeRange: { start: number; end: number }
  measurementData: FlowRecord[]
  predictionData: FlowRecord[]
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

    // 只存储 chunkData.start_time ~ chunkData.start_time + (chunkData.step-1)*scene.step_length 的时间步
    chunkData.measurements.forEach((locationMeasurement) => {
      locationMeasurement.flow_data.forEach((flowRecord) => {
        const timeStep = Math.round((flowRecord.time - scene.measurement_start_time) / scene.step_length)
        // 限定时间步范围
        const chunkStartStep = Math.round((chunkData.start_time - scene.measurement_start_time) / scene.step_length)
        const chunkEndStep = chunkStartStep + chunkData.step - 1
        if (timeStep < chunkStartStep || timeStep > chunkEndStep) return // 跳过不属于本chunk的数据

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

  // 获取特定站点的所有数据
  getStationData(locationId: number): { measurementData: FlowRecord[]; predictionData: FlowRecord[] } {
    const measurementData: FlowRecord[] = []
    const predictionData: FlowRecord[] = []

    this.timeStepDataCache.forEach((stepData) => {
      if (stepData.measurement?.has(locationId)) {
        measurementData.push(stepData.measurement.get(locationId)!)
      }
      if (stepData.prediction?.has(locationId)) {
        predictionData.push(stepData.prediction.get(locationId)!)
      }
    })

    // 按时间排序
    measurementData.sort((a, b) => a.time - b.time)
    predictionData.sort((a, b) => a.time - b.time)

    return { measurementData, predictionData }
  }

  clear(): void {
    this.chunkCache.clear()
    this.timeStepDataCache.clear()
    this.timeStepStatus.clear()
  }
}

function GuideButton() {
  const { setIsOpen } = useTour()
  return (
    <button
      onClick={() => setIsOpen(true)}
      className="fixed z-50 bottom-6 right-6 w-12 h-12 rounded-full bg-yellow-400 hover:bg-yellow-300 shadow-lg flex items-center justify-center transition-all duration-200 border-2 border-white/80"
      style={{ boxShadow: '0 4px 16px 0 rgba(0,0,0,0.12)' }}
      title="新手引导"
    >
      <Lightbulb className="w-6 h-6 text-white drop-shadow" />
    </button>
  )
}

export default function SmartCity() {
  const { toast } = useToast()
  const dataCache = useRef(new DataCache())
  const { theme } = useTheme()

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
  const [trafficLights, setTrafficLights] = useState<any[]>([])
  const [currentTrafficLightStatuses, setCurrentTrafficLightStatuses] = useState<Map<number, boolean>>(new Map())

  // UI状态
  const [isTopBarOpen, setIsTopBarOpen] = useState(true)

  // 侧栏状态
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [selectedStationData, setSelectedStationData] = useState<StationData | null>(null)

  // 加载状态
  const [loadingStates, setLoadingStates] = useState({
  scenes: false,
    locations: false,
    graph: false,
    predictions: false,
    backgroundLoading: false,
    trafficLights: false,
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

  // 处理站点点击
  const handleStationClick = useCallback(
    (location: Location) => {
      if (!selectedScene) return

      const stationData = dataCache.current.getStationData(location.location_id)

      const newStationData: StationData = {
        location_id: location.location_id,
        location: { longitude: location.longitude, latitude: location.latitude },
        timeRange: {
          start: selectedScene.measurement_start_time,
          end: selectedScene.measurement_end_time,
        },
        measurementData: stationData.measurementData,
        predictionData: stationData.predictionData,
      }

      setSelectedStationData(newStationData)
      setIsSidebarOpen(true)
      showToast(`已选择站点 ${location.location_id}`, "success")
    },
    [selectedScene, showToast],
  )

  // 处理右键点击切换侧栏
  const handleRightClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsSidebarOpen((prev) => !prev)
  }, [])

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
        console.log("图结构信息加载完成")
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

  // 修改 fetchAndProcessPredictionData 的数据转换逻辑
  const fetchAndProcessPredictionData = useCallback(
    async (scene: Scene, startTime: number, step = 30) => {
      if (dataCache.current.hasChunk(scene.scene_id, startTime, step)) {
        return dataCache.current.getChunk(scene.scene_id, startTime, step)!
      }
      try {
        const response = await apiService.get<any>(
          `/traffic/scenes/${scene.scene_id}/locations/traffic-predictions?start_time=${startTime}&step=${step}`,
        )
        if (response.success && response.data?.code === 0) {
          const rawData = response.data.message
          // 转换预测数据为 measurements
          const measurements: LocationMeasurement[] = []
          for (const prediction of rawData.predictions || []) {
            const location_id = prediction.location_id
            const flow_data: FlowRecord[] = []
            for (const flow of prediction.flow_data || []) {
              flow_data.push({
                time: rawData.start_time + (flow.current_step - 1) * scene.step_length,
                velocity_record: flow.velocity_prediction,
                record_id: flow.current_step,
              })
            }
            measurements.push({ location_id, flow_data })
          }
          const data: TrafficData = {
            info: rawData.info,
            start_time: rawData.start_time,
            step: rawData.step,
            measurements,
          }
          dataCache.current.processAndCacheData(scene, data, true)

          return data
        }
        return null
      } catch (error) {
        console.error("预测数据请求错误:", error)
        showToast("获取预测数据失败", "destructive")
        return null
      }
    },
    [showToast],
  )

  // 添加获取红绿灯数据的函数
  const fetchTrafficLights = useCallback(async (sceneId: number, startTime: number, step: number) => {
    setLoadingStates((prev) => ({ ...prev, trafficLights: true }));
    try {
      const response = await apiService.get<any>(`/traffic/scenes/${sceneId}/traffic-lights/traffic-statuses?time=${startTime}&step=${step}`);
      if (response.success && response.data?.code === 0) {
        setTrafficLights(response.data.message.history);
        updateTrafficLightStatuses(response.data.message.history, 0);
        showToast(`成功加载 ${response.data.message.history.length} 个红绿灯组`, "success");
        return response.data.message.history;
      } else {
        showToast("获取红绿灯信息失败", "destructive");
        return [];
      }
    } catch (error) {
      showToast("获取红绿灯信息失败", "destructive");
      return [];
    } finally {
      setLoadingStates((prev) => ({ ...prev, trafficLights: false }));
    }
  }, [showToast]);

  // 更新红绿灯状态
  const updateTrafficLightStatuses = useCallback((trafficLightsData: any[], timeStep: number) => {
    const statusMap = new Map<number, boolean>();
    trafficLightsData.forEach(light => {
      const statusHistory = light.status_history.find((status: any) => status.current_step === timeStep);
      if (statusHistory) {
        statusMap.set(light.light_id * 10 + 1, statusHistory.status === 1); // N
        statusMap.set(light.light_id * 10 + 3, statusHistory.status === 1); // S
        statusMap.set(light.light_id * 10 + 2, statusHistory.status !== 1); // E
        statusMap.set(light.light_id * 10 + 4, statusHistory.status !== 1); // W
      }
    });
    setCurrentTrafficLightStatuses(statusMap);
  }, []);

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

      if (data && data.measurements && data.measurements.length > 0) {
        // 更新时间步状态
        for (let i = 0; i < 30 && currentTimeStep + i < totalTimeSteps; i++) {
          dataCache.current.updateTimeStepStatus(currentTimeStep + i, true)
        }

        // 强制触发状态更新
        const newTimeStepStatuses = new Map(dataCache.current.getAllTimeStepStatuses())
        setTimeStepStatuses(newTimeStepStatuses)

        // 立即获取并更新当前时间步的预测数据
        const stepData = dataCache.current.getDataForTimeStep(currentTimeStep)
        setCurrentPredictionData(stepData?.prediction || null)

        // 如果侧栏打开且有选中的站点，更新侧栏数据
        if (isSidebarOpen && selectedStationData) {
          const updatedStationData = dataCache.current.getStationData(selectedStationData.location_id)
          setSelectedStationData((prev) =>
            prev
              ? {
                  ...prev,
                  measurementData: updatedStationData.measurementData,
                  predictionData: updatedStationData.predictionData,
                }
              : null,
          )
        }

        showToast("预测数据加载成功", "success")
      } else {
        setCurrentPredictionData(null)
        showToast("该时间段暂无预测数据", "default")
      }
    } catch (error) {
      console.error("预测数据请求失败:", error)
      setCurrentPredictionData(null)
      showToast("预测数据请求失败", "destructive")
    } finally {
      setLoadingStates((prev) => ({ ...prev, predictions: false }))
    }
  }, [
    selectedScene,
    currentTimeStep,
    fetchAndProcessPredictionData,
    showToast,
    totalTimeSteps,
    isSidebarOpen,
    selectedStationData,
  ])

  // 选择场景
  const handleSceneSelect = useCallback(
    (scene: Scene) => {
      // 如果点击的是当前已选场景，不做任何操作
      if (selectedScene?.scene_id === scene.scene_id) {
        showToast(`已经是当前场景: ${scene.name}`, "default");
        return;
      }

      loadingControllerRef.current.abort = true;
      setSelectedScene(scene);
      setCurrentTimeStep(0);

      const steps = Math.floor((scene.measurement_end_time - scene.measurement_start_time) / scene.step_length);
      setTotalTimeSteps(steps);

      // 清除所有相关数据
      setCurrentMeasurementData(null);
      setCurrentPredictionData(null);
      setSelectedStationData(null);
      setIsSidebarOpen(false);
      dataCache.current.clear();
      setTimeStepStatuses(new Map());
      setTrafficLights([]);
      setCurrentTrafficLightStatuses(new Map());

      showToast(`已选择场景: ${scene.name}`, "success");
    },
    [selectedScene, showToast],  // 添加 selectedScene 到依赖数组
  );

  // 加载数据
  const handleLoadData = useCallback(async () => {
    if (!selectedScene) return

    showToast("开始加载数据...", "default")
    console.log("开始加载数据...")

    loadingControllerRef.current.abort = true
    loadingControllerRef.current = { abort: false }

    await Promise.all([
      fetchLocations(selectedScene.scene_id),
      fetchGraph(selectedScene.area_id),
      fetchTrafficLights(selectedScene.scene_id, selectedScene.measurement_start_time, totalTimeSteps)
    ])
  }, [selectedScene, fetchLocations, fetchGraph, showToast, totalTimeSteps]);

  useEffect(() => {
    if (locations.length > 0 && graphEdges.length > 0) {
      showToast(`成功加载 ${locations.length} 个地点和 ${graphEdges.length} 条边`, "success")

      // 调整地图视角到数据范围
      if (locations.length > 0) {
        const bounds = locations.reduce(
          (acc, location) => ({
            minLng: Math.min(acc.minLng, location.longitude),
            maxLng: Math.max(acc.maxLng, location.longitude),
            minLat: Math.min(acc.minLat, location.latitude),
            maxLat: Math.max(acc.maxLat, location.latitude),
          }),
          {
            minLng: locations[0].longitude,
            maxLng: locations[0].longitude,
            minLat: locations[0].latitude,
            maxLat: locations[0].latitude,
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
  }, [locations])

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
    updateTrafficLightStatuses(trafficLights, currentTimeStep);
  }, [currentTimeStep, selectedScene, timeStepStatuses, trafficLights]);

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
      }, 500)
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
      if (maxVelocity === minVelocity) return "#05d105ff" // 如果所有速度相同，使用绿色
      const ratio = (velocity - minVelocity) / (maxVelocity - minVelocity)
      const red = Math.round(255 * (1 - ratio))
      const green = Math.round(230 * ratio)
      // 返回16进制字符串
      return `#${red.toString(16).padStart(2, "0")}${green.toString(16).padStart(2, "0")}00`
    }

    return { minVelocity, maxVelocity, getColor }
  }, [currentMeasurementData])

  // 在 SmartCity 组件中添加状态
  const [showTrafficLights, setShowTrafficLights] = useState(true); // 新增状态控制红绿灯显示
  const [hoveredMarker, setHoveredMarker] = useState<{
    location: Location;
    velocity: number;
  } | null>(null);

  // 计算拥挤程度并返回等级和颜色
  const calculateCongestionLevel = useCallback(
    (velocity: number) => {
      if (!currentMeasurementData || currentMeasurementData.size === 0) {
        return { level: "N/A", color: "#808080" };
      }
      const { minVelocity, maxVelocity } = getVelocityColorMapping;
      if (maxVelocity === minVelocity) {
        return { level: "通常", color: "#3b82f6" }; // 蓝色
      }
      const ratio = ((velocity - minVelocity) / (maxVelocity - minVelocity)) * 100;
      const congestionRatio = 100 - ratio;

      if (congestionRatio < 25) {
        return { level: "很通畅", color: "#10b981" }; // 绿色
      } else if (congestionRatio < 50) {
        return { level: "通畅", color: "#3b82f6" }; // 蓝色
      } else if (congestionRatio < 75) {
        return { level: "拥挤", color: "#f59e0b" }; // 黄色
      } else {
        return { level: "很拥挤", color: "#ef4444" }; // 红色
      }
    },
    [currentMeasurementData, getVelocityColorMapping]
  );

  // 生成地图上的点标记
  const mapMarkers = useMemo(() => {
    if (!currentMeasurementData || !locations.length) return [];

    return locations.map((location, idx) => {
      const data = currentMeasurementData.get(location.location_id);
      const color = data ? getVelocityColorMapping.getColor(data.velocity_record) : "#808080";

      return (
        <Marker
          key={location.location_id}
          longitude={location.longitude}
          latitude={location.latitude}
        >
          <div
            className="w-4 h-4 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform"
            style={{ backgroundColor: color }}
            onMouseEnter={() => {
              if (data) {
                setHoveredMarker({
                  location,
                  velocity: data.velocity_record,
                });
              }
            }}
            onMouseLeave={() => setHoveredMarker(null)}
            onClick={(e) => {
              e.stopPropagation();
              handleStationClick(location);
            }}
            data-tour={idx === 20 ? "marker-0" : undefined}
          />
        </Marker>
      );
    });
  }, [currentMeasurementData, locations, getVelocityColorMapping, handleStationClick]);

  // 生成线条基础结构（只在坐标数据变化时重新计算）
  const lineStructures = useMemo(() => {
    if (!locations.length || !graphEdges.length) return []

    const locationMap = new Map(locations.map((loc) => [loc.location_id, loc]))

    return graphEdges
      .map((edge) => {
        const startLocation = locationMap.get(edge.start_vertex)
        const endLocation = locationMap.get(edge.end_vertex)

        if (!startLocation || !endLocation) return null

        return {
          edgeKey: `${edge.start_vertex}-${edge.end_vertex}`,
          startVertex: edge.start_vertex,
          endVertex: edge.end_vertex,
          startPoint: [startLocation.longitude, startLocation.latitude] as [number, number],
          endPoint: [endLocation.longitude, endLocation.latitude] as [number, number],
        }
      })
      .filter(Boolean) as Array<{
      edgeKey: string
      startVertex: number
      endVertex: number
      startPoint: [number, number]
      endPoint: [number, number]
    }>
  }, [locations, graphEdges])

  // 计算当前时间步的颜色数据
  const currentColors = useMemo(() => {
    const colorMap = new Map<string, { startColor: string; endColor: string }>()

    lineStructures.forEach((line) => {
      if (currentMeasurementData) {
        const startData = currentMeasurementData.get(line.startVertex)
        const endData = currentMeasurementData.get(line.endVertex)

        const startColor = startData ? getVelocityColorMapping.getColor(startData.velocity_record) : "#808080"
        const endColor = endData ? getVelocityColorMapping.getColor(endData.velocity_record) : "#808080"

        colorMap.set(line.edgeKey, { startColor, endColor })
      } else {
        // 没有数据时使用默认颜色
        colorMap.set(line.edgeKey, { startColor: "#808080", endColor: "#808080" })
      }
    })

    return colorMap
  }, [currentMeasurementData, lineStructures, getVelocityColorMapping])

  // 生成连接线（现在只在结构变化时重新创建组件）
  const mapLines = useMemo(() => {
    if (!currentMeasurementData || !locations.length || !graphEdges.length) return []

    return lineStructures.map((line) => {
      const colors = currentColors.get(line.edgeKey) || { startColor: "#808080", endColor: "#808080" }

      return (
        <ColorLine
          key={line.edgeKey}
          startPoint={line.startPoint}
          endPoint={line.endPoint}
          startColor={colors.startColor}
          endColor={colors.endColor}
        />
      )
    })
  }, [lineStructures, currentColors])

  // 生成预测数据的GeoJSON
  const predictionGeoJson = useMemo(() => {
    if (!currentPredictionData || !locations.length) return null

    const features: GeoJSON.Feature<GeoJSON.Point>[] = locations
      .map((location) => {
        const data = currentPredictionData.get(location.location_id)
        // 只保留 velocity > 0 的点
        if (!data || data.velocity_record <= 0) return null
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [location.longitude, location.latitude],
          },
          properties: {
            velocity: data.velocity_record,
          },
        }
      })
      .filter(Boolean) as GeoJSON.Feature<GeoJSON.Point>[]

    if (features.length === 0) return null

    return {
      type: "FeatureCollection",
      features,
    } as GeoJSON.FeatureCollection<GeoJSON.Point>
  }, [currentPredictionData, locations])

  // 生成红绿灯标记
  const trafficLightMarkers = useMemo(() => {
    if (!trafficLights.length) return [];

    const markers: React.ReactNode[] = [];
    trafficLights.forEach(light => {
      const coords = light.coordinates;
      const lightId = light.light_id;
      
      // N direction
      if (coords.N_latitude && coords.N_longitude) {
        const lat = parseFloat(coords.N_latitude);
        const lon = parseFloat(coords.N_longitude);
        const isGreen = currentTrafficLightStatuses.get(lightId * 10 + 1) || false;
        markers.push(
          <TrafficLightMarker 
            key={`${lightId}-N`}
            id={`${lightId}-N`}
            longitude={lon}
            latitude={lat}
            isGreen={isGreen}
          />
        );
      }
      
      // E direction
      if (coords.E_latitude && coords.E_longitude) {
        const lat = parseFloat(coords.E_latitude);
        const lon = parseFloat(coords.E_longitude);
        const isGreen = currentTrafficLightStatuses.get(lightId * 10 + 2) || false;
        markers.push(
          <TrafficLightMarker 
            key={`${lightId}-E`}
            id={`${lightId}-E`}
            longitude={lon}
            latitude={lat}
            isGreen={isGreen}
          />
        );
      }
      
      // S direction
      if (coords.S_latitude && coords.S_longitude) {
        const lat = parseFloat(coords.S_latitude);
        const lon = parseFloat(coords.S_longitude);
        const isGreen = currentTrafficLightStatuses.get(lightId * 10 + 3) || false;
        markers.push(
          <TrafficLightMarker 
            key={`${lightId}-S`}
            id={`${lightId}-S`}
            longitude={lon}
            latitude={lat}
            isGreen={isGreen}
          />
        );
      }
      
      // W direction
      if (coords.W_latitude && coords.W_longitude) {
        const lat = parseFloat(coords.W_latitude);
        const lon = parseFloat(coords.W_longitude);
        const isGreen = currentTrafficLightStatuses.get(lightId * 10 + 4) || false;
        markers.push(
          <TrafficLightMarker 
            key={`${lightId}-W`}
            id={`${lightId}-W`}
            longitude={lon}
            latitude={lat}
            isGreen={isGreen}
          />
        );
      }
    });
    
    return markers;
  }, [trafficLights, currentTrafficLightStatuses]);

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

  const { currentStep } = useTour()
  useEffect(() => {
    // 假设“站点信息栏”是第5步（index 5），请根据你的 tour_steps 实际顺序调整
    if (currentStep === 5) {
      setIsSidebarOpen(true)
    }
  }, [currentStep])

  return (
    <>
    <TourProvider steps={tour_steps}
      styles={{
        badge: (base) => ({ ...base, background: '#ef5a3d' }),
        // @ts-ignore
        dot: (base, { current }) => ({
          ...base,
          background: current ? '#ef5a3d' : '#ccc',
        }),
        popover: (base) => ({
          ...base,
          background: '#dedede',
          borderRadius: 10,
        }),
      }}
    >
    <GuideButton />
    <div
      style={{ height: "100vh", width: "100vw", position: "fixed", top: 0, left: 0, zIndex: 0 }}
      onContextMenu={handleRightClick}
      data-tour="tour-map"
    >
      {/* 全屏地图 */}
      <MapReact
        initialViewState={{
          longitude: 116.39657,
          latitude: 39.95616,
          zoom: 13,
        }}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{
          width: "100vw",
          height: "100vh",
          position: "absolute",
          top: 0,
          left: 0,
        }}
        mapStyle="https://api.maptiler.com/maps/streets/style.json?key=AKUofKhmm1j1S5bzzZ0F"
      >
        {/* 预测热力图 */}
        <PredictionHeatmap
          geojson={predictionGeoJson}
          minVelocity={getVelocityColorMapping.minVelocity}
          maxVelocity={getVelocityColorMapping.maxVelocity}
        />
        {showTrafficLights && trafficLightMarkers}
        {mapMarkers}
        {mapLines}

        {/* 悬浮浮窗 */}
        {hoveredMarker && (
          <Popup
            longitude={hoveredMarker.location.longitude}
            latitude={hoveredMarker.location.latitude}
            closeButton={false}
            closeOnClick={false}
            anchor="bottom"
            offset={10}
            className="text-sm"
          >
            <div className="space-y-1">
              <div className="font-medium">站点 {hoveredMarker.location.location_id}</div>
              <div>速度: {hoveredMarker.velocity.toFixed(2)} km/h</div>
              <div>
                拥挤程度:{" "}
                <span
                  style={{
                    color: calculateCongestionLevel(hoveredMarker.velocity).color,
                    fontWeight: "bold",
                  }}
                >
                  {calculateCongestionLevel(hoveredMarker.velocity).level}
                </span>
              </div>
            </div>
          </Popup>
        )}
      </MapReact>

      {/* 顶部可折叠状态栏 */}
      <div className="absolute top-2 left-2 right-2 z-10 max-w-xl mx-auto transition-all duration-300" data-tour="top-bar">  
        <Collapsible open={isTopBarOpen} onOpenChange={setIsTopBarOpen}>
          <Card
            className={`${theme === "light" ? "bg-white/20" : "bg-black/70"} backdrop-blur-lg shadow-xl border-none rounded-2xl transition-all duration-300 ease-in-out text-sm p-2`}
          >
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
                    <CardDescription className="text-sm font-medium py-1">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline" className="bg-primary/10 border-primary/30 px-3 py-1 text-sm">
                      {selectedScene.name}
                      </Badge>
                      <span className="text-primary font-bold text-sm">
                      {formatTimestamp(getCurrentTimestamp())}
                      </span>
                      <Badge variant="secondary" className="ml-auto px-3 py-1 text-sm">
                      步骤: {currentTimeStep + 1} / {totalTimeSteps}
                      </Badge>
                    </div>
                    </CardDescription>
                )}
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="space-y-2 p-2 text-sm">
                {/* 场景选择 */}
                <div className="space-y-1">
                  <h3 className="text-xs font-medium">选择场景</h3>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3" data-tour="scene-select">
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
                      data-tour="top-load-data-button"
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
                      className="text-xs px-2 py-1 bg-transparent"
                    >
                      {loadingStates.predictions ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      请求预测数据
                    </Button>
                    {/* 右下角控制按钮组 */}
                    <div className="fixed right-5 z-50 flex flex-col gap-2">
                      <Button
                        onClick={() => setShowTrafficLights(!showTrafficLights)}
                        size="sm"
                        variant={showTrafficLights ? "default" : "outline"}
                        className="shadow-lg w-12 h-12 rounded-full p-0 flex items-center justify-center"
                        title={showTrafficLights ? "隐藏红绿灯" : "显示红绿灯"}
                      >
                        {showTrafficLights ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
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
                        {getVelocityColorMapping.minVelocity.toFixed(1)} -{" "}
                        {getVelocityColorMapping.maxVelocity.toFixed(1)}
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
      <div className="absolute bottom-2 left-2 right-2 z-10 max-w-xl mx-auto transition-all duration-300" data-tour="bottom-bar">
        <Card className="bg-white/60 backdrop-blur-lg shadow-xl border-none rounded-2xl transition-all duration-300 ease-in-out p-2 text-sm">
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
              <Button
                onClick={handlePlayPause}
                variant="outline"
                size="sm"
                className="bg-transparent text-xs px-2 py-1"
              >
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
      </div>)}

      

      {/* 左侧站点详情侧栏 */}

      <StationSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        stationData={selectedStationData}
        currentTimeStep={currentTimeStep}
        stepLength={selectedScene?.step_length || 300}
        measurementStartTime={selectedScene?.measurement_start_time || 0}
      />

    </div>
    </TourProvider>
    </>
  )
}
