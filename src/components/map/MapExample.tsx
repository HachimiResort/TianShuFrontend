import { Map } from 'react-map-gl/maplibre';
import ColorLine from './ColorLine';
// import AnimatedLine from './AnimatedLine';
import type { LineData } from '@/types/index'
import 'maplibre-gl/dist/maplibre-gl.css';



const lines: LineData[] = [
  {
    "startPoint": [116.24567, 39.87654],
    "endPoint": [116.38789, 39.94567],
    "startColor": "#2b7a4c",
    "endColor": "#f1c934"
  },
  {
    "startPoint": [116.43212, 40.12345],
    "endPoint": [116.29876, 39.78901],
    "startColor": "#8e3c6b",
    "endColor": "#4b9f2d"
  },
  {
    "startPoint": [116.17890, 39.65432],
    "endPoint": [116.50987, 40.23456],
    "startColor": "#d11e7a",
    "endColor": "#2f8c5e"
  },
  {
    "startPoint": [116.36543, 40.05678],
    "endPoint": [116.22134, 39.83245],
    "startColor": "#3e7b9c",
    "endColor": "#f2b456"
  },
  {
    "startPoint": [116.49876, 39.98765],
    "endPoint": [116.31234, 40.16789],
    "startColor": "#9a2f5e",
    "endColor": "#1e7b9d"
  },
  {
    "startPoint": [116.28765, 39.54321],
    "endPoint": [116.45678, 40.01234],
    "startColor": "#5b9c1f",
    "endColor": "#d3468a"
  },
  {
    "startPoint": [116.40123, 40.19876],
    "endPoint": [116.26789, 39.67890],
    "startColor": "#6b3a9e",
    "endColor": "#e2b345"
  },
  {
    "startPoint": [116.33456, 39.87654],
    "endPoint": [116.52345, 40.04567],
    "startColor": "#3c8b2d",
    "endColor": "#f13e7c"
  },
  {
    "startPoint": [116.18901, 39.93456],
    "endPoint": [116.37890, 39.76543],
    "startColor": "#a82f6d",
    "endColor": "#2e9b4c"
  },
  {
    "startPoint": [116.45678, 40.23456],
    "endPoint": [116.30123, 39.98765],
    "startColor": "#5b7e1f",
    "endColor": "#d3468e"
  },
  {
    "startPoint": [116.27890, 39.65432],
    "endPoint": [116.48901, 40.12345],
    "startColor": "#2b8f7d",
    "endColor": "#f1c923"
  },
  {
    "startPoint": [116.36789, 40.05678],
    "endPoint": [116.23456, 39.83245],
    "startColor": "#8e3c6a",
    "endColor": "#4b9f2e"
  },
  {
    "startPoint": [116.51234, 39.98765],
    "endPoint": [116.29876, 40.16789],
    "startColor": "#d11e7b",
    "endColor": "#2f8c5f"
  },
  {
    "startPoint": [116.24567, 39.54321],
    "endPoint": [116.45678, 40.01234],
    "startColor": "#6b1c9e",
    "endColor": "#e2b456"
  },
  {
    "startPoint": [116.38901, 40.19876],
    "endPoint": [116.26789, 39.67890],
    "startColor": "#3c8b2d",
    "endColor": "#f13a7c"
  },
  {
    "startPoint": [116.32123, 39.87654],
    "endPoint": [116.52345, 40.04567],
    "startColor": "#9a2f5e",
    "endColor": "#1e7b9d"
  },
  {
    "startPoint": [116.17890, 39.93456],
    "endPoint": [116.37890, 39.76543],
    "startColor": "#5b9c1f",
    "endColor": "#d3468a"
  },
  {
    "startPoint": [116.46789, 40.23456],
    "endPoint": [116.30123, 39.98765],
    "startColor": "#2b7e4c",
    "endColor": "#f1c934"
  },
  {
    "startPoint": [116.28901, 39.65432],
    "endPoint": [116.48901, 40.12345],
    "startColor": "#8e3c6b",
    "endColor": "#4b9f2d"
  },
  {
    "startPoint": [116.35678, 40.05678],
    "endPoint": [116.23456, 39.83245],
    "startColor": "#d11e7a",
    "endColor": "#2f8c5e"
  }
]

// 主地图组件
export function MapExample() {

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <Map
        initialViewState={{
          longitude: 116.39657,
          latitude: 39.95616,
          zoom: 13
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://api.maptiler.com/maps/streets/style.json?key=AKUofKhmm1j1S5bzzZ0F"
      >
        {
          lines.map((line)=> (
            <ColorLine {...line} />
          ))
        }
      </Map>
    </div>
  );
}