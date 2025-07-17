import { Map } from 'react-map-gl/maplibre';
import ColorLine from './ColorLine';
// import AnimatedLine from './AnimatedLine';
import type { LineData } from '@/types/index'
import 'maplibre-gl/dist/maplibre-gl.css';
import { TrafficLightMarker } from './TrafficLightMarker';


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

        <TrafficLightMarker
            id="TL-001" 
            longitude={116.39657}
            latitude={39.95616}
            isGreen={true} // 或 false 表示红灯
            size={20} // 可选，默认20
          />
        <TrafficLightMarker
          id="TL-002"
          longitude={116.39700}
          latitude={39.92524}
          isGreen={false}
        />


      </Map>
    </div>
  );
}