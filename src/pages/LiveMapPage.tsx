import { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { Filter, MapPin, Flame, X, Loader2, MapPinOff, LocateFixed, Navigation } from 'lucide-react';
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
  const [userAccuracy, setUserAccuracy] = useState<number | null>(null);
  const [locating, setLocating] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const mapRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const userAccuracyCircleRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const data = await reportService.getReports();
      setReports(data);
      setLoading(false);
    })();
  }, []);

  // Request browser geolocation: immediate fix + continuous watchPosition.
  // When granted, the map centers on the user's real coordinates and follows
  // them as they move. Hardcoded default center is only a fallback.
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocating(false);
      setLocationDenied(true);
      return;
    }
    setLocating(true);

    const onSuccess = (pos: GeolocationPosition) => {
      const next: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      setUserLocation(next);
      setUserAccuracy(pos.coords.accuracy ?? null);
      setLocating(false);
      setLocationDenied(false);
      // Dynamically center the map on the user's actual coordinates
      if (mapRef.current) {
        mapRef.current.setView(next, 15, { animate: true, duration: 1.0 });
      }
    };

    const onError = (err: GeolocationPositionError) => {
      setUserLocation(null);
      setLocating(false);
      setLocationDenied(true);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };

    // Immediate fix for fast centering
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
    });
    // Continuous tracking as the user moves
    watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 15000,
    });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // Re-center the map on the user's current live location
  const recenterOnUser = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.setView(userLocation, 16, { animate: true, duration: 0.8 });
    }
  }, [userLocation]);

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
                {userLocation && (
                  <button
                    onClick={recenterOnUser}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                    title="Re-center on your location"
                  >
                    <LocateFixed className="w-3.5 h-3.5" />
                    <span>My Location</span>
                  </button>
                )}
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

            {userLocation && (
              <div className="px-4 py-2 text-xs flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-700/50 bg-emerald-50/50 dark:bg-emerald-500/5">
                <Navigation className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-400">
                  Live location active — {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
                  {userAccuracy ? ` (±${Math.round(userAccuracy)} m)` : ''}
                </span>
              </div>
            )}

            <div style={{ height: '600px' }} className="w-full relative">
              {loading && (
                <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              )}
              {!loading && (
                <MapContainer
                  center={mapCenter}
                  zoom={12}
                  className="w-full h-full"
                  style={{ zIndex: 0 }}
                  ref={(instance) => { mapRef.current = instance; }}
                >
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

                  {/* User's live location marker with accuracy halo */}
                  {userLocation && (
                    <>
                      <Marker
                        position={userLocation}
                        icon={L.divIcon({
                          className: 'user-location-marker',
                          html: `<div style="position:relative;">
                            <div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 2px #2563eb44,0 2px 8px rgba(37,99,235,0.5);"></div>
                            <div style="position:absolute;top:-6px;left:-6px;width:30px;height:30px;border-radius:50%;background:#2563eb33;animation:pulse 2s infinite;"></div>
                          </div>`,
                          iconSize: [30, 30],
                          iconAnchor: [15, 15],
                        })}
                      >
                        <Popup>
                          <div className="p-1 min-w-[160px]">
                            <p className="font-bold text-blue-600 flex items-center gap-1"><Navigation className="w-3.5 h-3.5" /> You are here</p>
                            <p className="text-xs text-slate-500 mt-1">{userLocation[0].toFixed(5)}, {userLocation[1].toFixed(5)}</p>
                            {userAccuracy && <p className="text-xs text-slate-400">Accuracy ±{Math.round(userAccuracy)} m</p>}
                          </div>
                        </Popup>
                      </Marker>
                      {userAccuracy && (
                        <Circle
                          center={userLocation}
                          radius={userAccuracy}
                          pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.08, weight: 1 }}
                        />
                      )}
                    </>
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
