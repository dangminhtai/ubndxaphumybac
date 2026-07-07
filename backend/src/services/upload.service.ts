import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export class UploadService {
  /**
   * Upload file to Supabase Storage
   */
  static async uploadDocument(fileBuffer: Buffer, originalName: string, mimeType: string): Promise<string> {
    const fileExt = path.extname(originalName) || '';
    const safeName = crypto.randomUUID();
    const year = new Date().getFullYear();
    const filePath = `work-schedules/${year}/${safeName}${fileExt}`;

    const { error: uploadError } = await supabase.storage
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
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 5 * 60); // 5 minutes expiry

    if (error) {
      throw error;
    }

    return data.signedUrl;
  }
}
