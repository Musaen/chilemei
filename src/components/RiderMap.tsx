import { useEffect, useRef, useState } from 'react';

// 模拟配送地图：SVG 街道 + 骑手沿路线移动动画

interface RiderMapProps {
  /** 配送进度 0-1，配送中阶段实时变化 */
  progress: number;
}

const ROUTE_PATH = 'M 60 210 C 110 210 120 150 190 150 S 300 150 340 90';

export default function RiderMap({ progress }: RiderMapProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pos, setPos] = useState({ x: 60, y: 210 });
  const clamped = Math.max(0, Math.min(1, progress));

  // 根据进度在路线上取点，驱动骑手小图标移动
  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    const p = path.getPointAtLength(clamped * len);
    setPos({ x: p.x, y: p.y });
  }, [clamped]);

  return (
    <div className="rider-map">
      <svg viewBox="0 0 400 280" className="rider-map-svg" aria-label="配送路线模拟图">
        {/* 地图底色 */}
        <rect width="400" height="280" fill="#EDF2F7" rx="16" />
        {/* 街区 */}
        <rect x="24" y="24" width="96" height="80" rx="10" fill="#DDE6EE" />
        <rect x="150" y="24" width="100" height="80" rx="10" fill="#DDE6EE" />
        <rect x="280" y="24" width="96" height="80" rx="10" fill="#DDE6EE" />
        <rect x="24" y="170" width="120" height="86" rx="10" fill="#DDE6EE" />
        <rect x="280" y="170" width="96" height="86" rx="10" fill="#DDE6EE" />
        {/* 公园 */}
        <rect x="172" y="172" width="92" height="80" rx="10" fill="#CDE8CF" />
        <text x="218" y="214" textAnchor="middle" fontSize="18">🌳</text>
        {/* 河流 */}
        <path d="M 0 140 Q 100 120 200 138 T 400 132" stroke="#A8CDEA" strokeWidth="14" fill="none" opacity="0.7" />
        {/* 道路 */}
        <line x1="140" y1="0" x2="140" y2="280" stroke="#FFFFFF" strokeWidth="12" />
        <line x1="268" y1="0" x2="268" y2="280" stroke="#FFFFFF" strokeWidth="12" />
        <line x1="0" y1="132" x2="400" y2="132" stroke="#FFFFFF" strokeWidth="10" />
        {/* 配送路线 */}
        <path
          ref={pathRef}
          d={ROUTE_PATH}
          fill="none"
          stroke="#FF6B35"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="10 8"
          opacity="0.85"
        />
        {/* 店铺起点 */}
        <g>
          <circle cx="60" cy="210" r="14" fill="#FFFFFF" stroke="#FF6B35" strokeWidth="2" />
          <text x="60" y="216" textAnchor="middle" fontSize="14">🏪</text>
        </g>
        {/* 用户终点 */}
        <g>
          <circle cx="340" cy="90" r="14" fill="#FFFFFF" stroke="#16A34A" strokeWidth="2" />
          <text x="340" y="96" textAnchor="middle" fontSize="14">🏠</text>
        </g>
        {/* 骑手 */}
        <g style={{ transform: `translate(${pos.x - 12}px, ${pos.y - 12}px)` }}>
          <circle r="12" fill="#FF6B35" />
          <text x="0" y="4" textAnchor="middle" fontSize="13">🛵</text>
        </g>
      </svg>
      {/* 地图图例 */}
      <div className="rider-map-legend">
        <span>🏪 商家</span>
        <span>🏠 你的位置</span>
        <span>🛵 骑手</span>
      </div>
    </div>
  );
}
