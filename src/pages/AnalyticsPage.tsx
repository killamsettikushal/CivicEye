import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Clock, Users, MapPin, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { gamificationService } from '@/services/api';
import type { AnalyticsData } from '@/types';
import {
  MonthlyReportsChart, DepartmentPerformanceChart, CategoryBreakdownChart,
  ResponseTimeChart, CitizenParticipationChart,
} from '@/components/charts/Charts';

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const d = await gamificationService.getAnalytics();
      setData(d);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="grid lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </DashboardLayout>
    );
  }

  if (!data) return null;

  return (
    <DashboardLayout>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: BarChart3, label: 'Total Reports', value: '1,245', trend: '+12% from last month', color: 'blue' },
          { icon: TrendingUp, label: 'Avg Resolution', value: '3.2 days', trend: '-0.5 days improvement', color: 'emerald' },
          { icon: Users, label: 'Active Citizens', value: '890', trend: '+140 new this month', color: 'violet' },
          { icon: AlertTriangle, label: 'Critical Areas', value: '5', trend: 'Needing attention', color: 'orange' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                stat.color === 'blue' ? 'from-blue-500 to-blue-600' :
                stat.color === 'emerald' ? 'from-emerald-500 to-emerald-600' :
                stat.color === 'violet' ? 'from-violet-500 to-purple-600' :
                'from-orange-500 to-red-500'
              } flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{stat.trend}</p>
          </motion.div>
        ))}
      </div>

      {/* AI Predictive Road Hazard Heatmap Banner */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6 bg-gradient-to-r from-blue-900/40 via-slate-900/60 to-purple-900/40 border border-blue-500/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/30">AI Predictive Intelligence</span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30">Monsoon Pothole Risk</span>
            </div>
            <h3 className="text-lg font-bold text-white">AI Road Hazard & Pothole Risk Heatmap</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Machine learning models analyzed 1,245 historical reports, monsoon precipitation data, and heavy vehicle traffic density to predict high-risk road collapse zones.
            </p>
          </div>
          <div className="flex gap-2">
            <a href="/map" className="btn-primary text-xs bg-gradient-to-r from-blue-600 to-indigo-600">
              <MapPin className="w-4 h-4" /> View Live Heatmap
            </a>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-700/50 text-xs">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-red-500/30">
            <span className="text-red-400 font-bold block mb-0.5">High Hazard Zone: Outer Ring Road</span>
            <span className="text-slate-400 block">Predicted Pothole Formation Probability: 89%</span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-amber-500/30">
            <span className="text-amber-400 font-bold block mb-0.5">Moderate Risk: MG Road Junction</span>
            <span className="text-slate-400 block">Predicted Pothole Formation Probability: 64%</span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-emerald-500/30">
            <span className="text-emerald-400 font-bold block mb-0.5">Low Hazard Zone: Indiranagar 100ft Rd</span>
            <span className="text-slate-400 block">Predicted Pothole Formation Probability: 12%</span>
          </div>
        </div>
      </motion.div>

      {/* Charts grid */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Monthly Reports Trend</h3>
          <MonthlyReportsChart data={data.monthlyReports} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Most Common Violations & Issues</h3>
          <CategoryBreakdownChart data={data.categoryBreakdown} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Department Performance</h3>
          <DepartmentPerformanceChart data={data.departmentPerformance} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Average Response Time (Days)</h3>
          <ResponseTimeChart data={data.responseTimes} />
        </motion.div>
      </div>

      {/* Citizen participation + Critical areas */}
      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 lg:col-span-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Citizen Participation Growth</h3>
          <CitizenParticipationChart data={data.citizenParticipation} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-500" /> Critical Areas
          </h3>
          <div className="space-y-3">
            {data.criticalAreas.map((area, i) => (
              <motion.div key={area.area} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-500/10">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{area.area}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{area.count} incidents</p>
                </div>
                <span className="text-xs font-bold text-red-600 dark:text-red-400 px-2 py-1 rounded-lg bg-red-100 dark:bg-red-500/20">{area.count}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
