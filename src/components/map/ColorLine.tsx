import { useEffect, useRef } from 'react';
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
  // 移除 # 符号
  hex = hex.replace('#', '');
  
  // 如果是8位颜色（包含透明度），只取前6位
  if (hex.length === 8) {
    hex = hex.substring(0, 6);
  }
  
  // 如果是3位颜色，扩展为6位
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  // 解析RGB值
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

// 静态渐变线段组件
export default function ColorLine({ startPoint, endPoint, startColor, endColor }: ColorLineProps) {
  const { current: mapRef } = useMap();
  const sourceIdRef = useRef(`color-line-${Math.random().toString(36).substr(2, 9)}`);
  const layerIdRef = useRef(`color-line-layer-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const map = mapRef?.getMap?.();
    if (!map) return;

    const sourceId = sourceIdRef.current;
    const layerId = layerIdRef.current;

    // 创建多段线条来实现渐变效果
    const segments = 100; // 分段数，越多渐变越平滑
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

    let isLoaded = map.isStyleLoaded?.();

    const addLayerAndSource = () => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: lineData
        });
      }
      
      if (!map.getLayer(layerId)) {
        // 解析颜色
        const startRgb = hexToRgb(startColor);
        const endRgb = hexToRgb(endColor);
        
        console.log('Start Color:', startColor, '-> RGB:', startRgb);
        console.log('End Color:', endColor, '-> RGB:', endRgb);

        // 创建静态渐变颜色表达式
        const colorExpression: any[] = ['case'];

        // 为每个段计算静态渐变颜色
        for (let i = 0; i < segments; i++) {
          const t = i / segments; // 渐变进度 0-1
          const currentColor = interpolateColor(startRgb, endRgb, t);

          colorExpression.push(['==', ['get', 'segmentIndex'], i]);
          colorExpression.push(`rgb(${currentColor[0]}, ${currentColor[1]}, ${currentColor[2]})`);
        }

        // 添加默认颜色
        colorExpression.push(`rgb(${startRgb[0]}, ${startRgb[1]}, ${startRgb[2]})`);

        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': colorExpression as any,
            'line-width': 8,
            'line-opacity': 0.8
          }
        });
      }
    };

    if (isLoaded) {
      addLayerAndSource();
    } else {
      map.once('styledata', addLayerAndSource);
    }

    // 清理函数
    return () => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
      map.off('styledata', addLayerAndSource);
    };
  }, [mapRef, startPoint, endPoint, startColor, endColor]);

  return null;
}