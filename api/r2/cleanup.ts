import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cleanupExpiredCompletedFiles } from '../../server/r2Service.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await cleanupExpiredCompletedFiles();
    return res.status(200).json({
      success: true,
      message: `تم فحص الملفات المكتملة وحذف ${result.deletedCount} ملف بنجاح.`,
      ...result,
    });
  } catch (error: any) {
    console.error('Cleanup execution error:', error);
    return res.status(500).json({ error: error.message || 'Error during cleanup' });
  }
}
