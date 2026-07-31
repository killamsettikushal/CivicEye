/**
 * Converts an ArrayBuffer to a base64 string without exceeding the call-stack
 * limit. Spreading a large typed array into String.fromCharCode() blows the
 * stack on big images, so we encode in 32KB chunks instead.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000; // 32 KB
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, i + CHUNK);
    binary += String.fromCharCode.apply(null, slice as unknown as number[]);
  }
  return btoa(binary);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  const mins = Math.floor(diff / 60000);
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

export function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function getLevelColor(level: string): string {
  switch (level) {
    case 'Bronze': return 'from-amber-600 to-amber-800';
    case 'Silver': return 'from-slate-400 to-slate-600';
    case 'Gold': return 'from-yellow-400 to-amber-600';
    case 'Platinum': return 'from-cyan-400 to-blue-600';
    case 'City Guardian': return 'from-blue-500 to-indigo-600';
    case 'Road Protector': return 'from-emerald-500 to-teal-600';
    default: return 'from-slate-400 to-slate-600';
  }
}

export function getSeverityColor(severity: string): { bg: string; text: string; border: string } {
  switch (severity) {
    case 'low': return { bg: 'bg-emerald-100 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20' };
    case 'medium': return { bg: 'bg-amber-100 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20' };
    case 'high': return { bg: 'bg-orange-100 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-500/20' };
    case 'critical': return { bg: 'bg-red-100 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-500/20' };
    default: return { bg: 'bg-slate-100 dark:bg-slate-500/10', text: 'text-slate-700 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-500/20' };
  }
}

export function getStatusColor(status: string): { bg: string; text: string; border: string } {
  switch (status) {
    case 'pending': return { bg: 'bg-slate-100 dark:bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-500/20' };
    case 'ai-processing': return { bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/20' };
    case 'verified': return { bg: 'bg-emerald-100 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20' };
    case 'rejected': return { bg: 'bg-red-100 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-500/20' };
    case 'assigned': return { bg: 'bg-purple-100 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-500/20' };
    case 'under_progress': return { bg: 'bg-amber-100 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20' };
    case 'resolved': return { bg: 'bg-green-100 dark:bg-green-500/10', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-500/20' };
    default: return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
  }
}

// ============ Distance & Geo utilities ============

const EARTH_RADIUS_KM = 6371;

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export function estimateTravelTime(km: number): string {
  const avgSpeedKmh = 30;
  const minutes = (km / avgSpeedKmh) * 60;
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hrs}h ${mins}m`;
}

export const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function pointsToNextLevel(points: number): { current: number; next: number; progress: number; nextLevel: string } {
  const levels = [
    { name: 'Bronze', min: 0 },
    { name: 'Silver', min: 1000 },
    { name: 'Gold', min: 3000 },
    { name: 'Platinum', min: 6000 },
    { name: 'City Guardian', min: 10000 },
    { name: 'Road Protector', min: 20000 },
  ];
  let current = levels[0];
  let next = levels[1];
  for (let i = 0; i < levels.length; i++) {
    if (points >= levels[i].min) {
      current = levels[i];
      next = levels[i + 1] ?? levels[i];
    }
  }
  const progress = next === current ? 100 : Math.min(100, ((points - current.min) / (next.min - current.min)) * 100);
  return { current: current.min, next: next.min, progress, nextLevel: next.name };
}
