export const runtime = 'nodejs';

import { readData, writeData } from '@/lib/server/data.js';
import { requireAdmin, handleAuthError } from '@/lib/server/auth.js';

export async function DELETE(request, { params }) {
  try {
    requireAdmin(request);
    const { uid } = await params;
    const data = readData();
    const before = (data.announcements || []).length;
    data.announcements = (data.announcements || []).filter(item => item.uid !== uid);

    if (data.announcements.length === before) {
      return Response.json({ error: 'Announcement not found.' }, { status: 404 });
    }

    writeData(data);
    return Response.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
