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

  const heatmapLayer = {
  id: 'prediction-heatmap-layer',
  type: 'heatmap' as const,
  source: 'prediction-heatmap-source',
  paint: {
    'heatmap-weight': [
      'interpolate',
      ['linear'],
      ['get', 'velocity'],
      safeMin, 0.8,      // 低速度给高权重（让红色更突出）
      safeMax, 0.1     // 高速度给低权重（让绿色不明显）
    ],
    'heatmap-intensity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 1,
      9, 3,
      15, 5
    ],
    'heatmap-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 10,
      9, 40,
      15, 70
    ],
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0, 'rgba(0,0,0,0)',           // 完全透明
      0.1, 'rgba(206,239,206,0.1)', // 很淡的绿色（几乎不可见）
      0.2, 'rgba(206,239,206,0.3)', // 淡绿色
      0.4, 'rgba(204,239,169,0.4)', // 黄绿色
      0.6, '#ffffd7ff',               // 黄色
      0.8, '#fff200ff',               // 橙色  
      1, '#FF8000'                  // 红色（最突出）
    ],
    'heatmap-opacity': 0.9
  } as any,
}

  return (
    <Source id="prediction-heatmap-source" type="geojson" data={geojson as any}>
      <Layer {...(heatmapLayer as any)} />
    </Source>
  )
}