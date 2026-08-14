import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generatePresignedUploadUrl, isR2Configured } from '../../server/r2Service.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const fileName = (req.query.fileName as string) || req.body?.fileName || 'document.pdf';
    const mimeType = (req.query.mimeType as string) || req.body?.mimeType || 'application/pdf';
    const registrationNumber = (req.query.registrationNumber as string) || req.body?.registrationNumber || 'unknown';

    if (!isR2Configured()) {
      return res.status(400).json({
        error: 'Cloudflare R2 is not configured in Vercel environment variables.',
        unconfigured: true,
      });
    }

    const result = await generatePresignedUploadUrl(fileName, mimeType, registrationNumber);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Presigned upload URL generation error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate upload URL' });
  }
}
