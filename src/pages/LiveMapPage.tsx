import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { Filter, MapPin, Flame, X, Loader2, MapPinOff } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { reportService } from '@/services/api';
import type { Report } from '@/types';
import { CATEGORY_LABELS, STATUS_LABELS, DEPARTMENTS, SEVERITY_COLORS } from '@/data/mockData';
import { timeAgo } from '@/utils/helpers';

const BANGALORE: [number, number] = [12.9716, 77.5946];

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

// Fix default marker icons for Leaflet in bundlers
const defaultIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function createIcon(color: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export function LiveMapPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [filters, setFilters] = useState({ severity: '', status: '', department: '', category: '' });
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await reportService.getReports();
      setReports(data);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocating(false);
      setLocationDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
        setLocationDenied(false);
      },
      () => {
        setUserLocation(null);
        setLocating(false);
        setLocationDenied(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  const mapCenter: [number, number] = userLocation ?? BANGALORE;

  const nearby = userLocation
    ? [...reports]
        .map((r) => ({ report: r, dist: haversine(userLocation, [r.location.lat, r.location.lng]) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 5)
    : [];

  const filtered = reports.filter((r) => {
    if (filters.severity && r.severity !== filters.severity) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.department && r.department !== filters.department) return false;
    if (filters.category && r.category !== filters.category) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Filters sidebar */}
        <div className="lg:col-span-1">
          <div className="glass-card p-5 sticky top-20">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-blue-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Filters</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Severity</label>
                <select value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })} className="input-field text-sm">
                  <option value="">All</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Status</label>
                <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="input-field text-sm">
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="assigned">Assigned</option>
                  <option value="under_progress">Under Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Department</label>
                <select value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })} className="input-field text-sm">
                  <option value="">All</option>
                  {DEPARTMENTS.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Category</label>
                <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="input-field text-sm">
                  <option value="">All</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${showHeatmap ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
              >
                <Flame className="w-4 h-4" /> {showHeatmap ? 'Hide' : 'Show'} Heatmap
              </button>

              {(filters.severity || filters.status || filters.department || filters.category) && (
                <button onClick={() => setFilters({ severity: '', status: '', department: '', category: '' })} className="w-full btn-ghost text-sm">
                  <X className="w-4 h-4" /> Clear Filters
                </button>
              )}

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-400">Showing {filtered.length} of {reports.length} incidents</p>
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-3">
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Live Incident Map</h3>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
                  <div key={sev} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-slate-500 dark:text-slate-400 capitalize">{sev}</span>
                  </div>
                ))}
              </div>
            </div>

            {(locating || locationDenied) && (
              <div className="px-4 py-2 text-xs flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-700/50">
                {locating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                    <span className="text-slate-500 dark:text-slate-400">Detecting your location…</span>
                  </>
                ) : (
                  <>
                    <MapPinOff className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400">Location access unavailable. Showing Bangalore by default.</span>
                  </>
                )}
              </div>
            )}

            <div style={{ height: '600px' }} className="w-full relative">
              {loading && (
                <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              )}
              {!loading && (
                <MapContainer center={mapCenter} zoom={12} className="w-full h-full" style={{ zIndex: 0 }}>
                  <MapRecenter center={mapCenter} />
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  {filtered.map((report) => (
                    <Marker key={report.id} position={[report.location.lat, report.location.lng]} icon={createIcon(SEVERITY_COLORS[report.severity])}>
                      <Popup>
                        <div className="p-1 min-w-[200px]">
                          <p className="font-bold text-slate-900">{report.incidentId}</p>
                          <p className="text-sm text-slate-600 mt-1">{report.title}</p>
                          <div className="mt-2 space-y-1 text-xs text-slate-500">
                            <p><strong>Category:</strong> {CATEGORY_LABELS[report.category]}</p>
                            <p><strong>Severity:</strong> <span className="capitalize">{report.severity}</span></p>
                            <p><strong>Status:</strong> {STATUS_LABELS[report.status]}</p>
                            <p><strong>Department:</strong> {report.department}</p>
                            <p><strong>Location:</strong> {report.location.address}</p>
                            <p><strong>Time:</strong> {timeAgo(report.timestamp)}</p>
                            {report.vehicleNumber && <p><strong>Vehicle:</strong> {report.vehicleNumber}</p>}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {/* User location marker */}
                  {userLocation && (
                    <CircleMarker
                      center={userLocation}
                      radius={8}
                      pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.4, weight: 2 }}
                    />
                  )}

                  {/* Heatmap placeholder: circle markers around critical areas */}
                  {showHeatmap && filtered.map((report) => (
                    <CircleMarker
                      key={`heat-${report.id}`}
                      center={[report.location.lat, report.location.lng]}
                      radius={30}
                      pathOptions={{
                        color: SEVERITY_COLORS[report.severity],
                        fillColor: SEVERITY_COLORS[report.severity],
                        fillOpacity: 0.15,
                        weight: 1,
                      }}
                    />
                  ))}
                </MapContainer>
              )}
            </div>
          </div>

          {/* Nearby issues panel */}
          {userLocation && nearby.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5 mt-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Nearby Issues</h3>
                <span className="text-xs text-slate-400">relative to your location</span>
              </div>
              <div className="space-y-2">
                {nearby.map(({ report, dist }) => (
                  <div key={report.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{report.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{CATEGORY_LABELS[report.category]} · {report.location.address}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[report.severity] }} />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
