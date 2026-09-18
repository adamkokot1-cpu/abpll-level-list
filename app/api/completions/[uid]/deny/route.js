import { readData, writeData } from '@/lib/server/data.js';
import { requireAdmin, handleAuthError } from '@/lib/server/auth.js';

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

    data.completions.splice(index, 1);
    writeData(data);
    return Response.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
