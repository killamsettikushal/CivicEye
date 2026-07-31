import { supabase } from '@/services/supabaseClient';
import { compressImage } from '@/utils/imageCompression';

export interface UploadResult {
  url: string;
  path: string;
}

export const evidenceStorage = {
  async upload(file: Blob, userId: string): Promise<UploadResult> {
    const compressed = await compressImage(file);
    const ext = compressed.type === 'image/png' ? 'png' : 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const path = `${userId}/${filename}`;

    const { error } = await supabase.storage
      .from('report-evidence')
      .upload(path, compressed, {
        contentType: compressed.type || 'image/jpeg',
        cacheControl: '3600',
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('report-evidence')
      .getPublicUrl(path);

    return { url: urlData.publicUrl, path };
  },

  async remove(path: string): Promise<void> {
    const { error } = await supabase.storage.from('report-evidence').remove([path]);
    if (error) throw error;
  },
};
