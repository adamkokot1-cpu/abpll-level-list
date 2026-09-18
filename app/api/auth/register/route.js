export const runtime = 'nodejs';
import {
  readUsersStore,
  writeUsersStore,
  cleanExpiredSessions,
  validateUsername,
  validatePassword,
  hashPassword,
  createSession,
  publicUser
} from '@/lib/server/users.js';

export async function POST(request) {
  const body = await request.json();
  const username = String(body?.username || '').trim();
  const password = String(body?.password || '');

  const usernameError = validateUsername(username);
  if (usernameError) {
    return Response.json({ error: usernameError }, { status: 400 });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return Response.json({ error: passwordError }, { status: 400 });
  }

  const store = readUsersStore();
  cleanExpiredSessions(store);

  const taken = store.users.some(
    user => user.username.toLowerCase() === username.toLowerCase()
  );
  if (taken) {
    return Response.json({ error: 'Username is already taken.' }, { status: 409 });
  }

  const user = {
    id: 'user-' + Date.now(),
    username,
    passwordHash: hashPassword(password),
    isAdmin: false,
    createdAt: Date.now()
  };

  store.users.push(user);
  writeUsersStore(store);
  const session = createSession(store, user);

  return Response.json({
    token: session.token,
    user: publicUser(user)
  });
}

