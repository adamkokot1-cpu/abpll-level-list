import { findSession } from './users.js';

export class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.status = status;
  }
}

export function getTokenFromRequest(request) {
  const header = request.headers.get('authorization') || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return null;
}

export function requireAuth(request) {
  const token = getTokenFromRequest(request);
  const session = findSession(token);
  if (!session) {
    throw new AuthError('You must be logged in.', 401);
  }
  return session;
}

export function requireAdmin(request) {
  const session = requireAuth(request);
  if (!session.isAdmin) {
    throw new AuthError('Admin access required.', 403);
  }
  return session;
}

export function handleAuthError(error) {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  throw error;
}
