import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, Brain, ScanEye, FileText, Copy, Route, AlertTriangle, FileCheck, ShieldX } from 'lucide-react';
import { reportService, processReport, getProcessingSteps } from '@/services/api';
import type { ProcessingStep, AIResult } from '@/types';
import { useToast } from '@/contexts/ToastContext';

const STEP_ICONS = [ScanEye, ScanEye, Brain, FileText, Brain, Copy, AlertTriangle, Route, FileCheck];

export function AIProcessingPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [steps, setSteps] = useState<ProcessingStep[]>(getProcessingSteps());
  const [currentStep, setCurrentStep] = useState(0);
  const [report, setReport] = useState<{ category: string } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [invalidImageRejection, setInvalidImageRejection] = useState(false);

  useEffect(() => {
    (async () => {
      if (!reportId) return;
      const r = await reportService.getReportById(reportId);
      if (!r) return;
      setReport({ category: r.category });

      try {
        const aiResult = await processReport(
          reportId,
          r.category,
          (stepIndex, progress) => {
            setSteps((prev) => {
              const updated = [...prev];
              updated[stepIndex] = { ...updated[stepIndex], status: progress < 100 ? 'processing' : 'completed', progress };
              if (progress === 100 && stepIndex < updated.length - 1) {
                updated[stepIndex].status = 'completed';
              }
              return updated;
            });
            setCurrentStep(stepIndex);
          },
          r.evidenceUrls?.map((url) => ({ url })),
          { title: r.title, description: r.description, lat: r.location.lat, lng: r.location.lng, city: r.location.city },
        );

        await reportService.updateReportWithAI(reportId, aiResult);
        setTimeout(() => navigate(`/result/${reportId}`), 500);
      } catch (err: any) {
        const rawMsg = err?.message ?? 'AI analysis could not be completed.';
        let msg = rawMsg;
        let invalidImage = false;

        // Surface image-validation gate rejections with a clean warning
        if (typeof rawMsg === 'string' && rawMsg.startsWith('INVALID_IMAGE:')) {
          invalidImage = true;
          const [, , ...reasonParts] = rawMsg.split(':');
          msg = reasonParts.join(':') || 'This does not appear to be a valid traffic violation photo.';
        }

        setAnalysisError(msg);
        setInvalidImageRejection(invalidImage);
        showToast(msg, 'error');
      }
    })();
  }, [reportId, navigate, showToast]);

  const overallProgress = (steps.filter((s) => s.status === 'completed').length / steps.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30"
            >
              <Brain className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI Analysis in Progress</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Report ID: {reportId}</p>
          </div>

          {/* Overall progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Overall Progress</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{Math.round(overallProgress)}%</span>
            </div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full"
              />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, i) => {
              const Icon = STEP_ICONS[i] ?? CheckCircle2;
              return (
                <motion.div
                  key={step.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    step.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-500/10' :
                    step.status === 'processing' ? 'bg-blue-50 dark:bg-blue-500/10' :
                    'bg-slate-50 dark:bg-slate-800/50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    step.status === 'completed' ? 'bg-emerald-500' :
                    step.status === 'processing' ? 'bg-blue-500' :
                    'bg-slate-200 dark:bg-slate-700'
                  }`}>
                    {step.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-white" /> :
                     step.status === 'processing' ? <Loader2 className="w-5 h-5 text-white animate-spin" /> :
                     <Icon className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      step.status === 'completed' ? 'text-emerald-700 dark:text-emerald-400' :
                      step.status === 'processing' ? 'text-blue-700 dark:text-blue-400' :
                      'text-slate-500 dark:text-slate-400'
                    }`}>{step.label}</p>
                    {step.status === 'processing' && (
                      <div className="mt-1.5 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div animate={{ width: `${step.progress}%` }} transition={{ duration: 0.1 }} className="h-full bg-blue-500 rounded-full" />
                      </div>
                    )}
                  </div>
                  {step.status === 'completed' && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Done</span>}
                </motion.div>
              );
            })}
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">AI analysis powered by Gemini 2.5 Flash — image authenticity, severity classification, and duplicate detection.</p>

          {analysisError && (
            <div className="mt-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20">
              <div className="flex items-start gap-3">
                {invalidImageRejection ? <ShieldX className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                    {invalidImageRejection ? 'Invalid image: not a traffic violation' : 'Analysis could not be completed'}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{analysisError}</p>
                  {invalidImageRejection && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Please upload valid traffic violation evidence. OCR, license plate extraction, and violation classification were skipped.
                    </p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => navigate('/report')} className="btn-secondary text-sm">
                      Back to Report
                    </button>
                    {!invalidImageRejection && (
                      <button onClick={() => navigate(`/result/${reportId}`)} className="btn-ghost text-sm">
                        View Report Without AI
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
