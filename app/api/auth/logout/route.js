export const runtime = 'nodejs';
import { getTokenFromRequest } from '@/lib/server/auth.js';
import { removeSession } from '@/lib/server/users.js';

export async function POST(request) {
  const token = getTokenFromRequest(request);
  if (token) {
    removeSession(token);
  }
  return Response.json({ ok: true });
}

