export const runtime = 'nodejs';
import { readData, writeData } from '@/lib/server/data.js';
import { requireAdmin, handleAuthError } from '@/lib/server/auth.js';

export async function GET() {
  const data = readData();
  const announcements = (data.announcements || [])
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);

  return Response.json({ announcements });
}

export async function POST(request) {
  try {
    const session = requireAdmin(request);
    const body = await request.json();
    const title = String(body?.title || '').trim();
    const content = String(body?.content || '').trim();

    if (!title || !content) {
      return Response.json({ error: 'Title and content are required.' }, { status: 400 });
    }

    const data = readData();
    const announcement = {
      uid: 'announcement-' + Date.now(),
      title,
      content,
      author: session.username,
      createdAt: Date.now()
    };

    data.announcements = data.announcements || [];
    data.announcements.push(announcement);
    writeData(data);
    return Response.json({ ok: true, announcement });
  } catch (error) {
    return handleAuthError(error);
  }
}

