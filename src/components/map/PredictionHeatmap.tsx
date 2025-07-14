import { Source, Layer } from 'react-map-gl/maplibre'

interface PredictionHeatmapProps {
  geojson: GeoJSON.FeatureCollection | null
  minVelocity: number
  maxVelocity: number
}

export default function PredictionHeatmap({ geojson, minVelocity, maxVelocity }: PredictionHeatmapProps) {
  if (!geojson || !geojson.features.length) return null;
  
  console.log("velocity range:", minVelocity, "to", maxVelocity);
  
  // 防止 min/max 相等导致计算错误
  const safeMin = minVelocity === maxVelocity ? minVelocity - 1 : minVelocity;
  const safeMax = minVelocity === maxVelocity ? maxVelocity + 1 : maxVelocity;
  
  // 计算中间值，用于更好的颜色过渡
  const midValue = (safeMin + safeMax) / 2;

  const speedLayer = {
    id: 'prediction-speed-layer',
    type: 'circle' as const,
    source: 'prediction-speed-source',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 3,
        9, 30,
        15, 40
      ],
      'circle-color': [
        'interpolate',
        ['linear'],
        ['get', 'velocity'],
        safeMin, '#FF0000',                    // 最低速度 → 红色
        safeMin + (safeMax - safeMin) * 0.25, '#FF8000',  // 25% → 橙色
        safeMin + (safeMax - safeMin) * 0.5,  '#FFFF00',  // 50% → 黄色
        safeMin + (safeMax - safeMin) * 0.75, '#ccefa9ff',  // 75% → 黄绿色
        safeMax, '#ceefceff'                     // 最高速度 → 绿色
      ],
      'circle-opacity': 0.7,
      'circle-stroke-width': 3,
      'circle-stroke-color': '#FFFFFF',
      'circle-stroke-opacity': 0.5
    } as any,
  }

  return (
    <Source id="prediction-speed-source" type="geojson" data={geojson as any}>
      <Layer {...(speedLayer as any)} />
    </Source>
  )
}