import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generatePresignedDownloadUrl, isR2Configured } from '../../server/r2Service.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const key = req.query.key as string;
    if (!key) {
      return res.status(400).json({ error: 'Missing key parameter' });
    }

    if (!isR2Configured()) {
      return res.status(400).json({
        error: 'Cloudflare R2 is not configured in Vercel environment variables.',
        unconfigured: true,
      });
    }

    const downloadUrl = await generatePresignedDownloadUrl(key, 900);
    return res.status(200).json({ downloadUrl });
  } catch (error: any) {
    console.error('Download URL generation error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate download URL' });
  }
}
