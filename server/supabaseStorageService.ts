import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export const BUCKET_NAME = 'housing_pdfs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export const serverSupabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes('your-project') &&
    !supabaseUrl.includes('placeholder')
  );
}

/**
 * Uploads a file buffer to Supabase Storage bucket ('housing_pdfs')
 */
export async function uploadToSupabaseStorage(
  fileBuffer: Buffer,
  originalFileName: string,
  mimeType: string = 'application/pdf',
  registrationNumber: string = 'unknown'
): Promise<{ success: boolean; key: string; fileName: string }> {
  const sanitizedName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const uniquePrefix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const key = `${year}/${month}/${registrationNumber}_${uniquePrefix}_${sanitizedName}`;

  if (!isSupabaseConfigured()) {
    console.warn('⚠️ Supabase is not fully configured in .env. Storing virtual key for testing:', key);
    return {
      success: true,
      key,
      fileName: originalFileName,
    };
  }

  const { data, error } = await serverSupabase.storage
    .from(BUCKET_NAME)
    .upload(key, fileBuffer, {
      contentType: mimeType || 'application/pdf',
      upsert: false,
    });

  if (error) {
    console.error('Supabase Storage Upload Error:', error);
    throw new Error(`Failed to upload file to Supabase Storage: ${error.message}`);
  }

  return {
    success: true,
    key: data.path,
    fileName: originalFileName,
  };
}

/**
 * Generates a temporary Signed Download URL for viewing or downloading the PDF from Supabase Storage
 */
export async function generateSignedDownloadUrl(
  filePath: string,
  expiresInSeconds: number = 300
): Promise<string> {
  if (!filePath) {
    throw new Error('File path is required to generate download URL');
  }

  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please check VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  const { data, error } = await serverSupabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error) {
    console.error('Error generating Supabase signed URL:', error);
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  if (!data?.signedUrl) {
    throw new Error('Signed URL returned empty from Supabase');
  }

  return data.signedUrl;
}

/**
 * Deletes a file permanently from Supabase Storage bucket
 */
export async function deleteFromSupabaseStorage(filePath: string): Promise<boolean> {
  if (!filePath) return false;

  if (!isSupabaseConfigured()) {
    console.warn(`[Supabase Simulated Delete] Path: ${filePath}`);
    return true;
  }

  try {
    const { error } = await serverSupabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error(`[Supabase Storage Delete Error] Failed to delete ${filePath}:`, error);
      return false;
    }

    console.log(`[Supabase Storage Delete Success] Deleted file: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`[Supabase Storage Delete Error] Exception deleting ${filePath}:`, error);
    return false;
  }
}

/**
 * 24-Hour Lifecycle Engine:
 * Finds all requests with status = 'مكتمل' where completed_at is older than 24 hours
 * and file_deleted is false, then deletes the PDF from Supabase Storage and updates the database.
 */
export async function cleanupExpiredCompletedFiles(): Promise<{
  totalEligible: number;
  deletedCount: number;
  deletedIds: string[];
}> {
  try {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    console.log(`[Supabase Cleanup Worker] Checking for completed files older than 24h (Cutoff: ${cutoffDate})...`);

    // Fetch eligible records from Supabase
    const { data: records, error } = await serverSupabase
      .from('housing_requests')
      .select('id, first_name, last_name, registration_number, pdf_file_path, completed_at, file_deleted')
      .eq('status', 'مكتمل')
      .eq('file_deleted', false)
      .not('completed_at', 'is', null)
      .lte('completed_at', cutoffDate);

    if (error) {
      console.error('[Supabase Cleanup Worker] Database query error:', error);
      return { totalEligible: 0, deletedCount: 0, deletedIds: [] };
    }

    if (!records || records.length === 0) {
      console.log('[Supabase Cleanup Worker] No expired completed files found.');
      return { totalEligible: 0, deletedCount: 0, deletedIds: [] };
    }

    console.log(`[Supabase Cleanup Worker] Found ${records.length} records eligible for 24h deletion.`);

    const deletedIds: string[] = [];

    for (const record of records) {
      try {
        if (record.pdf_file_path) {
          await deleteFromSupabaseStorage(record.pdf_file_path);
        }

        // Update database record to mark file as deleted
        const { error: updateError } = await serverSupabase
          .from('housing_requests')
          .update({
            file_deleted: true,
            file_deleted_at: new Date().toISOString(),
          })
          .eq('id', record.id);

        if (updateError) {
          console.error(`[Supabase Cleanup Worker] Failed to update DB status for record ${record.id}:`, updateError);
        } else {
          deletedIds.push(record.id);
          console.log(`[Supabase Cleanup Worker] Successfully deleted PDF for student ${record.first_name} ${record.last_name} (${record.registration_number})`);
        }
      } catch (itemError) {
        console.error(`[Supabase Cleanup Worker] Error processing record ${record.id}:`, itemError);
      }
    }

    return {
      totalEligible: records.length,
      deletedCount: deletedIds.length,
      deletedIds,
    };
  } catch (err) {
    console.error('[Supabase Cleanup Worker] Critical error during cleanup execution:', err);
    return { totalEligible: 0, deletedCount: 0, deletedIds: [] };
  }
}

/**
 * Backward compatibility helper for upload URL endpoint
 */
export async function generatePresignedUploadUrl(
  originalFileName: string,
  _mimeType: string = 'application/pdf',
  registrationNumber: string = 'unknown'
): Promise<{ uploadUrl: string; key: string; fileName: string }> {
  const sanitizedName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const uniquePrefix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const key = `${year}/${month}/${registrationNumber}_${uniquePrefix}_${sanitizedName}`;

  return {
    uploadUrl: '',
    key,
    fileName: originalFileName,
  };
}
