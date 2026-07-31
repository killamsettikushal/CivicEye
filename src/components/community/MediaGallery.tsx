import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Download, Play } from 'lucide-react';
import type { CommunityMedia } from '@/types';

interface MediaGalleryProps {
  media: CommunityMedia[];
}

export function MediaGallery({ media }: MediaGalleryProps) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (media.length === 0) return null;

  const images = media.filter((m) => m.type === 'image');
  const videos = media.filter((m) => m.type === 'video');
  const docs = media.filter((m) => m.type === 'document');

  return (
    <>
      <div className="mt-3 space-y-2">
        {/* Images */}
        {images.length > 0 && (
          <div
            className={`grid gap-2 ${
              images.length === 1
                ? 'grid-cols-1'
                : images.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-2 sm:grid-cols-3'
            }`}
          >
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setLightbox(i)}
                className={`relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 group ${
                  images.length === 1 ? 'max-h-96' : 'aspect-square'
                }`}
              >
                <img
                  src={img.url}
                  alt={`Media ${i + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}

        {/* Videos */}
        {videos.length > 0 && (
          <div className="grid gap-2">
            {videos.map((v, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden bg-black">
                <video
                  src={v.url}
                  controls
                  className="w-full max-h-96 object-contain"
                  preload="metadata"
                />
              </div>
            ))}
          </div>
        )}

        {/* Documents */}
        {docs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {docs.map((doc, i) => (
              <a
                key={i}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-blue-400 dark:hover:border-blue-500 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate max-w-48">
                    {doc.name || `Document ${i + 1}`}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Click to view</p>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={images[lightbox].url}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
