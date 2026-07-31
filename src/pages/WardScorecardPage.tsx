import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award, Crown, ShieldCheck, MapPin, Building2, BarChart3, TrendingUp,
  CheckCircle2, Clock, ChevronRight, Filter, Search
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Sidebar } from '@/components/layout/Sidebar';

interface WardScore {
  rank: number;
  wardNo: number;
  wardName: string;
  councilorName: string;
  healthScore: number;
  totalIncidents: number;
  resolvedIncidents: number;
  avgSlaHours: number;
  status: 'Top Performer' | 'Good' | 'Needs Attention';
}

const MOCK_WARDS: WardScore[] = [
  {
    rank: 1,
    wardNo: 112,
    wardName: 'Indiranagar Central',
    councilorName: 'Anita Sharma',
    healthScore: 94,
    totalIncidents: 142,
    resolvedIncidents: 138,
    avgSlaHours: 14.2,
    status: 'Top Performer',
  },
  {
    rank: 2,
    wardNo: 84,
    wardName: 'Koramangala 4th Block',
    councilorName: 'Rajesh Kumar',
    healthScore: 91,
    totalIncidents: 180,
    resolvedIncidents: 171,
    avgSlaHours: 16.5,
    status: 'Top Performer',
  },
  {
    rank: 3,
    wardNo: 45,
    wardName: 'Jayanagar 3rd Block',
    councilorName: 'Suresh Gowda',
    healthScore: 88,
    totalIncidents: 110,
    resolvedIncidents: 101,
    avgSlaHours: 19.1,
    status: 'Good',
  },
  {
    rank: 4,
    wardNo: 178,
    wardName: 'Whitefield Main Rd',
    councilorName: 'Priya Nair',
    healthScore: 76,
    totalIncidents: 320,
    resolvedIncidents: 260,
    avgSlaHours: 28.4,
    status: 'Good',
  },
  {
    rank: 5,
    wardNo: 204,
    wardName: 'Outer Ring Road Bellandur',
    councilorName: 'Venkatesh Prasad',
    healthScore: 62,
    totalIncidents: 450,
    resolvedIncidents: 310,
    avgSlaHours: 42.0,
    status: 'Needs Attention',
  },
];

export function WardScorecardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = MOCK_WARDS.filter(
    (w) =>
      w.wardName.toLowerCase().includes(search.toLowerCase()) ||
      w.councilorName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
      <Navbar />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 section-padding pt-24 pb-16 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-3">
            <Crown className="w-4 h-4 text-amber-500" /> Municipal Ward Rankings & Accountability
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            City Ward <span className="gradient-text">Health Scorecards</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base mt-2">
            Public leaderboard evaluating municipal ward infrastructure quality, road repair SLA completion times, and city councilor resolution efficiency.
          </p>
        </div>

        {/* Top 3 Ward Podiums */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {MOCK_WARDS.slice(0, 3).map((ward) => (
            <motion.div
              key={ward.wardNo}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 rounded-2xl relative overflow-hidden text-center border-t-4 border-amber-500"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto mb-3 text-lg font-black">
                #{ward.rank}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{ward.wardName}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ward No: {ward.wardNo} · Councilor: {ward.councilorName}</p>

              <div className="my-4 py-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{ward.healthScore}/100</span>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Infrastructure Health Score</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-white block">{ward.resolvedIncidents}/{ward.totalIncidents}</span>
                  <span className="text-[10px] text-slate-400">Resolved Reports</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-white block">{ward.avgSlaHours}h</span>
                  <span className="text-[10px] text-slate-400">Avg Repair SLA</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* All Wards Leaderboard Table */}
        <div className="glass-card overflow-hidden rounded-2xl">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" /> Municipal Ward Rankings ({filtered.length})
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ward or councilor..."
                className="input-field text-xs pl-9 py-2"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="px-5 py-3 font-semibold">Rank</th>
                  <th className="px-5 py-3 font-semibold">Ward Name & No.</th>
                  <th className="px-5 py-3 font-semibold">Councilor</th>
                  <th className="px-5 py-3 font-semibold">Health Score</th>
                  <th className="px-5 py-3 font-semibold">Resolution Rate</th>
                  <th className="px-5 py-3 font-semibold">Avg Repair SLA</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ward) => (
                  <tr key={ward.wardNo} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">#{ward.rank}</td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-slate-900 dark:text-white block">{ward.wardName}</span>
                      <span className="text-xs text-slate-400">Ward #{ward.wardNo}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-medium">{ward.councilorName}</td>
                    <td className="px-5 py-4">
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-base">{ward.healthScore}/100</span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {Math.round((ward.resolvedIncidents / ward.totalIncidents) * 100)}% ({ward.resolvedIncidents}/{ward.totalIncidents})
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300 font-medium">{ward.avgSlaHours} hours</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        ward.status === 'Top Performer' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                        ward.status === 'Good' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' :
                        'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                      }`}>
                        {ward.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
