// Compatibility bridge from previous R2 service to Supabase Storage Service
import {
  isSupabaseConfigured,
  uploadToSupabaseStorage,
  generateSignedDownloadUrl,
  deleteFromSupabaseStorage,
  cleanupExpiredCompletedFiles,
  serverSupabase,
  BUCKET_NAME,
} from './supabaseStorageService.ts';

export {
  isSupabaseConfigured,
  uploadToSupabaseStorage,
  generateSignedDownloadUrl,
  deleteFromSupabaseStorage,
  cleanupExpiredCompletedFiles,
  serverSupabase,
  BUCKET_NAME,
};

// Aliases for backward compatibility
export const isR2Configured = isSupabaseConfigured;
export const uploadToR2 = uploadToSupabaseStorage;
export const generatePresignedDownloadUrl = generateSignedDownloadUrl;
export const deleteFromR2 = deleteFromSupabaseStorage;

export async function generatePresignedUploadUrl(
  originalFileName: string,
  mimeType: string = 'application/pdf',
  registrationNumber: string = 'unknown'
) {
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
