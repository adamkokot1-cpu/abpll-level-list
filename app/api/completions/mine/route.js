export const runtime = 'nodejs';
import { readData } from '@/lib/server/data.js';
import { requireAuth, handleAuthError } from '@/lib/server/auth.js';

export async function GET(request) {
  try {
    const session = requireAuth(request);
    const data = readData();
    const pending = (data.completions || [])
      .filter(item => item.player === session.username && item.status === 'pending')
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(item => ({
        uid: item.uid,
        levelName: item.levelName,
        completion: item.completion,
        rawFootage: item.rawFootage || '',
        opinion: item.opinion,
        createdAt: item.createdAt
      }));

    return Response.json({ completions: pending });
  } catch (error) {
    return handleAuthError(error);
  }
}

