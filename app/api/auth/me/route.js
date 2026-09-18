import { getTokenFromRequest } from '@/lib/server/auth.js';
import { findSession } from '@/lib/server/users.js';

export async function GET(request) {
  const token = getTokenFromRequest(request);
  const session = findSession(token);
  if (!session) {
    return Response.json({ error: 'Not logged in.' }, { status: 401 });
  }

  return Response.json({
    username: session.username,
    isAdmin: session.isAdmin === true
  });
}
