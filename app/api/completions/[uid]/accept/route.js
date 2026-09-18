import {
  readData,
  writeData,
  findRankedLevelByName,
  getRankedLevelIndex,
  userCompletedLevel
} from '@/lib/server/data.js';
import { requireAdmin, handleAuthError } from '@/lib/server/auth.js';
import { announceTop1Beat } from '@/lib/server/announcements.js';

export async function POST(request, { params }) {
  try {
    requireAdmin(request);
    const { uid } = await params;
    const data = readData();
    const index = (data.completions || []).findIndex(
      item => item.uid === uid && item.status === 'pending'
    );

    if (index === -1) {
      return Response.json({ error: 'Completion not found.' }, { status: 404 });
    }

    const completion = data.completions[index];
    const level = findRankedLevelByName(data.ranked, completion.levelName);

    if (!level) {
      return Response.json({ error: 'Level not found on Main List.' }, { status: 400 });
    }

    if (!Array.isArray(level.victors)) level.victors = [];
    const victorEntry = `${completion.player} 100%`;
    const alreadyListed = level.victors.some(victor => userCompletedLevel(completion.player, victor));

    const verifiedBy = (level.verifiedBy || '').trim();
    const isVerifier = verifiedBy && completion.player === verifiedBy;

    if (!alreadyListed && !isVerifier) {
      level.victors.push(victorEntry);

      if (getRankedLevelIndex(data.ranked, level) === 0) {
        announceTop1Beat(data, completion.player, level.name, completion.completion);
      }
    }

    completion.status = 'accepted';
    completion.acceptedAt = Date.now();
    writeData(data);

    return Response.json({
      ok: true,
      player: completion.player,
      levelName: level.name
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
