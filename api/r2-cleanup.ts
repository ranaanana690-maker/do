import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cleanupExpiredCompletedFiles } from '../server/r2Service.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await cleanupExpiredCompletedFiles();
    return res.status(200).json({
      success: true,
      message: `Completed check. Deleted ${result.deletedCount} files.`,
      ...result,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error during cleanup' });
  }
}
