import type { VercelRequest, VercelResponse } from '@vercel/node';
import { uploadToSupabaseStorage, isSupabaseConfigured } from '../../server/supabaseStorageService.ts';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    if (!isSupabaseConfigured()) {
      return res.status(400).json({
        error: 'Supabase is not configured in Vercel environment variables.',
        unconfigured: true,
      });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const buffer = Buffer.concat(chunks);

    const registrationNumber = (req.headers['x-registration-number'] as string) || 'unknown';
    const originalName = (req.headers['x-file-name'] as string) ? decodeURIComponent(req.headers['x-file-name'] as string) : 'document.pdf';
    const mimeType = (req.headers['content-type'] as string) || 'application/pdf';

    const result = await uploadToSupabaseStorage(buffer, originalName, mimeType, registrationNumber);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Supabase Storage Direct Upload Error:', error);
    return res.status(500).json({ error: error.message || 'Upload failed' });
  }
}
