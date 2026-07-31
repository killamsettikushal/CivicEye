/**
 * Image compression utility using canvas.
 * Resizes large images to a max dimension and re-encodes as JPEG
 * with a quality setting that preserves visual fidelity while
 * dramatically reducing file size.
 */

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;

export async function compressImage(
  file: Blob,
  maxDimension: number = MAX_DIMENSION,
  quality: number = JPEG_QUALITY,
): Promise<Blob> {
  const bitmap = await loadImageBitmap(file);

  let { width, height } = bitmap;
  if (width > maxDimension || height > maxDimension) {
    if (width >= height) {
      height = Math.round((height / width) * maxDimension);
      width = maxDimension;
    } else {
      width = Math.round((width / height) * maxDimension);
      height = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ?? file),
      'image/jpeg',
      quality,
    );
  });
}

function loadImageBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file).catch(() => loadHtmlImage(file));
  }
  return loadHtmlImage(file);
}

function loadHtmlImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}
