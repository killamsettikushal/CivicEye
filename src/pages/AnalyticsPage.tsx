import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, TrendingUp, Clock, Users, MapPin, AlertTriangle,
  Sparkles, Lightbulb, Target, TrendingDown, CheckCircle2,
  AlertCircle, RefreshCw, X,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { analyticsService, type RealAnalyticsData, type AIInsights } from '@/services/analyticsService';
import { useToast } from '@/contexts/ToastContext';
import {
  MonthlyReportsChart, DepartmentPerformanceChart, CategoryBreakdownChart,
  ResponseTimeChart, CitizenParticipationChart,
} from '@/components/charts/Charts';

export function AnalyticsPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<RealAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await analyticsService.getRealAnalytics();
        setData(d);
      } catch (err) {
        showToast('Failed to load analytics data', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [showToast]);

  const handleGenerateInsights = useCallback(async () => {
    if (!data) return;
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const result = await analyticsService.generateAIInsights(data);
      setInsights(result);
      showToast('AI insights generated successfully', 'success');
    } catch (err: any) {
      setInsightsError(err.message ?? 'Failed to generate insights');
      showToast('Failed to generate AI insights', 'error');
    } finally {
      setInsightsLoading(false);
    }
  }, [data, showToast]);

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

  const summaryStats = [
    { icon: BarChart3, label: 'Total Reports', value: data.totalReports.toLocaleString(), trend: `${data.pendingReports} pending`, color: 'blue' },
    { icon: CheckCircle2, label: 'Resolved', value: data.resolvedReports.toLocaleString(), trend: data.avgResolutionDays !== null ? `Avg ${data.avgResolutionDays.toFixed(1)} days` : 'No resolutions yet', color: 'emerald' },
    { icon: Users, label: 'Active Citizens', value: data.activeCitizens.toString(), trend: `${data.totalCitizens} registered total`, color: 'violet' },
    { icon: AlertTriangle, label: 'Critical Areas', value: data.topLocations.length.toString(), trend: `${data.severityBreakdown.find((s) => s.severity === 'critical')?.count ?? 0} critical issues`, color: 'orange' },
  ];

  // Transform real data into the chart format expected by existing chart components
  const monthlyReportsChart = data.monthlyTrend.length > 0
    ? data.monthlyTrend.map((m) => ({ month: m.month, infrastructure: m.infrastructure, traffic: m.traffic }))
    : [];
  const citizenParticipationChart = [{ month: 'Current', activeCitizens: data.activeCitizens, newReports: data.totalReports }];

  return (
    <DashboardLayout>
      {/* Summary cards with real data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summaryStats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                stat.color === 'blue' ? 'from-blue-500 to-blue-600' :
                stat.color === 'emerald' ? 'from-emerald-500 to-emerald-600' :
                stat.color === 'violet' ? 'from-violet-500 to-violet-600' :
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

      {/* AI Insights Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6 bg-gradient-to-r from-blue-900/40 via-slate-900/60 to-emerald-900/40 border border-blue-500/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">Gemini AI</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">Real Data</span>
              </div>
              <h3 className="text-lg font-bold text-white">AI-Powered Analytics Insights</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Generate a comprehensive intelligence report from live database analytics — key trends, problem areas, and actionable recommendations for administrators.
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerateInsights}
            disabled={insightsLoading || data.totalReports === 0}
            className="btn-primary text-sm bg-gradient-to-r from-blue-600 to-emerald-600 disabled:opacity-50 flex-shrink-0"
          >
            {insightsLoading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Generating...
              </span>
            ) : insights ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Regenerate Insights
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Generate AI Insights
              </span>
            )}
          </button>
        </div>

        {data.totalReports === 0 && (
          <p className="text-xs text-amber-300 mt-3 pt-3 border-t border-slate-700/50">
            No reports have been submitted yet. AI insights will be available once citizens start reporting issues.
          </p>
        )}
      </motion.div>

      {/* AI Insights Results */}
      <AnimatePresence>
        {insightsLoading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-6 mb-6 overflow-hidden"
          >
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">AI is analyzing your analytics data...</p>
              <p className="text-xs text-slate-400 mt-1">This may take a few seconds</p>
            </div>
          </motion.div>
        )}

        {insightsError && !insightsLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card p-6 mb-6 border border-red-500/30"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">Failed to generate insights</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{insightsError}</p>
                <button onClick={handleGenerateInsights} className="btn-ghost text-xs mt-3">
                  <RefreshCw className="w-3.5 h-3.5" /> Try Again
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {insights && !insightsLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card p-6 mb-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">AI Intelligence Report</h3>
              </div>
              <button onClick={() => setInsights(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" /> Executive Summary
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-blue-50/50 dark:bg-blue-500/5 rounded-xl p-4">
                {insights.summary}
              </p>
            </div>

            {/* Key Findings + Areas Needing Attention */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" /> Key Findings
                </h4>
                <ul className="space-y-2">
                  {insights.keyFindings.map((finding, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                      {finding}
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" /> Areas Needing Attention
                </h4>
                <ul className="space-y-2">
                  {insights.areasNeedingAttention.map((area, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0 mt-1.5" />
                      {area}
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Notable Improvements */}
            {insights.notableImprovements.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-emerald-500" /> Notable Improvements
                </h4>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {insights.notableImprovements.map((improvement, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3"
                    >
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-600 dark:text-slate-300">{improvement}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-violet-500" /> Actionable Recommendations
              </h4>
              <div className="space-y-2">
                {insights.recommendations.map((rec, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 p-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-white">{i + 1}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{rec}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Charts grid */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Monthly Reports Trend</h3>
          {data.monthlyTrend.length > 0 ? (
            <MonthlyReportsChart data={monthlyReportsChart} />
          ) : (
            <EmptyChartState message="No report data yet" />
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Most Common Issues</h3>
          {data.categoryBreakdown.length > 0 ? (
            <CategoryBreakdownChart data={data.categoryBreakdown} />
          ) : (
            <EmptyChartState message="No category data yet" />
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Department Performance</h3>
          {data.departmentPerformance.length > 0 ? (
            <DepartmentPerformanceChart data={data.departmentPerformance.map((d) => ({
              department: d.department,
              resolved: d.resolved,
              pending: d.pending,
            }))} />
          ) : (
            <EmptyChartState message="No department data yet" />
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Severity Distribution</h3>
          {data.severityBreakdown.length > 0 ? (
            <ResponseTimeChart data={data.severityBreakdown.map((s) => ({ department: s.severity, avgDays: s.count }))} />
          ) : (
            <EmptyChartState message="No severity data yet" />
          )}
        </motion.div>
      </div>

      {/* Citizen participation + Critical areas */}
      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 lg:col-span-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Citizen Participation</h3>
          <CitizenParticipationChart data={citizenParticipationChart} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-500" /> Top Problem Areas
          </h3>
          <div className="space-y-3">
            {data.topLocations.slice(0, 6).map((area, i) => (
              <motion.div key={area.area} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-500/10">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{area.area}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{area.count} incidents</p>
                </div>
                <span className="text-xs font-bold text-red-600 dark:text-red-400 px-2 py-1 rounded-lg bg-red-100 dark:bg-red-500/20 flex-shrink-0">{area.count}</span>
              </motion.div>
            ))}
            {data.topLocations.length === 0 && (
              <EmptyChartState message="No location data yet" />
            )}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <BarChart3 className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}
