import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Upload, MapPin, Clock, Smartphone, FileText,
  ChevronRight, Check, X, AlertCircle, Image as ImageIcon, Loader2,
  Mic, Type, RotateCcw, Send, CheckCircle2, AlertTriangle, Shield, ShieldX, Copy,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { reportService } from '@/services/api';
import { evidenceStorage } from '@/services/evidenceStorage';
import { CameraCapture } from '@/components/ui/CameraCapture';
import { VoiceRecorder } from '@/components/ui/VoiceRecorder';
import { VoiceComplaintPanel } from '@/components/ui/VoiceComplaintPanel';
import { geminiService, type GeminiImageAnalysisResult } from '@/services/geminiService';
import { BackButton } from '@/components/ui/BackButton';
import { arrayBufferToBase64 } from '@/utils/helpers';
import { INFRASTRUCTURE_CATEGORIES, TRAFFIC_CATEGORIES, CATEGORY_LABELS, getDepartmentForCategory } from '@/data/mockData';
import type { ReportCategory } from '@/types';

type ComplaintMode = 'text' | 'voice';

/** Friendly message for images rejected by the validation gate. */
const INVALID_IMAGE_LABELS: Record<string, string> = {
  selfie: 'This appears to be a selfie. Please upload valid traffic violation evidence.',
  portrait: 'This appears to be a portrait photo of a person. Please upload valid traffic violation evidence.',
  animal: 'This appears to be an animal photo. Please upload valid traffic violation evidence.',
  scenery: 'This appears to be scenery or a landscape. Please upload valid traffic violation evidence.',
  document: 'This appears to be a document or screenshot. Please upload a real photo of the traffic violation.',
  other: 'This does not appear to be a traffic violation photo. Please upload valid traffic violation evidence.',
};

export function ReportSubmissionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'admin') {
      showToast('Admins cannot submit reports. Use the admin dashboard to manage reports.', 'warning');
      navigate('/admin', { replace: true });
    }
  }, [user, navigate, showToast]);

  const [step, setStep] = useState(1);
  const [type, setType] = useState<'infrastructure' | 'traffic' | null>(searchParams.get('type') as 'infrastructure' | 'traffic' | null);
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);
  const [evidencePaths, setEvidencePaths] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string; city: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice complaint state — local audio only, no AI processing
  const [complaintMode, setComplaintMode] = useState<ComplaintMode>('text');
  const [voiceRecorded, setVoiceRecorded] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Image analysis state
  const [imageAnalysis, setImageAnalysis] = useState<GeminiImageAnalysisResult | null>(null);
  const [imageAnalyzing, setImageAnalyzing] = useState(false);
  const [imageAnalysisError, setImageAnalysisError] = useState<string | null>(null);
  const [imageRejected, setImageRejected] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const lastAnalyzedFile = useRef<Blob | File | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, address: 'Current Location', city: 'Your City' });
        },
        () => {
          setLocation({ lat: 12.9716, lng: 77.5946, address: 'Bengaluru, Karnataka', city: 'Bengaluru' });
        },
      );
    } else {
      setLocation({ lat: 12.9716, lng: 77.5946, address: 'Bengaluru, Karnataka', city: 'Bengaluru' });
    }
  }, []);

  const categories = type === 'infrastructure' ? INFRASTRUCTURE_CATEGORIES : TRAFFIC_CATEGORIES;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const result = await evidenceStorage.upload(file, user.id);
        setEvidence((prev) => [...prev, result.url]);
        setEvidencePaths((prev) => [...prev, result.path]);
      }
      showToast(`${files.length} file(s) uploaded`, 'success');
      // Analyze the first image with Gemini
      if (files[0] && files[0].type.startsWith('image/')) {
        await analyzeImageFile(files[0]);
      }
    } catch {
      showToast('Failed to upload file(s)', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCameraCapture = async (blob: Blob, previewUrl: string) => {
    if (!user) return;
    setUploading(true);
    try {
      const result = await evidenceStorage.upload(blob, user.id);
      setEvidence((prev) => [...prev, result.url]);
      setEvidencePaths((prev) => [...prev, result.path]);
      URL.revokeObjectURL(previewUrl);
      showToast('Photo captured and uploaded', 'success');
      // Analyze the captured image with Gemini
      await analyzeImageFile(blob);
    } catch {
      showToast('Failed to upload photo', 'error');
      URL.revokeObjectURL(previewUrl);
    } finally {
      setUploading(false);
    }
  };

  /**
   * Converts a Blob/File to base64 and sends it to the Gemini edge function
   * for genuine visual analysis. Updates imageAnalysis state with results.
   */
  const analyzeImageFile = async (file: Blob | File) => {
    setImageAnalyzing(true);
    setImageAnalysisError(null);
    setImageAnalysis(null);
    setImageRejected(false);
    setRateLimited(false);
    lastAnalyzedFile.current = file;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      const mimeType = (file instanceof File ? file.type : '') || 'image/jpeg';

      const result = await geminiService.analyzeImage(base64, mimeType, {
        category: category ?? '',
        categoryGroup: type ?? '',
        description,
        title,
        lat: location?.lat ?? 0,
        lng: location?.lng ?? 0,
        city: location?.city ?? '',
      });

      setImageAnalysis(result);

      // Strict validation gate: if the image is not a valid traffic/civic scene,
      // halt processing and surface a clean warning. This blocks OCR, plate
      // extraction, and violation classification from running on junk input.
      if (!result.isRelevant) {
        setImageRejected(true);
        showToast(result.reason || 'Image rejected: not a traffic violation.', 'warning');
        // Remove the rejected evidence so the user must upload a valid photo
        setEvidence([]);
        setEvidencePaths([]);
        return;
      }

      // Only proceed with auto-fill / OCR results when the image is genuinely relevant
      if (result.issue) {
        const matchedCat = categories.find((c) => c.value === result.issue);
        if (matchedCat) {
          setCategory(matchedCat.value);
        }
      }
      if (!title && result.description) {
        setTitle(result.description.slice(0, 80));
      }
      showToast(`AI analysis complete — ${Math.round(result.confidence * 100)}% confidence`, 'success');
    } catch (err: any) {
      if (err?.rateLimited) {
        setRateLimited(true);
        showToast('AI service is busy. Please wait a moment and retry.', 'warning');
      } else {
        const msg = err?.message ?? 'Image analysis could not be completed.';
        setImageAnalysisError(msg);
        showToast(msg, 'error');
      }
    } finally {
      setImageAnalyzing(false);
    }
  };

  const retryImageAnalysis = () => {
    if (lastAnalyzedFile.current) {
      analyzeImageFile(lastAnalyzedFile.current);
    }
  };

  const removeEvidence = (index: number) => {
    setEvidence(evidence.filter((_, i) => i !== index));
    setEvidencePaths(evidencePaths.filter((_, i) => i !== index));
  };

  // ============ Voice complaint handlers ============

  const handleAudioReady = async (blob: Blob) => {
    setAudioBlob(blob);
    setVoiceLoading(true);
    setVoiceError(null);
    try {
      // Voice notes are stored locally — no AI transcription or classification.
      // A small delay lets the UI show the saving state before confirming.
      await new Promise((r) => setTimeout(r, 600));
      setVoiceRecorded(true);
      showToast('Voice note saved — please type your complaint below', 'success');
    } catch {
      setVoiceError('Failed to save voice note. Please try again or use text input.');
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleRerecord = () => {
    setVoiceRecorded(false);
    setVoiceError(null);
    setAudioBlob(null);
  };

  const canProceed = () => {
    if (step === 1) return type !== null;
    if (step === 2) {
      if (category !== null) return true;
      return false;
    }
    if (step === 3) return title.length > 0 && description.length > 0;
    if (step === 4) return evidence.length > 0 && !imageRejected;
    return true;
  };

  const handleSubmit = async () => {
    if (!category || !location || !user) return;
    if (evidence.length === 0) {
      showToast('Please upload at least one photo as evidence. AI analysis is required.', 'error');
      return;
    }
    if (imageRejected) {
      showToast('The uploaded image was rejected by AI validation. Please upload a valid civic issue photo.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      // If voice complaint, save the raw audio + typed complaint to voice_complaints table
      if (complaintMode === 'voice' && audioBlob && voiceRecorded) {
        await geminiService.saveVoiceComplaint(
          audioBlob,
          description || title,
          location,
          evidence,
          user.id,
        );
      }

      const report = await reportService.createReport({
        category,
        title,
        description,
        location,
        evidenceUrls: evidence,
      });
      showToast('Report submitted! AI is analysing...', 'success');
      navigate(`/processing/${report.id}`);
    } catch (err: any) {
      showToast(err?.message ?? 'Failed to submit report. Try again.', 'error');
      setSubmitting(false);
    }
  };

  const steps = ['Category', 'Complaint', 'Details', 'Review'];

  return (
    <DashboardLayout>
      {/* Progress indicator */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                  step > i + 1 ? 'bg-emerald-500 text-white' : step === i + 1 ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  {step > i + 1 ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs font-medium ${step === i + 1 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>{s}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 rounded ${step > i + 1 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Category Selection */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">What would you like to report?</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Choose a category to get started.</p>

            {!type ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <button onClick={() => setType('infrastructure')} className="glass-card glass-card-hover p-6 text-left group">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Camera className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Infrastructure Issue</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Potholes, streetlights, garbage, water leakage, drains, and more.</p>
                </button>
                <button onClick={() => setType('traffic')} className="glass-card glass-card-hover p-6 text-left group">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Camera className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Traffic Violation</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Helmet missing, wrong-side driving, signal jumping, illegal parking, and more.</p>
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`p-4 rounded-xl border text-center transition-all ${
                        category === cat.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-md'
                          : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/30 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center ${category === cat.value ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        <span className={`text-xs font-bold ${category === cat.value ? 'text-white' : 'text-slate-500'}`}>{cat.label.slice(0, 2)}</span>
                      </div>
                      <span className={`text-xs font-medium ${category === cat.value ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>{cat.label}</span>
                    </button>
                  ))}
                </div>
                {category && (
                  <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-blue-700 dark:text-blue-300">Will be routed to: <strong>{getDepartmentForCategory(category)}</strong></span>
                  </div>
                )}
              </>
            )}

            <div className="mt-6 flex justify-between items-center">
              {type && <BackButton onClick={() => { setType(null); setCategory(null); }} label="Back to Issue Type" />}
              {canProceed() && (
                <button onClick={() => setStep(2)} className="btn-primary ml-auto">Continue <ChevronRight className="w-4 h-4" /></button>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 2: Complaint (Voice or Text) */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Describe Your Complaint</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Record your complaint in any language — AI will transcribe, translate, and classify it automatically.</p>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-6 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit">
              <button
                onClick={() => setComplaintMode('voice')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${complaintMode === 'voice' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}
              >
                <Mic className="w-4 h-4" /> Voice Complaint
              </button>
              <button
                onClick={() => setComplaintMode('text')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${complaintMode === 'text' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}
              >
                <Type className="w-4 h-4" /> Text Input
              </button>
            </div>

            {/* Voice mode */}
            {complaintMode === 'voice' && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800/50 dark:to-blue-500/5 border border-slate-200 dark:border-slate-700">
                  <VoiceRecorder onAudioReady={handleAudioReady} disabled={voiceLoading} />
                </div>

                <VoiceComplaintPanel
                  recorded={voiceRecorded}
                  loading={voiceLoading}
                  error={voiceError}
                  onRerecord={handleRerecord}
                />

                {/* Fallback text input when voice fails */}
                {(voiceError || !voiceRecorded) && !voiceLoading && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                    <p className="text-xs text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> Voice recording unavailable or not yet used? You can type your complaint instead.
                    </p>
                    <button
                      onClick={() => setComplaintMode('text')}
                      className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                    >
                      Switch to text input
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Text mode */}
            {complaintMode === 'text' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">Title</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Large pothole near MG Road signal" className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue, its impact, and exact location details..." rows={4} className="input-field resize-none" />
                </div>
              </div>
            )}

            {/* Evidence upload (shared for both modes) */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">Add Photo Evidence <span className="text-red-500">(Required)</span></p>
              <p className="text-xs text-slate-400 mb-3">AI will analyze your photo to classify the issue, detect duplicates, and reject invalid images. Report submission is disabled until a valid photo is uploaded.</p>
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                <label className="glass-card glass-card-hover p-4 flex items-center gap-3 cursor-pointer text-center">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    {uploading ? <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" /> : <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{uploading ? 'Uploading...' : 'Upload Photo'}</span>
                    <p className="text-xs text-slate-400">JPEG, PNG, or WebP</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
                </label>

                <button onClick={() => setCameraOpen(true)} disabled={uploading} className="glass-card glass-card-hover p-4 flex items-center gap-3 text-center disabled:opacity-50">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Capture Photo</span>
                    <p className="text-xs text-slate-400">Take a photo</p>
                  </div>
                </button>
              </div>

              <CameraCapture isOpen={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleCameraCapture} />

              {/* Auto-captured info */}
              <div className="grid sm:grid-cols-3 gap-3 mb-4">
                <div className="glass-card p-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">GPS Location</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Detecting...'}</p>
                  </div>
                </div>
                <div className="glass-card p-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Timestamp</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p>
                  </div>
                </div>
                <div className="glass-card p-3 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Device</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}</p>
                  </div>
                </div>
              </div>

              {/* Evidence preview */}
              {evidence.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">Uploaded Evidence ({evidence.length})</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {evidence.map((url, i) => (
                      <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                        <button onClick={() => removeEvidence(i)} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Image Analysis Results */}
              {imageAnalyzing && (
                <div className="mb-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Analyzing image with Gemini AI...</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Checking relevance, detecting objects, and classifying severity.</p>
                  </div>
                </div>
              )}

              {rateLimited && !imageAnalyzing && (
                <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">AI service is busy right now</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">The AI analysis hit a rate limit. Your photo is still uploaded — please wait a moment and retry the analysis.</p>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={retryImageAnalysis}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Retry analysis
                      </button>
                      <button
                        onClick={() => setRateLimited(false)}
                        className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {imageAnalysisError && !rateLimited && (
                <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Image analysis could not be completed</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{imageAnalysisError}</p>
                    <button
                      onClick={() => setImageAnalysisError(null)}
                      className="mt-2 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                    >
                      Dismiss and try again
                    </button>
                  </div>
                </div>
              )}

              {imageAnalysis && !imageAnalyzing && (
                <div className="mb-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {imageAnalysis.isRelevant ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      )}
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">AI Image Analysis</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${imageAnalysis.isRelevant ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
                      {Math.round(imageAnalysis.confidence * 100)}% confidence
                    </span>
                  </div>

                  {!imageAnalysis.isRelevant ? (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20">
                      <div className="flex items-start gap-2">
                        <ShieldX className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                            {imageAnalysis.reason || INVALID_IMAGE_LABELS[imageAnalysis.invalidImageType ?? 'other'] || INVALID_IMAGE_LABELS.other}
                          </p>
                          <button
                            onClick={() => {
                              setEvidence([]);
                              setEvidencePaths([]);
                              setImageAnalysis(null);
                              setImageRejected(false);
                              setImageAnalysisError(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Clear and upload a new photo
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {imageAnalysis.vehicleType && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">Vehicle Type</span>
                          <span className="font-medium text-slate-900 dark:text-white capitalize">{imageAnalysis.vehicleType}</span>
                        </div>
                      )}
                      {imageAnalysis.vehicleNumber && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">Vehicle Number</span>
                          <span className="font-medium text-slate-900 dark:text-white">{imageAnalysis.vehicleNumber}</span>
                        </div>
                      )}
                      {imageAnalysis.detectedViolation && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">Violation</span>
                          <span className="font-medium text-slate-900 dark:text-white">{imageAnalysis.detectedViolation}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Severity</span>
                        <span className="font-medium text-slate-900 dark:text-white capitalize">{imageAnalysis.severity}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Priority</span>
                        <span className="font-medium text-slate-900 dark:text-white">{imageAnalysis.priority}/100</span>
                      </div>
                      {imageAnalysis.description && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-xs text-slate-400 mb-1">AI Explanation</p>
                          <p className="text-sm text-slate-700 dark:text-slate-200">{imageAnalysis.description}</p>
                        </div>
                      )}
                      {imageAnalysis.imageAuthenticity && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 mb-1">
                            <Shield className="w-4 h-4 text-slate-400" />
                            <p className="text-xs text-slate-400">Image Authenticity</p>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-200">
                            {imageAnalysis.imageAuthenticity.isGenuine ? 'Genuine photo' : 'Potential manipulation detected'}
                            {imageAnalysis.imageAuthenticity.manipulationFlags.length > 0 && ` — ${imageAnalysis.imageAuthenticity.manipulationFlags.join(', ')}`}
                          </p>
                        </div>
                      )}
                      {imageAnalysis.duplicateProbability > 0.3 && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 mb-1">
                            <Copy className="w-4 h-4 text-slate-400" />
                            <p className="text-xs text-slate-400">Duplicate Check</p>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-200">
                            {Math.round(imageAnalysis.duplicateProbability * 100)}% chance this is a duplicate of an existing report.
                          </p>
                        </div>
                      )}
                      {imageAnalysis.issue && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-xs text-slate-400 mb-1">AI-suggested category (you can edit this above)</p>
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{imageAnalysis.issue}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(1)} className="btn-ghost">Back</button>
              <button onClick={() => setStep(3)} disabled={!canProceed() || imageRejected || evidence.length === 0 || imageAnalyzing} className="btn-primary disabled:opacity-50">
                {imageAnalyzing ? 'Analyzing...' : imageRejected ? 'Upload valid image to continue' : evidence.length === 0 ? 'Upload a photo to continue' : 'Continue'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Review Details</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Make any final edits before submitting.</p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Large pothole near MG Road signal" className="input-field" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue, its impact, and exact location details..." rows={4} className="input-field resize-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">Location</label>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-200">{location?.address ?? 'Detecting location...'}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(2)} className="btn-ghost">Back</button>
              <button onClick={() => setStep(4)} disabled={!canProceed()} className="btn-primary disabled:opacity-50">Review <ChevronRight className="w-4 h-4" /></button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Review & Submit</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Please review your report before submitting.</p>

            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="glass-card p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Category</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{category ? CATEGORY_LABELS[category] : '-'}</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Department</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{category ? getDepartmentForCategory(category) : '-'}</p>
                </div>
              </div>
              <div className="glass-card p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Title</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
              </div>
              <div className="glass-card p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{description}</p>
              </div>
              {complaintMode === 'voice' && voiceRecorded && audioBlob && (
                <div className="glass-card p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Voice Note</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Audio recording attached as supporting evidence.</p>
                </div>
              )}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="glass-card p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">GPS</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : '-'}</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Timestamp</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Evidence Files</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{evidence.length} file(s)</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(3)} className="btn-ghost" disabled={submitting}>Back</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit Report'} {!submitting && <Send className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
