import { readData, writeData } from '@/lib/server/data.js';
import { requireAdmin, handleAuthError } from '@/lib/server/auth.js';
import { removeCompletionByUid } from '@/lib/server/completions.js';

export async function DELETE(request, { params }) {
  try {
    requireAdmin(request);
    const { uid } = await params;
    const data = readData();
    const removed = removeCompletionByUid(data, decodeURIComponent(uid));

    if (!removed) {
      return Response.json({ error: 'Completion not found.' }, { status: 404 });
    }

    writeData(data);
    return Response.json({ ok: true, player: removed.player, levelName: removed.levelName });
  } catch (error) {
    return handleAuthError(error);
  }
}
