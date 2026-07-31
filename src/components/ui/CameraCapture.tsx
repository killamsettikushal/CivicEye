import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, RefreshCw, Check, X, SwitchCamera, Loader2,
  AlertCircle, Upload, ImageIcon,
} from 'lucide-react';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: Blob, previewUrl: string) => void;
}

type Phase = 'requesting' | 'live' | 'preview' | 'error' | 'fallback';

interface CameraDevice {
  deviceId: string;
  label: string;
  facingMode?: 'user' | 'environment';
}

export function CameraCapture({ isOpen, onClose, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>('requesting');
  const [errorMessage, setErrorMessage] = useState('');
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isMobile, setIsMobile] = useState(false);

  const detectMobile = useCallback(() => {
    const ua = navigator.userAgent || navigator.vendor || '';
    return /android|iphone|ipad|ipod|opera mini|iemobile|blackberry/i.test(ua.toLowerCase());
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (mode?: 'user' | 'environment', deviceId?: string) => {
    stopStream();
    setPhase('requesting');
    setErrorMessage('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Camera API is not supported in this browser.');
      setPhase('error');
      return;
    }

    try {
      const mobile = detectMobile();
      setIsMobile(mobile);

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : mobile
            ? { facingMode: { ideal: mode ?? 'environment' } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Enumerate available cameras after permission is granted
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices: CameraDevice[] = allDevices
        .filter((d) => d.kind === 'videoinput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
        }));
      setDevices(videoDevices);

      const activeTrack = stream.getVideoTracks()[0];
      const settings = activeTrack?.getSettings();
      const activeId = settings?.deviceId ?? '';
      setActiveDeviceId(activeId);

      if (mobile && settings?.facingMode) {
        setFacingMode(settings.facingMode as 'user' | 'environment');
      }

      setPhase('live');
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setErrorMessage('Camera permission was denied. You can still upload a photo from your device.');
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera was found on this device. You can upload a photo instead.');
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        setErrorMessage('The camera is already in use by another application.');
      } else if (err?.name === 'OverconstrainedError') {
        setErrorMessage('No matching camera found. Try switching cameras or uploading a photo.');
      } else {
        setErrorMessage(err?.message || 'Failed to access the camera.');
      }
      setPhase('error');
    }
  }, [stopStream, detectMobile]);

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setCapturedBlob(null);
      setCapturedUrl(null);
      startCamera();
    } else {
      stopStream();
    }
    return () => stopStream();
  }, [isOpen, startCamera, stopStream]);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setCapturedBlob(blob);
      setCapturedUrl(URL.createObjectURL(blob));
      stopStream();
      setPhase('preview');
    }, 'image/jpeg', 0.92);
  }, [stopStream]);

  const handleRetake = useCallback(() => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedBlob(null);
    setCapturedUrl(null);
    startCamera(facingMode, activeDeviceId || undefined);
  }, [capturedUrl, startCamera, facingMode, activeDeviceId]);

  const handleUsePhoto = useCallback(() => {
    if (capturedBlob && capturedUrl) {
      onCapture(capturedBlob, capturedUrl);
    }
    handleClose();
  }, [capturedBlob, capturedUrl, onCapture]);

  const handleClose = useCallback(() => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedBlob(null);
    setCapturedUrl(null);
    stopStream();
    onClose();
  }, [capturedUrl, stopStream, onClose]);

  const handleSwitchCamera = useCallback(async () => {
    if (isMobile) {
      const newMode = facingMode === 'environment' ? 'user' : 'environment';
      setFacingMode(newMode);
      await startCamera(newMode);
    } else if (devices.length > 1) {
      const currentIndex = devices.findIndex((d) => d.deviceId === activeDeviceId);
      const nextDevice = devices[(currentIndex + 1) % devices.length];
      if (nextDevice) {
        setActiveDeviceId(nextDevice.deviceId);
        await startCamera(undefined, nextDevice.deviceId);
      }
    }
  }, [isMobile, facingMode, devices, activeDeviceId, startCamera]);

  const handleFallbackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCapturedBlob(file);
    setCapturedUrl(url);
    setPhase('preview');
  };

  const canSwitch = isMobile || devices.length > 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/95 flex flex-col"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between p-4 text-white safe-top">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              <span className="text-sm font-semibold">
                {phase === 'preview' ? 'Preview' : phase === 'error' ? 'Camera Unavailable' : 'Take Photo'}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Close camera"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            {/* Requesting permission */}
            {phase === 'requesting' && (
              <div className="flex flex-col items-center gap-4 text-white/80">
                <Loader2 className="w-10 h-10 animate-spin" />
                <p className="text-sm">Requesting camera access…</p>
              </div>
            )}

            {/* Live preview */}
            {(phase === 'live' || phase === 'requesting') && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${phase === 'requesting' ? 'opacity-0' : ''} ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : undefined }}
              />
            )}

            {/* Captured preview */}
            {phase === 'preview' && capturedUrl && (
              <motion.img
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={capturedUrl}
                alt="Captured preview"
                className="w-full h-full object-contain"
              />
            )}

            {/* Error / fallback */}
            {phase === 'error' && (
              <div className="flex flex-col items-center gap-4 px-6 text-center max-w-sm">
                <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-sm text-white/80">{errorMessage}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-primary !bg-blue-600 !from-blue-600 !to-blue-500"
                >
                  <Upload className="w-4 h-4" /> Upload Photo Instead
                </button>
              </div>
            )}

            {/* Fallback file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFallbackUpload}
              className="hidden"
            />
          </div>

          {/* Bottom controls */}
          <div className="p-6 safe-bottom">
            {phase === 'live' && (
              <div className="flex items-center justify-center gap-8">
                {canSwitch && (
                  <button
                    onClick={handleSwitchCamera}
                    className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
                    aria-label="Switch camera"
                  >
                    <SwitchCamera className="w-6 h-6" />
                  </button>
                )}
                <button
                  onClick={handleCapture}
                  className="w-18 h-18 rounded-full bg-white border-4 border-white/30 hover:scale-105 active:scale-95 transition-transform shadow-xl"
                  style={{ width: 72, height: 72 }}
                  aria-label="Capture photo"
                >
                  <span className="block w-full h-full rounded-full bg-white" />
                </button>
                <div className="w-12 h-12" />
              </div>
            )}

            {phase === 'preview' && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleRetake}
                  className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
                >
                  <span className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5" />
                  </span>
                  <span className="text-xs">Retake</span>
                </button>
                <button
                  onClick={handleUsePhoto}
                  className="flex flex-col items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <span className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Check className="w-6 h-6 text-white" />
                  </span>
                  <span className="text-xs">Use Photo</span>
                </button>
                <button
                  onClick={handleClose}
                  className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors"
                >
                  <span className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
                    <X className="w-5 h-5" />
                  </span>
                  <span className="text-xs">Cancel</span>
                </button>
              </div>
            )}

            {phase === 'error' && (
              <div className="flex justify-center">
                <button
                  onClick={handleClose}
                  className="btn-ghost text-white/70 hover:text-white"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
