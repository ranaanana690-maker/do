import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'housing-pdfs';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

// Initialize S3 Client for Cloudflare R2
export const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : 'https://auto.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export function isR2Configured(): boolean {
  return Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);
}

// Initialize Supabase Client for server-side operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
export const serverSupabase = createClient(supabaseUrl, supabaseKey);

/**
 * Uploads a file buffer to Cloudflare R2 bucket
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  originalFileName: string,
  mimeType: string,
  registrationNumber: string = 'unknown'
): Promise<{ success: boolean; key: string; fileName: string; url?: string }> {
  const sanitizedName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const uniquePrefix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const key = `housing-pdfs/${year}/${month}/${registrationNumber}_${uniquePrefix}_${sanitizedName}`;

  if (!isR2Configured()) {
    console.warn('⚠️ Cloudflare R2 is not fully configured in .env. Storing virtual key for testing:', key);
    return {
      success: true,
      key,
      fileName: originalFileName,
    };
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType || 'application/pdf',
    Metadata: {
      originalName: encodeURIComponent(originalFileName),
      registrationNumber: registrationNumber,
      uploadedAt: now.toISOString(),
    },
  });

  await s3Client.send(command);

  return {
    success: true,
    key,
    fileName: originalFileName,
    url: R2_PUBLIC_URL ? `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}` : undefined,
  };
}

/**
 * Generates a temporary Presigned PUT URL allowing the client browser to upload directly to Cloudflare R2
 */
export async function generatePresignedUploadUrl(
  originalFileName: string,
  mimeType: string,
  registrationNumber: string = 'unknown'
): Promise<{ uploadUrl: string; key: string; fileName: string }> {
  const sanitizedName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const uniquePrefix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const key = `housing-pdfs/${year}/${month}/${registrationNumber}_${uniquePrefix}_${sanitizedName}`;

  if (!isR2Configured()) {
    throw new Error('Cloudflare R2 is not configured. Please check environment variables in Vercel.');
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: mimeType || 'application/pdf',
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });

  return {
    uploadUrl,
    key,
    fileName: originalFileName,
  };
}

/**
 * Generates a temporary Presigned Download URL for viewing or downloading the PDF (valid for 15 minutes by default)
 */
export async function generatePresignedDownloadUrl(key: string, expiresInSeconds: number = 900): Promise<string> {
  if (!key) {
    throw new Error('Object key is required to generate download URL');
  }

  if (!isR2Configured()) {
    throw new Error('Cloudflare R2 is not configured. Please provide R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in .env');
  }

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: 'inline',
  });

  return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Deletes an object permanently from Cloudflare R2
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  if (!key) return false;

  if (!isR2Configured()) {
    console.warn(`[R2 Simulated Delete] Key: ${key}`);
    return true;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    await s3Client.send(command);
    console.log(`[R2 Delete Success] Deleted object: ${key}`);
    return true;
  } catch (error) {
    console.error(`[R2 Delete Error] Failed to delete ${key}:`, error);
    return false;
  }
}

/**
 * 24-Hour Lifecycle Engine:
 * Finds all requests with status = 'مكتمل' where completed_at is older than 24 hours
 * and file_deleted is false, then deletes the PDF from Cloudflare R2 and updates Supabase.
 */
export async function cleanupExpiredCompletedFiles(): Promise<{
  totalEligible: number;
  deletedCount: number;
  deletedIds: string[];
}> {
  try {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    console.log(`[R2 Cleanup Worker] Checking for completed files older than 24h (Cutoff: ${cutoffDate})...`);

    // Fetch eligible records from Supabase
    const { data: records, error } = await serverSupabase
      .from('housing_requests')
      .select('id, first_name, last_name, registration_number, pdf_file_path, completed_at, file_deleted')
      .eq('status', 'مكتمل')
      .eq('file_deleted', false)
      .not('completed_at', 'is', null)
      .lte('completed_at', cutoffDate);

    if (error) {
      console.error('[R2 Cleanup Worker] Database query error:', error);
      return { totalEligible: 0, deletedCount: 0, deletedIds: [] };
    }

    if (!records || records.length === 0) {
      console.log('[R2 Cleanup Worker] No expired completed files found.');
      return { totalEligible: 0, deletedCount: 0, deletedIds: [] };
    }

    console.log(`[R2 Cleanup Worker] Found ${records.length} records eligible for 24h deletion.`);

    const deletedIds: string[] = [];

    for (const record of records) {
      try {
        if (record.pdf_file_path) {
          await deleteFromR2(record.pdf_file_path);
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
          console.error(`[R2 Cleanup Worker] Failed to update DB status for record ${record.id}:`, updateError);
        } else {
          deletedIds.push(record.id);
          console.log(`[R2 Cleanup Worker] Successfully deleted PDF for student ${record.first_name} ${record.last_name} (${record.registration_number})`);
        }
      } catch (itemError) {
        console.error(`[R2 Cleanup Worker] Error processing record ${record.id}:`, itemError);
      }
    }

    return {
      totalEligible: records.length,
      deletedCount: deletedIds.length,
      deletedIds,
    };
  } catch (err) {
    console.error('[R2 Cleanup Worker] Critical error during cleanup execution:', err);
    return { totalEligible: 0, deletedCount: 0, deletedIds: [] };
  }
}
