export const runtime = 'nodejs';
import { readData, writeData, findRankedLevelByName } from '@/lib/server/data.js';
import { requireAuth, handleAuthError } from '@/lib/server/auth.js';

export async function POST(request) {
  try {
    const session = requireAuth(request);
    const body = await request.json();
    const levelName = String(body?.levelName || '').trim();
    const completion = String(body?.completion || '').trim();
    const rawFootage = String(body?.rawFootage || '').trim();
    const opinion = String(body?.opinion || '').trim();

    if (!levelName || !completion || !opinion) {
      return Response.json(
        { error: 'Level name, completion, and opinion are required.' },
        { status: 400 }
      );
    }

    const data = readData();
    if (!findRankedLevelByName(data.ranked, levelName)) {
      return Response.json({ error: 'Level not found on Main List.' }, { status: 400 });
    }

    const entry = {
      uid: 'completion-' + Date.now(),
      player: session.username,
      levelName,
      completion,
      rawFootage,
      opinion,
      status: 'pending',
      createdAt: Date.now()
    };

    data.completions = data.completions || [];
    data.completions.push(entry);
    writeData(data);
    return Response.json({ ok: true, completion: entry });
  } catch (error) {
    return handleAuthError(error);
  }
}

