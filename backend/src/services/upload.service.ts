import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import path from 'path';

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL và SUPABASE_SECRET_KEY phải được cấu hình trong .env');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export class UploadService {
  /**
   * Upload file to Supabase Storage
   */
  static async uploadDocument(fileBuffer: Buffer, originalName: string, mimeType: string): Promise<string> {
    const fileExt = path.extname(originalName) || '';
    const safeName = crypto.randomUUID();
    const year = new Date().getFullYear();
    const filePath = `work-schedules/${year}/${safeName}${fileExt}`;

    const { error: uploadError } = await getSupabase().storage
      .from('documents')
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    return filePath;
  }

  /**
   * Get a short-lived signed URL for downloading/viewing a file
   */
  static async getSignedUrl(filePath: string): Promise<string> {
    const { data, error } = await getSupabase().storage
      .from('documents')
      .createSignedUrl(filePath, 5 * 60); // 5 minutes expiry

    if (error) {
      throw error;
    }

    return data.signedUrl;
  }
}
