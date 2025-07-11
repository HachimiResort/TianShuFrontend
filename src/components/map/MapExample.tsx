import { useState } from 'react';
import Map, { type MapProps, Source, Layer, NavigationControl, GeolocateControl, Marker, Popup } from 'react-map-gl/maplibre';

// 定义线段数据的类型
interface LineData {
  id: string;
  coordinates: [number, number][]; // 线段的经纬度坐标数组
}

// 模拟线段数据
const lines: LineData[] = [
  {
    id: 'line1',
    coordinates: [
      [116.34157, 39.95116], // 起点
      [116.345, 39.955],     // 终点
    ],
  },
  {
    id: 'line2',
    coordinates: [
      [116.34, 39.95],
      [116.346, 39.948],
    ],
  },
];

// 定义组件
export function MapExample() {
  const [showProp, setShowProp] = useState(false);

  const mapProps: MapProps = {
    initialViewState: {
      longitude: 116.34157,
      latitude: 39.95116,
      zoom: 15,
    },
    style: { width: '100%', height: '100%' },
    mapStyle: 'https://api.maptiler.com/maps/streets/style.json?key=AKUofKhmm1j1S5bzzZ0F',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      <Map {...mapProps}>
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />
        <Marker longitude={116.34157} latitude={39.95116} onClick={() => setShowProp(true)}>
          <div style={{ color: 'red', fontSize: '50px' }}>😼</div>
        </Marker>
        {showProp && (
          <Popup
            longitude={116.34157}
            latitude={39.95116}
            closeOnClick={false}
            onClose={() => setShowProp(false)}
          >
            <div>Hello BeiJing</div>
          </Popup>
        )}

        {/* 批量渲染线段 */}
        {lines.map((line) => (
          <Source
            key={line.id}
            id={line.id}
            type="geojson"
            data={{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: line.coordinates,
              },
              properties: {},
            }}
          >
            <Layer
              id={line.id}
              type="line"
              paint={{
                'line-color': '#ff0000', // 线段颜色
                'line-width': 6,         // 线段宽度
              }}
            />
          </Source>
        ))}
      </Map>
    </div>
  );
}