import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload, Camera, Sparkles, Brain, CheckCircle2, ShieldX, AlertTriangle,
  Car, RefreshCw, Tag, FilePlus, ChevronRight, Zap
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Sidebar } from '@/components/layout/Sidebar';
import { geminiService, type GeminiImageAnalysisResult } from '@/services/geminiService';
import { useToast } from '@/contexts/ToastContext';
import { getSeverityColor } from '@/utils/helpers';

const SAMPLE_TEST_IMAGES = [
  {
    name: 'Severe Pothole',
    url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80',
    type: 'Infrastructure Hazard',
    desc: 'Road damage & deep surface crater'
  },
  {
    name: 'Helmet Violation',
    url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&auto=format&fit=crop&q=80',
    type: 'Traffic Violation',
    desc: 'Two-wheeler rider without protective helmet'
  },
  {
    name: 'Illegal Parking',
    url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600&auto=format&fit=crop&q=80',
    type: 'Traffic Violation',
    desc: 'Vehicle blocking pedestrian pathway'
  },
  {
    name: 'Non-Traffic Photo',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    type: 'Test Image Rejection',
    desc: 'Portrait photo to test AI content gate'
  }
];

export function AIAnalyzerPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<GeminiImageAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (file: File | Blob, previewUrl: string) => {
    setImagePreview(previewUrl);
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const mimeType = (file instanceof File ? file.type : '') || 'image/jpeg';

      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = window.btoa(binary);

      const res = await geminiService.analyzeImage(base64, mimeType, {
        category: 'general',
        categoryGroup: 'traffic',
        description: 'Interactive AI Vision Analysis',
        title: 'Uploaded Evidence Photo',
        lat: 12.9716,
        lng: 77.5946,
        city: 'Bengaluru',
      });

      setResult(res);
      showToast('AI Image Analysis completed', 'success');
    } catch (err: any) {
      const msg = err?.message || 'Failed to analyze image. Please try again.';
      setError(msg);
      showToast(msg, 'error');
    } fontally: {
      setAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      processImage(file, url);
    }
  };

  const handleSampleClick = async (sample: typeof SAMPLE_TEST_IMAGES[0]) => {
    try {
      setAnalyzing(true);
      setImagePreview(sample.url);
      setResult(null);
      setError(null);

      const resp = await fetch(sample.url);
      const blob = await resp.blob();
      await processImage(blob, sample.url);
    } catch {
      setError('Could not load sample image. Please try uploading your own photo.');
      setAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      processImage(file, url);
    }
  };

  const handleFileReport = () => {
    if (!result) return;
    navigate('/report', {
      state: {
        prefill: {
          title: result.description || 'AI Reported Issue',
          category: result.issue || 'pothole',
          severity: result.severity || 'medium',
          imagePreview,
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
      <Navbar />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 section-padding pt-24 pb-16 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="mb-8 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-3">
            <Sparkles className="w-4 h-4" /> Gemini Vision 2.5 Multi-Modal Engine
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            AI Vision <span className="text-blue-600 dark:text-blue-400">Image Analyzer</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base mt-2">
            Upload or capture any photo to test real-time AI object detection, vehicle & license plate OCR, digital image authenticity, severity rating, and duplicate report matching.
          </p>
        </div>

        {/* Test Image Quick Select */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" /> Try Sample Test Images:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SAMPLE_TEST_IMAGES.map((sample) => (
              <button
                key={sample.name}
                onClick={() => handleSampleClick(sample)}
                disabled={analyzing}
                className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-left hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-lg disabled:opacity-50"
              >
                <div className="aspect-video w-full rounded-lg overflow-hidden mb-2 bg-slate-100 dark:bg-slate-800">
                  <img src={sample.url} alt={sample.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{sample.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{sample.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Upload & Analysis Container */}
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Column: Upload Dropzone & Image Preview */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[320px] ${
                imagePreview
                  ? 'border-blue-500/50 bg-blue-50/20 dark:bg-blue-500/5'
                  : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-slate-900'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {imagePreview ? (
                <div className="relative w-full h-full min-h-[260px] flex items-center justify-center rounded-xl overflow-hidden group">
                  <img src={imagePreview} alt="Evidence" className="max-h-72 w-auto object-contain rounded-lg shadow-md" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button className="btn-secondary text-xs bg-white/90 text-slate-900 backdrop-blur-sm">
                      <RefreshCw className="w-3.5 h-3.5" /> Change Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-sm">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Drop photo here or Click to upload</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                    Supports JPEG, PNG, WebP up to 10MB.
                  </p>
                </div>
              )}
            </div>

            {imagePreview && !analyzing && (
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-ghost flex-1 justify-center text-xs"
                >
                  <Camera className="w-4 h-4" /> Select Another
                </button>
                {result?.isRelevant && (
                  <button
                    onClick={handleFileReport}
                    className="btn-primary flex-1 justify-center text-xs"
                  >
                    <FilePlus className="w-4 h-4" /> File Report with AI
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Column: AI Analysis Results Dashboard */}
          <div className="lg:col-span-7">
            {analyzing ? (
              <div className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center text-center min-h-[380px]">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-600 flex items-center justify-center mb-4"
                >
                  <Brain className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </motion.div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Analyzing Image with Gemini Vision...</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
                  Detecting civic issue category, evaluating digital authenticity, extracting vehicle metadata, and scoring hazard severity...
                </p>
              </div>
            ) : error ? (
              <div className="glass-card p-6 rounded-2xl border-l-4 border-red-500 bg-red-50/50 dark:bg-red-500/10">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  <div>
                    <h3 className="text-base font-bold text-red-700 dark:text-red-400">Analysis Error</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{error}</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-secondary text-xs mt-4"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            ) : result ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Status Banner */}
                <div className={`p-4 rounded-2xl border ${
                  result.isRelevant
                    ? 'bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                    : 'bg-amber-50/80 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
                }`}>
                  <div className="flex items-center gap-3">
                    {result.isRelevant ? (
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-md">
                        <ShieldX className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <h3 className={`text-base font-bold ${result.isRelevant ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'}`}>
                        {result.isRelevant ? 'Valid Civic / Traffic Scene Detected' : 'Image Content Warning'}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        {result.reason || result.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="glass-card p-3 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Confidence</span>
                    <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                      {Math.round(result.confidence * 100)}%
                    </span>
                  </div>

                  <div className="glass-card p-3 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Severity</span>
                    <span className={`text-sm font-bold capitalize ${getSeverityColor(result.severity || 'low').text}`}>
                      {result.severity || 'N/A'}
                    </span>
                  </div>

                  <div className="glass-card p-3 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Priority Score</span>
                    <span className="text-lg font-extrabold text-amber-500">
                      {result.priority || 0}/100
                    </span>
                  </div>

                  <div className="glass-card p-3 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Authenticity</span>
                    <span className={`text-sm font-bold ${result.imageAuthenticity?.isGenuine !== false ? 'text-emerald-500' : 'text-red-500'}`}>
                      {result.imageAuthenticity?.isGenuine !== false ? 'Genuine Photo' : 'Flagged'}
                    </span>
                  </div>
                </div>

                {/* Detailed Insights */}
                <div className="glass-card p-5 rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-500" /> Extracted Insights & Metadata
                  </h4>

                  <div className="grid sm:grid-cols-2 gap-4 text-xs">
                    {result.issue && (
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                        <span className="text-slate-400 block font-medium mb-0.5">Identified Civic Issue</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{result.issue}</span>
                      </div>
                    )}

                    {result.vehicleType && (
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                        <span className="text-slate-400 block font-medium mb-0.5">Detected Vehicle Type</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-blue-500" /> {result.vehicleType}
                        </span>
                      </div>
                    )}

                    {result.vehicleNumber && (
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                        <span className="text-slate-400 block font-medium mb-0.5">License Plate OCR</span>
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded">
                          {result.vehicleNumber}
                        </span>
                      </div>
                    )}

                    {result.recommendedAction && (
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl sm:col-span-2">
                        <span className="text-slate-400 block font-medium mb-0.5">Recommended Municipal Action</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{result.recommendedAction}</span>
                      </div>
                    )}
                  </div>

                  {/* Detected Objects Tags */}
                  {result.detectedObjects && result.detectedObjects.length > 0 && (
                    <div className="pt-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">Detected Visual Elements:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {result.detectedObjects.map((obj, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                          >
                            {obj.label} <span className="text-slate-400 text-[10px]">({Math.round(obj.confidence * 100)}%)</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {result.isRelevant && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleFileReport}
                      className="btn-primary flex-1 justify-center py-3 text-sm font-semibold"
                    >
                      File Report with AI Pre-fill <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center text-center min-h-[380px] border-dashed">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Ready for AI Image Analysis</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  Upload an image on the left or select one of the sample test images above to see Gemini Vision in action.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
