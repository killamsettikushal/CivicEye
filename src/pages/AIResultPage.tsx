import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, Clock, Shield, Car, Target, Gauge, Copy,
  FileText, CheckCircle2, AlertTriangle, Download, Share2, Award, Ban, Sparkles,
} from 'lucide-react';
import { reportService } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import type { Report } from '@/types';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/data/mockData';
import { getStatusColor, getSeverityColor, formatDateTime } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Skeleton';
import { AIBoundingBoxOverlay } from '@/components/ui/AIBoundingBoxOverlay';
import { rtoService, type VehicleRTODetails } from '@/services/rtoService';

export function AIResultPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [rtoDetails, setRtoDetails] = useState<VehicleRTODetails | null>(null);

  useEffect(() => {
    (async () => {
      if (!reportId) return;
      const r = await reportService.getReportById(reportId);
      setReport(r);
      setLoading(false);

      if (r?.aiResult?.vehicleNumber) {
        const details = await rtoService.lookupLicensePlate(r.aiResult.vehicleNumber);
        setRtoDetails(details);
      }
    })();
  }, [reportId]);

  if (loading) return <PageLoader />;
  if (!report) return <div className="min-h-screen flex items-center justify-center"><p>Report not found</p></div>;

  const ai = report.aiResult;
  const statusColor = getStatusColor(report.status);
  const sevColor = getSeverityColor(report.severity);

  const handleDownload = () => {
    const data = JSON.stringify(report, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.incidentId}.json`;
    a.click();
    showToast('Report downloaded', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/dashboard')} className="btn-ghost">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="flex gap-2">
            <button onClick={() => showToast('Share link copied (mock)', 'info')} className="btn-ghost">
              <Share2 className="w-4 h-4" /> Share
            </button>
            <button onClick={handleDownload} className="btn-secondary">
              <Download className="w-4 h-4" /> Download
            </button>
          </div>
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{report.incidentId}</h1>
                <span className={`badge ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>{STATUS_LABELS[report.status]}</span>
                <span className={`badge ${sevColor.bg} ${sevColor.text} ${sevColor.border}`}>Severity: {report.severity}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300">{report.title}</p>
            </div>
            <div className="flex items-center gap-2">
              {report.status === 'verified' ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Verified by AI</span>
                </div>
              ) : report.status === 'rejected' ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-500/10">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-semibold text-red-700 dark:text-red-400">Rejected</span>
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>

        {ai && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* AI Analysis Results */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" /> AI Detection Results
              </h2>

              {/* Relevance indicator */}
              <div className={`p-3 rounded-xl mb-4 ${ai.isRelevant ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-amber-50 dark:bg-amber-500/10'}`}>
                <div className="flex items-center gap-2">
                  {ai.isRelevant ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Ban className="w-5 h-5 text-amber-500" />
                  )}
                  <p className={`text-sm font-semibold ${ai.isRelevant ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                    {ai.isRelevant ? 'Valid traffic or civic issue detected' : 'Image not relevant to CivicAI'}
                  </p>
                </div>
                {ai.reason && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{ai.reason}</p>}
              </div>

              <div className="space-y-3">
                <ResultRow icon={CheckCircle2} label="Confidence Score" value={`${Math.round(ai.confidenceScore * 100)}%`} color="text-emerald-500" />
                {ai.vehicleNumber && <ResultRow icon={Car} label="Vehicle Number" value={ai.vehicleNumber} color="text-blue-500" />}
                {ai.vehicleType && <ResultRow icon={Car} label="Vehicle Type" value={ai.vehicleType} color="text-blue-500" />}
                {ai.detectedViolation && <ResultRow icon={AlertTriangle} label="Detected Violation" value={ai.detectedViolation} color="text-orange-500" />}
                {ai.issue && <ResultRow icon={Target} label="AI Category" value={ai.issue} color="text-indigo-500" />}
                <ResultRow icon={Gauge} label="Severity" value={ai.severity.toUpperCase()} color="text-red-500" />
                <ResultRow icon={Gauge} label="Priority" value={`${ai.priority}/100`} color="text-orange-500" />
                <ResultRow icon={Copy} label="Duplicate Probability" value={`${Math.round(ai.duplicateProbability * 100)}%`} color="text-purple-500" />
                <ResultRow icon={FileText} label="Evidence Quality" value={`${Math.round(ai.evidenceQuality * 100)}%`} color="text-cyan-500" />
              </div>

              {/* Image Authenticity */}
              {ai.imageAuthenticity && (
                <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Image Authenticity</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {ai.imageAuthenticity.isGenuine ? 'Genuine photo detected' : 'Potential manipulation detected'}
                    {ai.imageAuthenticity.manipulationFlags.length > 0 && ` — ${ai.imageAuthenticity.manipulationFlags.join(', ')}`}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Authenticity confidence: {Math.round(ai.imageAuthenticity.authenticityConfidence * 100)}%</p>
                </div>
              )}

              {/* Detected Objects */}
              {ai.detectedObjects.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Detected Objects</h3>
                  <div className="space-y-2">
                    {ai.detectedObjects.map((obj, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{obj.label}</span>
                        </div>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{Math.round(obj.confidence * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Incident Details */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
              <div className="glass-card p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-500" /> AI Explanation
                </h2>
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20">
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{ai.description || ai.incidentSummary}</p>
                </div>
                <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                  <div className="flex items-start gap-2">
                    <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Recommended Action</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{ai.recommendedAction}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Location & Time</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{report.location.address}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{report.location.lat}, {report.location.lng}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{formatDateTime(report.timestamp)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{report.department}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Assigned Department</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Duplicate Detection */}
        {ai && ai.duplicateProbability > 0.5 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6 mt-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Copy className="w-5 h-5 text-purple-500" /> Duplicate Detection
            </h2>
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-500/10">
              <p className="text-sm text-slate-700 dark:text-slate-200">
                This report has a <strong>{Math.round(ai.duplicateProbability * 100)}%</strong> probability of being a duplicate of an existing incident.
                It has been clustered with similar reports and the original reporter will receive credit.
              </p>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex flex-col sm:flex-row gap-3 mt-6 justify-center">
          <Link to="/dashboard" className="btn-primary">
            <Award className="w-4 h-4" /> View on Dashboard
          </Link>
          <Link to="/report" className="btn-secondary">
            <FileText className="w-4 h-4" /> Report Another Issue
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

function ResultRow({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}
