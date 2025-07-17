import { Marker } from "react-map-gl/maplibre";

interface TrafficLightMarkerProps {
  id: string;
  longitude: number;
  latitude: number;
  isGreen: boolean;
  size?: number;
}

export function TrafficLightMarker({
  id,
  longitude,
  latitude,
  isGreen,
  size = 24,
}: TrafficLightMarkerProps) {
  // 增强版红绿灯SVG（金属质感+发光效果）
  const TrafficLightIcon = () => (
    <svg width={size} height={size * 1.5} viewBox="0 0 40 60">
      {/* 灯柱（更现代的设计） */}
      <rect x="18" y="0" width="4" height="60" fill="#555" rx="2" />
      
      {/* 灯箱（带金属质感） */}
      <rect x="0" y="5" width="40" height="50" rx="3" fill="url(#metal)" stroke="#444" strokeWidth="1.5" />
      
      {/* 灯光（带发光效果） */}
      <circle cx="20" cy="20" r="8" fill={isGreen ? "#333" : "#ff3333"} filter="url(#glow-red)" />
      <circle cx="20" cy="40" r="8" fill={isGreen ? "#33ff33" : "#333"} filter="url(#glow-green)" />
      
      {/* 金属质感渐变 */}
      <defs>
        <linearGradient id="metal" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#777" />
          <stop offset="50%" stopColor="#999" />
          <stop offset="100%" stopColor="#777" />
        </linearGradient>
        
        {/* 红灯发光效果 */}
        <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          {!isGreen && <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#f00" floodOpacity="0.8"/>}
        </filter>
        
        {/* 绿灯发光效果 */}
        <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          {isGreen && <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#0f0" floodOpacity="0.8"/>}
        </filter>
      </defs>
    </svg>
  );

  return (
    <Marker longitude={longitude} latitude={latitude} anchor="bottom">
      <div 
        style={{ 
          cursor: "pointer", 
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
          transition: "transform 0.2s",
          transform: "translateY(-2px)"
        }}
      >
        <TrafficLightIcon />
      </div>
    </Marker>
  );
}
