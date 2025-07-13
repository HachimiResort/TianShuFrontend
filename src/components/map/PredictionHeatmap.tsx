import { Source, Layer } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

interface PredictionHeatmapProps {
  geojson: GeoJSON.FeatureCollection | null
  minVelocity: number
  maxVelocity: number
}

export default function PredictionHeatmap({ geojson, minVelocity, maxVelocity }: PredictionHeatmapProps) {
  if (!geojson || !geojson.features.length) return null;

  // 防止 min/max 相等导致全红
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
        safeMin, 1,
        safeMax, 0
      ],
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, '#FF0000',
        0.5, '#FFFF00',
        1, '#00FF00'
      ],
      'heatmap-radius': 18, // 更小的半径
      'heatmap-opacity': 0.7,
    } as any,
  }

  return (
    <Source id="prediction-heatmap-source" type="geojson" data={geojson as any}>
      <Layer {...(heatmapLayer as any)} />
    </Source>
  )
}