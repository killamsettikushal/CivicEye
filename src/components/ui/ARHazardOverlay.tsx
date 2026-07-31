import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Eye, AlertTriangle, Crosshair, Sparkles, Navigation, X, ShieldAlert
} from 'lucide-react';

interface ARHazardOverlayProps {
  imageSrc: string;
  hazardTitle?: string;
  depthEstimateCm?: number;
  distanceMeters?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ARHazardOverlay({
  imageSrc,
  hazardTitle = 'Severe Road Pothole Crater',
  depthEstimateCm = 12,
  distanceMeters = 3.5,
  isOpen,
  onClose,
}: ARHazardOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card max-w-3xl w-full p-4 rounded-3xl bg-slate-950 border border-blue-500/40 text-white shadow-2xl relative overflow-hidden"
      >
        {/* AR HUD Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                AR Hazard Spatial Scanner <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-mono">3D CAMERA HUD</span>
              </h3>
              <p className="text-[10px] text-slate-400">Depth Estimation & Hazard Warning Overlay</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Camera Feed with AR 3D Graphics */}
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden my-4 bg-slate-900 border border-slate-800 flex items-center justify-center">
          <img src={imageSrc} alt="AR View" className="w-full h-full object-cover opacity-90" />

          {/* AR Target Reticle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-44 h-44 rounded-full border-2 border-dashed border-red-500/80 animate-spin-slow flex items-center justify-center">
              <Crosshair className="w-12 h-12 text-red-500 animate-pulse" />
            </div>
          </div>

          {/* 3D Hazard Distance & Depth Pin */}
          <div className="absolute top-1/4 left-1/3 p-3 rounded-2xl bg-red-600/90 backdrop-blur-md text-white shadow-2xl border border-red-400/50 flex flex-col gap-1 pointer-events-none animate-bounce">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-300" /> {hazardTitle}
            </div>
            <div className="flex items-center gap-3 text-[11px] opacity-90">
              <span>Depth: <strong>{depthEstimateCm} cm</strong></span>
              <span>Distance: <strong>{distanceMeters} m</strong></span>
            </div>
          </div>

          {/* AR Telemetry HUD */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between p-3 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-xs">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span className="font-bold text-white">Spatial Risk Level: HIGH (CRATER DANGER)</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">AR Depth Engine v2.4</span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="btn-primary text-xs px-5">
            Close AR Scanner
          </button>
        </div>
      </motion.div>
    </div>
  );
}
