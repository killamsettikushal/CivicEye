import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, X, RotateCcw, Loader2, AlertCircle, MicOff } from 'lucide-react';

type RecorderStatus = 'idle' | 'recording' | 'processing' | 'error' | 'denied';

interface VoiceRecorderProps {
  onAudioReady: (blob: Blob) => void;
  disabled?: boolean;
}

export function VoiceRecorder({ onAudioReady, disabled }: VoiceRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      stopTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    setDuration(0);
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const pickMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
  };

  const startRecording = useCallback(async () => {
    setErrorMessage('');
    setStatus('idle');

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('denied');
      setErrorMessage('Voice recording is not supported in this browser. Please use the text input below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size > 0) {
          onAudioReady(blob);
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };

      recorder.start();
      setStatus('recording');
      startTimer();
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatus('denied');
        setErrorMessage('Microphone permission denied. Please allow microphone access in your browser settings and try again.');
      } else if (err.name === 'NotFoundError') {
        setStatus('error');
        setErrorMessage('No microphone found on this device. Please use the text input below.');
      } else {
        setStatus('error');
        setErrorMessage(err?.message ?? 'Failed to start recording. Please try again.');
      }
    }
  }, [onAudioReady]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopTimer();
    setStatus('processing');
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopTimer();
    setStatus('idle');
    setDuration(0);
    chunksRef.current = [];
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const rerecord = useCallback(() => {
    cancelRecording();
    setTimeout(() => startRecording(), 100);
  }, [cancelRecording, startRecording]);

  const isSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Main mic button */}
      <div className="relative">
        {status === 'recording' && (
          <>
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-red-500/30"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
              className="absolute inset-0 rounded-full bg-red-500/20"
            />
          </>
        )}
        <button
          onClick={status === 'idle' || status === 'error' || status === 'denied' ? startRecording : stopRecording}
          disabled={disabled || status === 'processing'}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg ${
            status === 'recording'
              ? 'bg-red-500 text-white shadow-red-500/30'
              : status === 'processing'
                ? 'bg-blue-500 text-white'
                : 'bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-blue-500/30 hover:scale-105'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          aria-label={status === 'recording' ? 'Stop recording' : 'Start recording'}
        >
          {status === 'processing' ? (
            <Loader2 className="w-10 h-10 animate-spin" />
          ) : status === 'recording' ? (
            <Square className="w-8 h-8 fill-current" />
          ) : !isSupported ? (
            <MicOff className="w-10 h-10" />
          ) : (
            <Mic className="w-10 h-10" />
          )}
        </button>
      </div>

      {/* Status text */}
      <div className="text-center min-h-[2rem]">
        {status === 'idle' && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Tap the microphone to record your complaint</p>
        )}
        {status === 'recording' && (
          <p className="text-sm font-semibold text-red-500 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Recording... {formatTime(duration)}
          </p>
        )}
        {status === 'processing' && (
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Saving audio...</p>
        )}
        {status === 'denied' && (
          <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1.5">
            <AlertCircle className="w-4 h-4" /> Microphone access denied
          </p>
        )}
        {status === 'error' && (
          <p className="text-sm text-red-500 flex items-center justify-center gap-1.5">
            <AlertCircle className="w-4 h-4" /> Recording failed
          </p>
        )}
      </div>

      {/* Recording controls */}
      <AnimatePresence>
        {status === 'recording' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex gap-3"
          >
            <button
              onClick={stopRecording}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center gap-1.5"
            >
              <Square className="w-4 h-4 fill-current" /> Stop & Process
            </button>
            <button
              onClick={cancelRecording}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center gap-1.5"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Re-record button after processing */}
      <AnimatePresence>
        {status === 'processing' && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={rerecord}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" /> Re-record
          </motion.button>
        )}
      </AnimatePresence>

      {/* Error message */}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 max-w-sm text-center"
        >
          <p className="text-xs text-amber-700 dark:text-amber-400">{errorMessage}</p>
        </motion.div>
      )}
    </div>
  );
}
