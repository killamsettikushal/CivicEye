import React from 'react';

export interface BoundingBox {
  label: string;
  confidence: number;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
  color?: string;
}

interface AIBoundingBoxOverlayProps {
  imageSrc: string;
  boxes?: BoundingBox[];
  className?: string;
}

export const AIBoundingBoxOverlay: React.FC<AIBoundingBoxOverlayProps> = ({
  imageSrc,
  boxes = [],
  className = '',
}) => {
  // Generate default bounding boxes if none passed but objects detected
  const activeBoxes =
    boxes.length > 0
      ? boxes
      : [
          {
            label: 'Pothole Damage',
            confidence: 0.94,
            x: 25,
            y: 35,
            width: 45,
            height: 35,
            color: '#ef4444',
          },
        ];

  return (
    <div className={`relative inline-block overflow-hidden rounded-xl group ${className}`}>
      <img src={imageSrc} alt="Evidence AI Analysis" className="w-full h-auto object-cover rounded-xl" />

      {/* SVG Bounding Boxes Overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {activeBoxes.map((box, index) => (
          <g key={index}>
            {/* Outer Glow Rectangle */}
            <rect
              x={`${box.x}%`}
              y={`${box.y}%`}
              width={`${box.width}%`}
              height={`${box.height}%`}
              fill="rgba(59, 130, 246, 0.15)"
              stroke={box.color || '#3b82f6'}
              strokeWidth="2.5"
              strokeDasharray="4 2"
              rx="6"
              className="animate-pulse"
            />
            {/* Corner Markers */}
            <circle cx={`${box.x}%`} cy={`${box.y}%`} r="4" fill={box.color || '#3b82f6'} />
            <circle cx={`${box.x + box.width}%`} cy={`${box.y}%`} r="4" fill={box.color || '#3b82f6'} />
            <circle cx={`${box.x}%`} cy={`${box.y + box.height}%`} r="4" fill={box.color || '#3b82f6'} />
            <circle cx={`${box.x + box.width}%`} cy={`${box.y + box.height}%`} r="4" fill={box.color || '#3b82f6'} />
          </g>
        ))}
      </svg>

      {/* Label Badges */}
      {activeBoxes.map((box, index) => (
        <div
          key={index}
          style={{ left: `${box.x}%`, top: `${Math.max(2, box.y - 8)}%` }}
          className="absolute z-10 transform -translate-y-full flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold text-white shadow-lg pointer-events-none backdrop-blur-md bg-blue-600/90 border border-blue-400/30"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{box.label}</span>
          <span className="opacity-80 text-[10px]">({Math.round(box.confidence * 100)}%)</span>
        </div>
      ))}
    </div>
  );
};
