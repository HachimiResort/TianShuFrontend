import { useEffect, useRef, memo } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

interface ColorLineProps {
  startPoint: [number, number];
  endPoint: [number, number];
  startColor: string;
  endColor: string;
}

// 颜色工具函数 - 支持6位和8位十六进制颜色，忽略透明度
const hexToRgb = (hex: string): [number, number, number] => {
  hex = hex.replace('#', '');
  if (hex.length === 8) {
    hex = hex.substring(0, 6);
  }
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [255, 255, 255];
};

const interpolateColor = (color1: [number, number, number], color2: [number, number, number], t: number): [number, number, number] => {
  return [
    Math.round(color1[0] + (color2[0] - color1[0]) * t),
    Math.round(color1[1] + (color2[1] - color1[1]) * t),
    Math.round(color1[2] + (color2[2] - color1[2]) * t)
  ];
};

// 生成渐变色表达式
function getGradientColorExpression(startColor: string, endColor: string, segments = 100) {
  const startRgb = hexToRgb(startColor);
  const endRgb = hexToRgb(endColor);
  const colorExpression: any[] = ['case'];
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const currentColor = interpolateColor(startRgb, endRgb, t);
    colorExpression.push(['==', ['get', 'segmentIndex'], i]);
    colorExpression.push(`rgb(${currentColor[0]}, ${currentColor[1]}, ${currentColor[2]})`);
  }
  colorExpression.push(`rgb(${startRgb[0]}, ${startRgb[1]}, ${startRgb[2]})`);
  return colorExpression;
}

// 计算两点间距离（单位：米）
function getDistance([lng1, lat1]: [number, number], [lng2, lat2]: [number, number]) {
  const R = 6371000; // 地球半径，米
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default memo(function ColorLine({ startPoint, endPoint, startColor, endColor }: ColorLineProps) {
  const { current: mapRef } = useMap();
  const sourceIdRef = useRef(`color-line-${Math.random().toString(36).substr(2, 9)}`);
  const layerIdRef = useRef(`color-line-layer-${Math.random().toString(36).substr(2, 9)}`);
  const isInitializedRef = useRef(false);

  // 只有坐标变化时才重新创建数据和图层
  useEffect(() => {
    const map = mapRef?.getMap?.();
    if (!map) return;

    const sourceId = sourceIdRef.current;
    const layerId = layerIdRef.current;

    // 创建多段线条来实现渐变效果
    const segments = 20;
    const features = [];
    for (let i = 0; i < segments; i++) {
      const t1 = i / segments;
      const t2 = (i + 1) / segments;
      const startLng = startPoint[0] + (endPoint[0] - startPoint[0]) * t1;
      const startLat = startPoint[1] + (endPoint[1] - startPoint[1]) * t1;
      const endLng = startPoint[0] + (endPoint[0] - startPoint[0]) * t2;
      const endLat = startPoint[1] + (endPoint[1] - startPoint[1]) * t2;
      features.push({
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [[startLng, startLat], [endLng, endLat]]
        },
        properties: {
          segmentIndex: i
        }
      });
    }
    const lineData = {
      type: 'FeatureCollection' as const,
      features
    };

    // 计算线段距离，动态调整线宽
    const distance = getDistance(startPoint, endPoint);
    // 线宽随距离缩放，最小2像素，最大8像素
    const lineWidth = distance < 30 ? 6 : distance < 100 ? 8 : 10;

    const addLayerAndSource = () => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: lineData
        });
      } else {
        // 更新现有数据源
        (map.getSource(sourceId) as any).setData(lineData);
      }
      if (!map.getLayer(layerId)) {
        // 初始就用渐变色表达式
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': getGradientColorExpression(startColor, endColor, segments) as any,
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, Math.max(2, lineWidth - 2),
              14, lineWidth
            ],
            'line-opacity': 0.8
          }
        });
      }
      isInitializedRef.current = true;
    };

    if (map.isStyleLoaded?.()) {
      addLayerAndSource();
    } else {
      map.once('styledata', addLayerAndSource);
    }

    return () => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
      isInitializedRef.current = false;
    };
  }, [mapRef, startPoint, endPoint]); // 只依赖坐标，不依赖颜色

  // 单独处理颜色更新
  useEffect(() => {
    const map = mapRef?.getMap?.();
    if (!map || !isInitializedRef.current) return;
    const layerId = layerIdRef.current;
    if (!map.getLayer(layerId)) return;
    const segments = 20;
    // 只更新颜色样式
    map.setPaintProperty(layerId, 'line-color', getGradientColorExpression(startColor, endColor, segments) as any);
  }, [mapRef, startColor, endColor]); // 只依赖颜色

  return null;
});