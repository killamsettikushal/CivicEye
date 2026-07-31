import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, Play, Pause, Camera, AlertTriangle, CheckCircle2, MapPin,
  Sparkles, ShieldCheck, Zap, Bell, Navigation, Car, RefreshCw
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Sidebar } from '@/components/layout/Sidebar';
import { useToast } from '@/contexts/ToastContext';

interface AutoDetectionEvent {
  id: string;
  timestamp: string;
  type: string;
  confidence: number;
  lat: number;
  lng: number;
  address: string;
  snapshotUrl: string;
}

export function DashcamAutoScanPage() {
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [detections, setDetections] = useState<AutoDetectionEvent[]>([]);
  const [fps, setFps] = useState(30);
  const [speedKmh, setSpeedKmh] = useState(42);

  // Simulated detection generator while scanning
  useEffect(() => {
    let interval: any;
    if (scanning) {
      interval = setInterval(() => {
        // Randomly simulate hazard detection every 6-10 seconds
        if (Math.random() > 0.45) {
          const types = [
            'Severe Road Pothole',
            'Unhelmeted Rider Violation',
            'Broken Streetlight Hazard',
            'Illegal Parking Obstruction',
          ];
          const chosen = types[Math.floor(Math.random() * types.length)];
          const newEvent: AutoDetectionEvent = {
            id: `AUTO-${Math.floor(Math.random() * 8999 + 1000)}`,
            timestamp: new Date().toLocaleTimeString(),
            type: chosen,
            confidence: Math.floor(Math.random() * 12 + 87),
            lat: 12.9716 + (Math.random() - 0.5) * 0.02,
            lng: 77.5946 + (Math.random() - 0.5) * 0.02,
            address: 'Outer Ring Road, Bengaluru',
            snapshotUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80',
          };

          setDetections((prev) => [newEvent, ...prev]);
          showToast(`⚡ AI Auto-Detected: ${chosen} (${newEvent.confidence}%)`, 'info');
        }
      }, 7000);
    }
    return () => clearInterval(interval);
  }, [scanning, showToast]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 section-padding pt-24 pb-16 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold mb-2 border border-blue-500/30">
              <Zap className="w-3.5 h-3.5 animate-pulse" /> Hands-Free Driving Mode
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Dashcam <span className="text-blue-400">AI Auto-Scanner</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Mount your phone on the vehicle dashboard. CivicEye continuously scans the road, auto-detecting potholes and traffic hazards as you drive.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setScanning(!scanning)}
              className={`btn-primary px-6 py-3 text-sm font-bold flex items-center gap-2 ${
                scanning
                  ? '!bg-red-600 !from-red-600 !to-red-500 shadow-lg shadow-red-500/30'
                  : '!bg-emerald-600 !from-emerald-600 !to-emerald-500 shadow-lg shadow-emerald-500/30'
              }`}
            >
              {scanning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {scanning ? 'Stop AI Scanner' : 'Start Dashcam Scanner'}
            </button>
          </div>
        </div>

        {/* Live Camera Viewfinder & Detections Grid */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left: Viewfinder */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center">
              {/* Live Video Feed Simulation */}
              <img
                src="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=1200&auto=format&fit=crop&q=80"
                alt="Dashcam Stream"
                className="w-full h-full object-cover opacity-90"
              />

              {/* Bounding Box HUD Overlays when scanning */}
              {scanning && (
                <>
                  <div className="absolute inset-0 border-2 border-blue-500/30 pointer-events-none" />
                  <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/90 text-white text-xs font-bold shadow-lg backdrop-blur-md animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" /> REC · LIVE AI STREAM
                  </div>

                  {/* Simulated HUD Bounding Box */}
                  <div className="absolute top-1/3 left-1/4 w-48 h-32 border-2 border-amber-400 bg-amber-500/10 rounded-lg flex items-start p-2 pointer-events-none animate-pulse">
                    <span className="bg-amber-500 text-black text-[10px] font-extrabold px-2 py-0.5 rounded shadow">
                      Pothole Hazard Detected (94%)
                    </span>
                  </div>

                  {/* HUD Telemetry */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between p-3 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-xs">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <Car className="w-4 h-4 text-blue-400" /> Speed: <strong>{speedKmh} km/h</strong>
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <Zap className="w-4 h-4 text-emerald-400" /> FPS: <strong>{fps}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-red-400" /> GPS Lock: 12.9716° N, 77.5946° E
                    </div>
                  </div>
                </>
              )}

              {!scanning && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                  <Video className="w-12 h-12 text-slate-600 mb-3" />
                  <h3 className="text-lg font-bold text-white">Dashcam Scanner Inactive</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Click "Start Dashcam Scanner" to launch real-time AI road detection.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Detections Feed */}
          <div className="lg:col-span-4 glass-card p-5 rounded-2xl flex flex-col h-[480px]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-400" /> Auto-Detected Hazards ({detections.length})
              </h3>
              {detections.length > 0 && (
                <button onClick={() => setDetections([])} className="text-xs text-slate-400 hover:text-white">
                  Clear All
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {detections.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs">
                  <ShieldCheck className="w-8 h-8 mb-2 opacity-50" />
                  No auto-detections yet. Start scanning to log hazards.
                </div>
              ) : (
                detections.map((det) => (
                  <motion.div
                    key={det.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex gap-3 items-center"
                  >
                    <img src={det.snapshotUrl} alt="Hazard" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white truncate">{det.type}</h4>
                        <span className="text-[10px] text-emerald-400 font-bold">{det.confidence}%</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{det.address}</p>
                      <span className="text-[10px] text-slate-500 block mt-1">{det.timestamp} · ID: {det.id}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
