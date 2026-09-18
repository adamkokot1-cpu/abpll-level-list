import fs from 'fs';
import crypto from 'crypto';
import {
  USERS_FILE,
  SESSION_DAYS,
  ADMIN_USERNAME,
  ADMIN_PASSWORD
} from './constants.js';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
  } catch {
    return false;
  }
}

export function readUsersStore() {
  if (!fs.existsSync(USERS_FILE)) {
    const store = { users: [], sessions: [], meta: {} };
    fs.writeFileSync(USERS_FILE, JSON.stringify(store, null, 2));
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      meta: parsed.meta && typeof parsed.meta === 'object' ? parsed.meta : {}
    };
  } catch {
    const store = { users: [], sessions: [], meta: {} };
    fs.writeFileSync(USERS_FILE, JSON.stringify(store, null, 2));
    return store;
  }
}

export function writeUsersStore(store) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(store, null, 2));
}

export function cleanExpiredSessions(store) {
  const now = Date.now();
  store.sessions = store.sessions.filter(session => session.expiresAt > now);
}

export function initUsersStore() {
  const store = readUsersStore();
  cleanExpiredSessions(store);

  if (!store.meta?.nonAdminAccountsCleared) {
    store.users = store.users.filter(user => user.isAdmin === true);
    store.sessions = [];
    store.meta = { ...(store.meta || {}), nonAdminAccountsCleared: true };
  }

  const adminExists = store.users.some(
    user => user.username.toLowerCase() === ADMIN_USERNAME.toLowerCase()
  );

  if (!adminExists) {
    store.users.push({
      id: 'user-admin',
      username: ADMIN_USERNAME,
      passwordHash: hashPassword(ADMIN_PASSWORD),
      isAdmin: true,
      createdAt: Date.now()
    });
  }

  writeUsersStore(store);
}

export function validateUsername(username) {
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return 'Username must be 3-20 characters (letters, numbers, underscore).';
  }
  return null;
}

export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  return null;
}

export function createSession(store, user) {
  const token = crypto.randomBytes(32).toString('hex');
  const session = {
    token,
    userId: user.id,
    username: user.username,
    isAdmin: user.isAdmin === true,
    expiresAt: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  };
  store.sessions.push(session);
  writeUsersStore(store);
  return session;
}

export function findSession(token) {
  if (!token) return null;
  const store = readUsersStore();
  cleanExpiredSessions(store);
  writeUsersStore(store);
  return store.sessions.find(session => session.token === token && session.expiresAt > Date.now()) || null;
}

export function removeSession(token) {
  const store = readUsersStore();
  store.sessions = store.sessions.filter(session => session.token !== token);
  writeUsersStore(store);
}

export function publicUser(user) {
  return {
    username: user.username,
    isAdmin: user.isAdmin === true
  };
}

initUsersStore();
