import {
  readUsersStore,
  writeUsersStore,
  cleanExpiredSessions,
  verifyPassword,
  createSession,
  publicUser
} from '@/lib/server/users.js';

export async function POST(request) {
  const body = await request.json();
  const username = String(body?.username || '').trim();
  const password = String(body?.password || '');

  if (!username || !password) {
    return Response.json({ error: 'Username and password are required.' }, { status: 400 });
  }

  const store = readUsersStore();
  cleanExpiredSessions(store);
  writeUsersStore(store);

  const user = store.users.find(
    item => item.username.toLowerCase() === username.toLowerCase()
  );

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return Response.json({ error: 'Invalid username or password.' }, { status: 401 });
  }

  const session = createSession(store, user);

  return Response.json({
    token: session.token,
    user: publicUser(user)
  });
}
