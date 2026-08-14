import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { s3Client, isR2Configured } from '../../server/r2Service.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucketName = process.env.R2_BUCKET_NAME || 'dou';
  const hasAccessKey = Boolean(process.env.R2_ACCESS_KEY_ID);
  const hasSecretKey = Boolean(process.env.R2_SECRET_ACCESS_KEY);

  const envCheck = {
    R2_ACCOUNT_ID: accountId ? `✅ Present (${accountId.substring(0, 6)}...)` : '❌ Missing in Vercel',
    R2_BUCKET_NAME: bucketName ? `✅ Present (${bucketName})` : '❌ Missing in Vercel',
    R2_ACCESS_KEY_ID: hasAccessKey ? '✅ Present' : '❌ Missing in Vercel',
    R2_SECRET_ACCESS_KEY: hasSecretKey ? '✅ Present' : '❌ Missing in Vercel',
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? '✅ Present' : '❌ Missing in Vercel',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? '✅ Present' : '❌ Missing in Vercel',
  };

  if (!isR2Configured()) {
    return res.status(500).json({
      status: 'error',
      message: 'Cloudflare R2 environment variables are incomplete in Vercel Settings -> Environment Variables.',
      envCheck,
    });
  }

  try {
    const listRes = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        MaxKeys: 10,
      })
    );

    return res.status(200).json({
      status: 'success',
      message: '🎉 Cloudflare R2 is 100% CONNECTED and WORKING on Vercel!',
      bucket: bucketName,
      totalObjectsFound: listRes.KeyCount || 0,
      sampleObjects: (listRes.Contents || []).map((o) => ({
        key: o.Key,
        sizeBytes: o.Size,
        lastModified: o.LastModified,
      })),
      envCheck,
    });
  } catch (error: any) {
    console.error('R2 Healthcheck Error:', error);
    return res.status(500).json({
      status: 'error',
      message: `Failed to connect to Cloudflare R2: ${error.message}`,
      errorDetails: error.name || error.code,
      envCheck,
      troubleshooting: [
        '1. Ensure R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY have Admin Read & Write permissions on bucket ' + bucketName,
        '2. Verify that bucket name matches exactly (e.g. dou)',
        '3. Make sure to Redeploy on Vercel after updating Environment Variables',
      ],
    });
  }
}
