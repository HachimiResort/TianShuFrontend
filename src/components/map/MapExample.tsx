import React, { useState, useEffect, useRef } from 'react';
import Map, { Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

export function MapExample() {
  const [gradientOffset, setGradientOffset] = useState(0);
  const mapRef = useRef<any>(null);
  
  const lineCoordinates = [
    [116.34157, 39.95116],
    [116.45157, 39.96116]
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setGradientOffset(prev => (prev + 0.02) % 1);
    }, 50); // 每50ms更新一次

    return () => clearInterval(interval);
  }, []);

  const geojsonData:Feature = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: lineCoordinates
    },
    properties: {}
  };

  // 创建动态渐变色
  const createGradientExpression = (offset: number) => {
    return [
      'interpolate',
      ['linear'],
      ['line-progress'],
      Math.max(0, offset - 0.3), 'rgba(231, 76, 60, 0)',
      Math.max(0, offset - 0.2), '#e74c3c',
      Math.max(0, offset - 0.1), '#f39c12',
      offset, '#2ecc71',
      Math.min(1, offset + 0.1), '#3498db',
      Math.min(1, offset + 0.2), '#9b59b6',
      Math.min(1, offset + 0.3), 'rgba(155, 89, 182, 0)'
    ];
  };

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 116.39657,
          latitude: 39.95616,
          zoom: 13
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://api.maptiler.com/maps/streets/style.json?key=AKUofKhmm1j1S5bzzZ0F"
      >
        <Source id="line-source" type="geojson" data={geojsonData} lineMetrics={true}>
          {/* 发光效果背景层 */}
          <Layer
            id="line-glow"
            type="line"
            paint={{
              'line-color': '#e74c3c',
              'line-width': 15,
              'line-opacity': 0.3,
              'line-blur': 10
            }}
            layout={{
              'line-cap': 'round',
              'line-join': 'round'
            }}
          />
          {/* 主渐变线条 */}
          <Layer
            id="line-gradient"
            type="line"
            paint={{
              'line-color': 'red', // 这会被 line-gradient 覆盖
              'line-gradient': createGradientExpression(gradientOffset) as any,
              'line-width': 6,
              'line-opacity': 1
            }}
            layout={{
              'line-cap': 'round',
              'line-join': 'round'
            }}
          />
        </Source>
      </Map>
    </div>
  );
}