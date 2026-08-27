import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isSupabaseConfigured, serverSupabase, BUCKET_NAME } from '../../server/supabaseStorageService.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const hasAnonKey = Boolean(process.env.VITE_SUPABASE_ANON_KEY);
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const envCheck = {
    VITE_SUPABASE_URL: supabaseUrl ? `✅ Present (${supabaseUrl.substring(0, 15)}...)` : '❌ Missing in Vercel',
    VITE_SUPABASE_ANON_KEY: hasAnonKey ? '✅ Present' : '❌ Missing in Vercel',
    SUPABASE_SERVICE_ROLE_KEY: hasServiceKey ? '✅ Present' : '⚠️ Optional',
    BUCKET_NAME: `✅ ${BUCKET_NAME}`,
  };

  if (!isSupabaseConfigured()) {
    return res.status(500).json({
      status: 'error',
      message: 'Supabase environment variables are incomplete in Vercel Settings -> Environment Variables.',
      envCheck,
    });
  }

  try {
    const { data: bucketList, error } = await serverSupabase.storage.listBuckets();

    if (error) {
      throw error;
    }

    return res.status(200).json({
      status: 'success',
      message: '🎉 Supabase Storage is 100% CONNECTED and WORKING on Vercel!',
      bucket: BUCKET_NAME,
      buckets: (bucketList || []).map((b) => b.name),
      envCheck,
    });
  } catch (error: any) {
    console.error('Supabase Healthcheck Error:', error);
    return res.status(500).json({
      status: 'error',
      message: `Failed to connect to Supabase Storage: ${error.message}`,
      errorDetails: error.name || error.code,
      envCheck,
      troubleshooting: [
        '1. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY are set correctly.',
        '2. Verify that bucket "housing_pdfs" is created in Supabase Dashboard -> Storage.',
        '3. Run the SQL in supabase_schema.sql in Supabase SQL Editor.',
      ],
    });
  }
}
