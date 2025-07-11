"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import MapReact, { Marker, Source, Layer, type MapRef } from "react-map-gl/maplibre"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Upload, Download, Trash2, FileText, X } from "lucide-react"

// 类型定义
interface CoordinatePoint {
  index: string
  sensor_id: string
  latitude: number
  longitude: number
}

interface RelationPoint {
  index: string
  sensor_id: string
  longitude: string
  latitude: string
}

interface Relation {
  id: string
  from: RelationPoint
  to: RelationPoint
}

interface RelationData {
  relation: Relation[]
}

const MAP_STYLE = "https://api.maptiler.com/maps/streets/style.json?key=AKUofKhmm1j1S5bzzZ0F"

export function MapTest() {
  const mapRef = useRef<MapRef>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // 状态管理
  const [coordinatePoints, setCoordinatePoints] = useState<Map<string, CoordinatePoint>>(new Map())
  const [relations, setRelations] = useState<Relation[]>([])
  const [selectedPoints, setSelectedPoints] = useState<string[]>([])
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [clickedPoint, setClickedPoint] = useState<CoordinatePoint | null>(null) // 新增：存储点击的点信息

  // 地图视口状态
  const [viewState, setViewState] = useState({
    longitude: -118.2437,
    latitude: 34.0522,
    zoom: 10,
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

  // 1. 导入CSV坐标文件
  const handleCSVImport = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const csv = e.target?.result as string
          const lines = csv.split("\n").filter((line) => line.trim())

          if (lines.length === 0) {
            showToast("CSV文件为空", "destructive")
            return
          }

          const headers = lines[0].split(",").map((h) => h.trim())

          if (!headers.includes("index") || !headers.includes("latitude") || !headers.includes("longitude")) {
            showToast("CSV文件格式错误，必须包含index、latitude、longitude列", "destructive")
            return
          }

          const newPoints = new Map<string, CoordinatePoint>()

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(",").map((v) => v.trim())
            const point: CoordinatePoint = {
              index: values[headers.indexOf("index")],
              sensor_id: values[headers.indexOf("sensor_id")] || "",
              latitude: Number.parseFloat(values[headers.indexOf("latitude")]),
              longitude: Number.parseFloat(values[headers.indexOf("longitude")]),
            }

            if (!isNaN(point.latitude) && !isNaN(point.longitude)) {
              newPoints.set(point.index, point)
            }
          }

          if (newPoints.size === 0) {
            showToast("没有找到有效的坐标数据", "destructive")
            return
          }

          // 导入坐标时先清空关系线和点击信息
          setRelations([])
          setSelectedPoints([])
          setClickedPoint(null) // 清空点击信息
          setCoordinatePoints(newPoints)

          showToast(`成功导入 ${newPoints.size} 个坐标点`, "success")
          // 跳转到第一个坐标点的位置
          const firstPoint = Array.from(newPoints.values())[0]
          if (firstPoint) {
            setViewState({
              longitude: firstPoint.longitude,
              latitude: firstPoint.latitude,
              zoom: 12,
            })

            // 延迟一下再调整视角包含所有点
            setTimeout(() => {
              const points = Array.from(newPoints.values())
              if (points.length > 1) {
                const bounds = points.reduce(
                  (acc, point) => ({
                    minLng: Math.min(acc.minLng, point.longitude),
                    maxLng: Math.max(acc.maxLng, point.longitude),
                    minLat: Math.min(acc.minLat, point.latitude),
                    maxLat: Math.max(acc.maxLat, point.latitude),
                  }),
                  {
                    minLng: points[0].longitude,
                    maxLng: points[0].longitude,
                    minLat: points[0].latitude,
                    maxLat: points[0].latitude,
                  },
                )

                mapRef.current?.fitBounds(
                  [
                    [bounds.minLng, bounds.minLat],
                    [bounds.maxLng, bounds.maxLat],
                  ],
                  { padding: 100, duration: 1000 },
                )
              }
            }, 500)
          }
        } catch (error) {
          console.error("CSV解析错误:", error)
          showToast("CSV文件解析失败，请检查文件格式", "destructive")
        }
      }
      reader.readAsText(file)
      event.target.value = ""
    },
    [showToast],
  )

  // 2. 导入JSON关系文件
  const handleJSONImport = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const jsonData: RelationData = JSON.parse(e.target?.result as string)

          if (!jsonData.relation || !Array.isArray(jsonData.relation)) {
            showToast("JSON文件格式错误", "destructive")
            return
          }

          const validRelations: Relation[] = []
          const invalidRelations: string[] = []

          jsonData.relation.forEach((relation) => {
            const fromExists = coordinatePoints.has(relation.from.index)
            const toExists = coordinatePoints.has(relation.to.index)

            if (fromExists && toExists) {
              validRelations.push(relation)
            } else {
              invalidRelations.push(relation.id)
            }
          })

          setRelations((prev) => [...prev, ...validRelations])

          if (invalidRelations.length > 0) {
            showToast(`关系和坐标点不对应，忽略了 ${invalidRelations.length} 个关系`, "destructive")
          }

          if (validRelations.length > 0) {
            showToast(`成功导入 ${validRelations.length} 个关系`, "success")
          }
        } catch (error) {
          showToast("JSON文件解析失败", "destructive")
        }
      }
      reader.readAsText(file)
      event.target.value = ""
    },
    [coordinatePoints, showToast],
  )

  // 3. 清除所有关系
  const clearAllRelations = useCallback(() => {
    setRelations([])
    setSelectedPoints([])
    showToast("已清除所有关系", "success")
  }, [showToast])

  // 4. 点击坐标点处理
  const handlePointClick = useCallback(
    (pointIndex: string) => {
      const point = coordinatePoints.get(pointIndex)
      if (!point) return

      // 设置点击的点信息
      setClickedPoint(point)

      if (isDeleteMode) return
      
      if (selectedPoints.includes(pointIndex)) {
        // 取消选择
        setSelectedPoints((prev) => prev.filter((p) => p !== pointIndex))
      } else if (selectedPoints.length === 0) {
        // 选择第一个点
        setSelectedPoints([pointIndex])
      } else if (selectedPoints.length === 1) {
        // 选择第二个点，创建关系
        const fromIndex = selectedPoints[0]
        const toIndex = pointIndex

        if (fromIndex === toIndex) {
          showToast("不能连接同一个点", "destructive")
          return
        }

        // 检查关系是否已存在
        const relationExists = relations.some(
          (r) =>
            (r.from.index === fromIndex && r.to.index === toIndex) ||
            (r.from.index === toIndex && r.to.index === fromIndex),
        )

        if (relationExists) {
          showToast("该关系已存在", "destructive")
          setSelectedPoints([])
          return
        }

        const fromPoint = coordinatePoints.get(fromIndex)!
        const toPoint = coordinatePoints.get(toIndex)!

        const newRelation: Relation = {
          id: `${fromIndex}-${toIndex}-${Date.now()}`,
          from: {
            index: fromIndex,
            sensor_id: fromPoint.sensor_id,
            longitude: fromPoint.longitude.toString(),
            latitude: fromPoint.latitude.toString(),
          },
          to: {
            index: toIndex,
            sensor_id: toPoint.sensor_id,
            longitude: toPoint.longitude.toString(),
            latitude: toPoint.latitude.toString(),
          },
        }

        setRelations((prev) => [...prev, newRelation])
        setSelectedPoints([])
        showToast("成功创建关系", "success")
      }
    },
    [isDeleteMode, selectedPoints, relations, coordinatePoints, showToast],
  )

  // 5. 点击线段删除关系
  const handleLineClick = useCallback(
    (relationId: string) => {
      if (!isDeleteMode) return

      setRelations((prev) => prev.filter((r) => r.id !== relationId))
      showToast("已删除关系", "success")
    },
    [isDeleteMode, showToast],
  )

  // 6. 导出关系数据
  const exportRelations = useCallback(() => {
    const data: RelationData = { relation: relations }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `relations-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast("关系数据已导出", "success")
  }, [relations, showToast])

  // 7. 清除点击信息
  const clearClickedPoint = useCallback(() => {
    setClickedPoint(null)
  }, [])

  // 获取所有可交互的图层ID（在删除模式下）
  const interactiveLayerIds = isDeleteMode ? relations.map(r => r.id) : []

  return (
    <div className="w-screen h-screen">
      {/* 超紧凑的控制面板 - 固定在顶部 */}
      <div className="fixed top-2 left-2 right-2 z-10">
        <Card className="bg-background/95 backdrop-blur-sm border transition-all duration-300 ease-in-out">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* CSV导入 */}
              <div className="flex items-center gap-1">
                <Input ref={csvInputRef} type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
                <Button
                  onClick={() => csvInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 px-2 transition-all duration-300 ease-in-out"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  导入坐标
                </Button>
              </div>

              {/* JSON导入 */}
              <div className="flex items-center gap-1">
                <Input ref={jsonInputRef} type="file" accept=".json" onChange={handleJSONImport} className="hidden" />
                <Button
                  onClick={() => jsonInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 px-2 transition-all duration-300 ease-in-out"
                  disabled={coordinatePoints.size === 0}
                >
                  <FileText className="w-3 h-3 mr-1" />
                  导入关系
                </Button>
              </div>

              {/* 删除模式开关 */}
              <div className="flex items-center gap-2">
                <Switch checked={isDeleteMode} onCheckedChange={setIsDeleteMode} />
                <span className="text-xs text-muted-foreground">
                  {isDeleteMode ? "删除模式 - 点击线段删除" : "创建模式 - 点击两个点创建关系"}
                </span>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-1">
                <Button
                  onClick={clearAllRelations}
                  variant="destructive"
                  size="sm"
                  disabled={relations.length === 0}
                  className="text-xs h-8 px-2"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
                <Button
                  onClick={exportRelations}
                  variant="outline"
                  size="sm"
                  disabled={relations.length === 0}
                  className="text-xs h-8 px-2 bg-transparent"
                >
                  <Download className="w-3 h-3" />
                </Button>
              </div>
                              {/* 点击点信息 */}
                {clickedPoint && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-orange-100 dark:bg-orange-900/20 rounded-md border border-orange-200 dark:border-orange-800">
                    <div className="text-xs space-x-2">
                      <span className="font-medium text-orange-800 dark:text-orange-200">点击点:</span>
                      <span className="font-mono text-orange-700 dark:text-orange-300">ID:{clickedPoint.index}</span>
                      <span className="font-mono text-orange-700 dark:text-orange-300">传感器:{clickedPoint.sensor_id || "无"}</span>
                      <span className="font-mono text-orange-700 dark:text-orange-300">
                        坐标:({clickedPoint.latitude.toFixed(4)}, {clickedPoint.longitude.toFixed(4)})
                      </span>
                    </div>
                    <Button
                      onClick={clearClickedPoint}
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              {/* 扩展的状态信息区域 */}
            <div className="flex items-center gap-4 ml-auto">
                {/* 基础统计信息 */}
                <div className="text-xs text-muted-foreground">
                  坐标: {coordinatePoints.size} | 关系: {relations.length}
                  {selectedPoints.length > 0 && <span className="text-primary"> | 已选: {selectedPoints.length}/2</span>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 全屏地图容器 */}
      <div className="w-full h-full">
        <MapReact
          ref={mapRef}
          initialViewState={viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          style={{ width: "100%", height: "100%" }}
          mapStyle={MAP_STYLE}
          interactiveLayerIds={interactiveLayerIds}
          onClick={(e) => {
            if (isDeleteMode && e.features && e.features.length > 0) {
              // 点击到了可交互的图层
              const feature = e.features[0]
              if (feature.properties?.id) {
                handleLineClick(feature.properties.id)
              }
            }
          }}
        >
          {/* 渲染坐标点 - 参照MapLocation的方式 */}
          {Array.from(coordinatePoints.values()).map((point) => (
            <Marker
              key={point.index}
              longitude={point.longitude}
              latitude={point.latitude}
              onClick={() => handlePointClick(point.index)}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 cursor-pointer transition-all duration-200 ${
                  selectedPoints.includes(point.index)
                    ? "bg-red-500 border-yellow-600 scale-125"
                    : "bg-blue-500 border-blue-600 hover:scale-110"
                }`}
                title={`Index: ${point.index}, Sensor: ${point.sensor_id}`}
              />
            </Marker>
          ))}

          {/* 渲染关系线段 - 参照MapLocation的方式 */}
          {relations.map((relation) => {
            console.log(relation)
            return (
            <Source
              key={relation.id}
              id={relation.id}
              type="geojson"
              data={{
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [Number.parseFloat(relation.from.longitude), Number.parseFloat(relation.from.latitude)],
                    [Number.parseFloat(relation.to.longitude), Number.parseFloat(relation.to.latitude)],
                  ],
                },
                properties: {
                  id: relation.id,
                  clickable: isDeleteMode,
                },
              }}
            >
              <Layer
                id={relation.id}
                type="line"
                paint={{
                  "line-color": isDeleteMode ? "#ef4444" : "#13db1dff",
                  "line-width": 6,
                  "line-opacity": 0.8,
                }}
                layout={{
                  "line-cap": "round",
                  "line-join": "round",
                }}
              />
            </Source>
          )
          })}
        </MapReact>
      </div>
    </div>
  )
}