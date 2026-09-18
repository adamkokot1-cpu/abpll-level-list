import { readData, writeData, normalizeRankedLevels } from '@/lib/server/data.js';
import { requireAuth, handleAuthError } from '@/lib/server/auth.js';
import {
  getNewlyPlacedLevels,
  announceLevelPlaced
} from '@/lib/server/announcements.js';

export async function GET() {
  return Response.json(readData());
}

export async function PUT(request) {
  try {
    requireAuth(request);

    const current = readData();
    const body = await request.json();
    const { ranked, uploaded } = body || {};

    if (!Array.isArray(ranked) || !Array.isArray(uploaded)) {
      return Response.json({ error: 'Expected ranked and uploaded arrays.' }, { status: 400 });
    }

    const nextData = {
      ranked: normalizeRankedLevels(ranked),
      uploaded,
      completions: current.completions || [],
      announcements: current.announcements || []
    };

    getNewlyPlacedLevels(current.ranked, nextData.ranked).forEach(level => {
      announceLevelPlaced(nextData, nextData.ranked, level);
    });

    writeData(nextData);
    return Response.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
