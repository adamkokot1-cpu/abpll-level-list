 const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const SESSION_DAYS = 30;
const ADMIN_USERNAME = 'AdminABP11LL';
const ADMIN_PASSWORD = 'AdMIN1!';

const DEFAULT_DATA = {
  ranked: [
    {
      uid: 'level-1',
      name: 'ABPLL blade',
      levelId: '147308748',
      by: 'GDarisu',
      verifiedBy: 'GDarisu',
      video: 'https://medal.tv/games/geometry-dash/clips/nml9jbtYOXinjm4GN?invite=cr-MSw3emwsMjYyNjMxMjgy',
      image: '3D64D0A5-1DF1-4FE1-97E5-AAFB044407E5.png',
      victors: []
    },
    {
      uid: 'level-2',
      name: 'The falling ABPLL',
      levelId: '147314808',
      by: 'GDarisu',
      verifiedBy: 'GDarisu',
      video: 'https://medal.tv/games/geometry-dash/clips/nlWXDex0oIITAjFut?invite=cr-MSx1dXMsMjYyNjMxMjgy',
      image: 'E43200F8-846C-4B37-9EC6-DE35F4E5BDD3.png',
      victors: []
    },
    {
      uid: 'level-3',
      name: 'ABPLL aura',
      levelId: '147309593',
      by: 'GDarisu',
      verifiedBy: 'GDarisu',
      video: 'https://medal.tv/games/geometry-dash/clips/nlV8twNUQ_O8xaI0N?invite=cr-MSxidjEsMjYyNjMxMjgy',
      image: 'abpll-aura.png',
      victors: ['VegasZ 100%']
    },
    {
      uid: 'level-4',
      name: 'Decaying abpll',
      levelId: '147315867',
      by: 'GDarisu',
      verifiedBy: 'GDarisu',
      video: 'https://medal.tv/games/geometry-dash/clips/nlXaXOrCLNgHOMJ4X?invite=cr-MSxQSjEsMjYyNjMxMjgy',
      image: '5E9B0BB9-6325-469B-9B9D-8A627904FB93.png',
      victors: ['VegasZ 100%']
    }
  ],
  uploaded: [],
  completions: [],
  announcements: []
};

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return {
      ranked: normalizeRankedLevels(parsed.ranked || DEFAULT_DATA.ranked),
      uploaded: Array.isArray(parsed.uploaded) ? parsed.uploaded : [],
      completions: Array.isArray(parsed.completions) ? parsed.completions : [],
      announcements: Array.isArray(parsed.announcements) ? parsed.announcements : []
    };
  } catch {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
    return structuredClone(DEFAULT_DATA);
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
  } catch {
    return false;
  }
}

function readUsersStore() {
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

function writeUsersStore(store) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(store, null, 2));
}

function cleanExpiredSessions(store) {
  const now = Date.now();
  store.sessions = store.sessions.filter(session => session.expiresAt > now);
}

function initUsersStore() {
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

function getPointsForRank(rank) {
  if (rank === 1) return 500;
  if (rank === 2) return 450;
  if (rank === 3) return 400;
  if (rank === 4) return 350;
  if (rank === 5) return 300;
  return 300 - (rank - 5) * 10;
}

function userCompletedLevel(username, victorEntry) {
  const normalized = String(victorEntry || '').trim();
  return normalized === username || normalized.startsWith(`${username} `);
}

function normalizeRankedLevel(level) {
  const normalized = { ...level };
  if (!normalized.verifiedBy) normalized.verifiedBy = 'GDarisu';
  if (Array.isArray(normalized.victors)) {
    normalized.victors = normalized.victors.filter(
      victor => !userCompletedLevel(normalized.verifiedBy, victor)
    );
  } else {
    normalized.victors = [];
  }
  return normalized;
}

function normalizeRankedLevels(ranked) {
  return (Array.isArray(ranked) ? ranked : []).map(normalizeRankedLevel);
}

function getAcceptedCompletionsForPlayer(username, ranked, completions) {
  const stored = (completions || [])
    .filter(item => item.player === username && item.status === 'accepted')
    .map(item => ({
      levelName: item.levelName,
      completion: item.completion,
      rawFootage: item.rawFootage || '',
      opinion: item.opinion,
      acceptedAt: item.acceptedAt || item.createdAt
    }));

  const storedLevelNames = new Set(stored.map(item => item.levelName.toLowerCase()));

  ranked.forEach(level => {
    const verifiedBy = (level.verifiedBy || '').trim();
    if (verifiedBy && verifiedBy === username) return;

    const hasVictor = (level.victors || []).some(victor => userCompletedLevel(username, victor));
    if (hasVictor && !storedLevelNames.has(level.name.toLowerCase())) {
      stored.push({
        levelName: level.name,
        completion: '',
        rawFootage: '',
        opinion: '',
        acceptedAt: null
      });
    }
  });

  return stored.sort((a, b) => {
    const rankA = ranked.findIndex(level => level.name.toLowerCase() === a.levelName.toLowerCase());
    const rankB = ranked.findIndex(level => level.name.toLowerCase() === b.levelName.toLowerCase());
    if (rankA !== rankB) return rankA - rankB;
    return (b.acceptedAt || 0) - (a.acceptedAt || 0);
  });
}

function buildLeaderboardEntry(user, ranked, completions) {
  const username = user.username;
  let points = 0;
  let hardestCompletion = '-';
  let hardestCompletionRank = Infinity;
  let hardestVerification = '-';
  let hardestVerificationRank = Infinity;
  const levelsMade = [];

  ranked.forEach((level, index) => {
    const rank = index + 1;
    const levelPoints = getPointsForRank(rank);
    const verifiedBy = (level.verifiedBy || '').trim();

    if (level.by === username) {
      levelsMade.push(level.name);
      if (rank < hardestVerificationRank) {
        hardestVerificationRank = rank;
        hardestVerification = level.name;
      }
    }

    if (verifiedBy && verifiedBy === username) {
      points += levelPoints;
      if (rank < hardestCompletionRank) {
        hardestCompletionRank = rank;
        hardestCompletion = level.name;
      }
    }

    (level.victors || []).forEach(victor => {
      if (userCompletedLevel(username, victor)) {
        if (verifiedBy && username === verifiedBy) return;

        points += levelPoints;
        if (rank < hardestCompletionRank) {
          hardestCompletionRank = rank;
          hardestCompletion = level.name;
        }
      }
    });
  });

  return {
    username,
    points,
    hardestVerification: hardestVerificationRank !== Infinity ? hardestVerification : '-',
    hardestCompletion: hardestCompletionRank !== Infinity ? hardestCompletion : '-',
    levelsMade: levelsMade.length ? levelsMade.join(', ') : '-',
    acceptedCompletions: getAcceptedCompletionsForPlayer(username, ranked, completions)
  };
}

function getLeaderboardEntries() {
  const store = readUsersStore();
  const data = readData();

  return store.users
    .filter(user => !user.isAdmin)
    .map(user => buildLeaderboardEntry(user, data.ranked, data.completions))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.username.localeCompare(b.username);
    });
}

function validateUsername(username) {
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return 'Username must be 3-20 characters (letters, numbers, underscore).';
  }
  return null;
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  return null;
}

function createSession(store, user) {
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

function findSession(token) {
  if (!token) return null;
  const store = readUsersStore();
  cleanExpiredSessions(store);
  writeUsersStore(store);
  return store.sessions.find(session => session.token === token && session.expiresAt > Date.now()) || null;
}

function removeSession(token) {
  const store = readUsersStore();
  store.sessions = store.sessions.filter(session => session.token !== token);
  writeUsersStore(store);
}

function publicUser(user) {
  return {
    username: user.username,
    isAdmin: user.isAdmin === true
  };
}

function getTokenFromRequest(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return null;
}

function requireAuth(req, res, next) {
  const token = getTokenFromRequest(req);
  const session = findSession(token);
  if (!session) {
    return res.status(401).json({ error: 'You must be logged in.' });
  }
  req.auth = session;
  next();
}

function requireAdmin(req, res, next) {
  const token = getTokenFromRequest(req);
  const session = findSession(token);
  if (!session) {
    return res.status(401).json({ error: 'You must be logged in.' });
  }
  if (!session.isAdmin) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  req.auth = session;
  next();
}

function findRankedLevelByName(ranked, levelName) {
  const target = String(levelName || '').trim().toLowerCase();
  return ranked.find(level => level.name.trim().toLowerCase() === target) || null;
}

function getPendingCompletions(data) {
  return (data.completions || []).filter(item => item.status === 'pending');
}

function groupCompletionsByPlayer(completions) {
  const groups = new Map();

  completions.forEach(item => {
    if (!groups.has(item.player)) {
      groups.set(item.player, []);
    }
    groups.get(item.player).push(item);
  });

  return Array.from(groups.entries())
    .map(([player, items]) => ({
      player,
      count: items.length,
      completions: items.sort((a, b) => (b.acceptedAt || b.createdAt) - (a.acceptedAt || a.createdAt))
    }))
    .sort((a, b) => a.player.localeCompare(b.player));
}

function victorToUsername(victorEntry) {
  const normalized = String(victorEntry || '').trim();
  const match = normalized.match(/^(.+?)\s+\d+%$/);
  return match ? match[1] : normalized;
}

function getAcceptedCompletionsForAdmin(data) {
  const stored = (data.completions || []).filter(item => item.status === 'accepted');
  const keys = new Set(
    stored.map(item => `${item.player.toLowerCase()}|${item.levelName.trim().toLowerCase()}`)
  );
  const legacy = [];

  data.ranked.forEach(level => {
    const verifiedBy = (level.verifiedBy || '').trim();

    (level.victors || []).forEach(victor => {
      const player = victorToUsername(victor);
      if (verifiedBy && player === verifiedBy) return;

      const key = `${player.toLowerCase()}|${level.name.trim().toLowerCase()}`;
      if (!keys.has(key)) {
        legacy.push({
          uid: `legacy|${level.uid}|${player}`,
          player,
          levelName: level.name,
          completion: '',
          rawFootage: '',
          opinion: '',
          status: 'accepted',
          victorOnly: true,
          createdAt: 0,
          acceptedAt: null
        });
        keys.add(key);
      }
    });
  });

  return [...stored, ...legacy];
}

function removePlayerFromVictors(data, player, levelName) {
  const level = findRankedLevelByName(data.ranked, levelName);
  if (!level || !Array.isArray(level.victors)) return false;

  const before = level.victors.length;
  level.victors = level.victors.filter(victor => !userCompletedLevel(player, victor));
  return level.victors.length !== before;
}

function removeLegacyVictorCompletion(data, uid) {
  if (!String(uid).startsWith('legacy|')) return null;

  const parts = String(uid).split('|');
  if (parts.length < 3) return null;

  const levelUid = parts[1];
  const player = parts.slice(2).join('|');
  const level = data.ranked.find(item => item.uid === levelUid);
  if (!level) return null;

  const removedFromVictors = removePlayerFromVictors(data, player, level.name);
  const completionIndex = (data.completions || []).findIndex(
    item =>
      item.player === player &&
      item.levelName.trim().toLowerCase() === level.name.trim().toLowerCase()
  );

  if (completionIndex !== -1) {
    const completion = data.completions[completionIndex];
    removePlayerFromVictors(data, completion.player, completion.levelName);
    data.completions.splice(completionIndex, 1);
    return completion;
  }

  if (removedFromVictors) {
    return { player, levelName: level.name, status: 'accepted' };
  }

  return null;
}

function removeCompletionByUid(data, uid) {
  if (String(uid).startsWith('legacy|')) {
    return removeLegacyVictorCompletion(data, uid);
  }

  const index = (data.completions || []).findIndex(item => item.uid === uid);
  if (index === -1) return null;

  const completion = data.completions[index];

  if (completion.status === 'accepted') {
    removePlayerFromVictors(data, completion.player, completion.levelName);
  }

  data.completions.splice(index, 1);
  return completion;
}

function createAnnouncement(data, { title, content, author = 'System' }) {
  data.announcements = data.announcements || [];
  data.announcements.push({
    uid: `announcement-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    title,
    content,
    author,
    createdAt: Date.now()
  });
}

function getNewlyPlacedLevels(oldRanked, newRanked) {
  const oldUids = new Set((oldRanked || []).map(level => level.uid));
  return (newRanked || []).filter(level => level.uid && !oldUids.has(level.uid));
}

function announceLevelPlaced(data, ranked, level) {
  const position = ranked.findIndex(item => item.uid === level.uid) + 1;
  createAnnouncement(data, {
    title: 'NEW LEVEL HAS BEEN PLACED',
    content: `${position} ${level.name}\n${level.by || 'Unknown'}`
  });
}

function announceTop1Beat(data, player, levelName, videoUrl) {
  createAnnouncement(data, {
    title: `${player} JUST BEAT ${levelName}`,
    content: videoUrl ? `Video: ${videoUrl}` : 'Video: —'
  });
}

function getRankedLevelIndex(ranked, level) {
  return ranked.findIndex(
    item => item.name.trim().toLowerCase() === level.name.trim().toLowerCase()
  );
}

initUsersStore();

app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

app.get('/api/data', (_req, res) => {
  res.json(readData());
});

app.get('/api/leaderboard', (_req, res) => {
  res.json(getLeaderboardEntries());
});

app.put('/api/data', requireAuth, (req, res) => {
  const current = readData();
  const { ranked, uploaded } = req.body || {};

  if (!Array.isArray(ranked) || !Array.isArray(uploaded)) {
    return res.status(400).json({ error: 'Expected ranked and uploaded arrays.' });
  }

  const nextData = {
    ranked: normalizeRankedLevels(ranked),
    uploaded,
    completions: current.completions || [],
    announcements: current.announcements || []
  };

  getNewlyPlacedLevels(current.ranked, nextData.ranked).forEach(level => {
    announceLevelPlaced(nextData, nextData.ranked, level);
  });

  writeData(nextData);
  res.json({ ok: true });
});

app.post('/api/completions', requireAuth, (req, res) => {
  const levelName = String(req.body?.levelName || '').trim();
  const completion = String(req.body?.completion || '').trim();
  const rawFootage = String(req.body?.rawFootage || '').trim();
  const opinion = String(req.body?.opinion || '').trim();

  if (!levelName || !completion || !opinion) {
    return res.status(400).json({ error: 'Level name, completion, and opinion are required.' });
  }

  const data = readData();
  if (!findRankedLevelByName(data.ranked, levelName)) {
    return res.status(400).json({ error: 'Level not found on Main List.' });
  }

  const entry = {
    uid: 'completion-' + Date.now(),
    player: req.auth.username,
    levelName,
    completion,
    rawFootage,
    opinion,
    status: 'pending',
    createdAt: Date.now()
  };

  data.completions = data.completions || [];
  data.completions.push(entry);
  writeData(data);
  res.json({ ok: true, completion: entry });
});

app.get('/api/completions/pending', requireAdmin, (_req, res) => {
  const data = readData();
  res.json({ groups: groupCompletionsByPlayer(getPendingCompletions(data)) });
});

app.get('/api/completions/admin', requireAdmin, (_req, res) => {
  const data = readData();
  const completions = data.completions || [];

  res.json({
    pendingGroups: groupCompletionsByPlayer(getPendingCompletions(data)),
    acceptedGroups: groupCompletionsByPlayer(getAcceptedCompletionsForAdmin(data))
  });
});

app.delete('/api/completions/:uid', requireAdmin, (req, res) => {
  const data = readData();
  const removed = removeCompletionByUid(data, decodeURIComponent(req.params.uid));

  if (!removed) {
    return res.status(404).json({ error: 'Completion not found.' });
  }

  writeData(data);
  res.json({ ok: true, player: removed.player, levelName: removed.levelName });
});

app.get('/api/announcements', (_req, res) => {
  const data = readData();
  const announcements = (data.announcements || [])
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);

  res.json({ announcements });
});

app.post('/api/announcements', requireAdmin, (req, res) => {
  const title = String(req.body?.title || '').trim();
  const content = String(req.body?.content || '').trim();

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }

  const data = readData();
  const announcement = {
    uid: 'announcement-' + Date.now(),
    title,
    content,
    author: req.auth.username,
    createdAt: Date.now()
  };

  data.announcements = data.announcements || [];
  data.announcements.push(announcement);
  writeData(data);
  res.json({ ok: true, announcement });
});

app.delete('/api/announcements/:uid', requireAdmin, (req, res) => {
  const data = readData();
  const before = (data.announcements || []).length;
  data.announcements = (data.announcements || []).filter(item => item.uid !== req.params.uid);

  if (data.announcements.length === before) {
    return res.status(404).json({ error: 'Announcement not found.' });
  }

  writeData(data);
  res.json({ ok: true });
});

app.get('/api/completions/mine', requireAuth, (req, res) => {
  const data = readData();
  const pending = (data.completions || [])
    .filter(item => item.player === req.auth.username && item.status === 'pending')
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(item => ({
      uid: item.uid,
      levelName: item.levelName,
      completion: item.completion,
      rawFootage: item.rawFootage || '',
      opinion: item.opinion,
      createdAt: item.createdAt
    }));

  res.json({ completions: pending });
});

app.post('/api/completions/:uid/accept', requireAdmin, (req, res) => {
  const data = readData();
  const index = (data.completions || []).findIndex(
    item => item.uid === req.params.uid && item.status === 'pending'
  );

  if (index === -1) {
    return res.status(404).json({ error: 'Completion not found.' });
  }

  const completion = data.completions[index];
  const level = findRankedLevelByName(data.ranked, completion.levelName);

  if (!level) {
    return res.status(400).json({ error: 'Level not found on Main List.' });
  }

  if (!Array.isArray(level.victors)) level.victors = [];
  const victorEntry = `${completion.player} 100%`;
  const alreadyListed = level.victors.some(victor => userCompletedLevel(completion.player, victor));

  const verifiedBy = (level.verifiedBy || '').trim();
  const isVerifier = verifiedBy && completion.player === verifiedBy;

  if (!alreadyListed && !isVerifier) {
    level.victors.push(victorEntry);

    if (getRankedLevelIndex(data.ranked, level) === 0) {
      announceTop1Beat(data, completion.player, level.name, completion.completion);
    }
  }

  completion.status = 'accepted';
  completion.acceptedAt = Date.now();
  writeData(data);

  res.json({
    ok: true,
    player: completion.player,
    levelName: level.name
  });
});

app.post('/api/completions/:uid/deny', requireAdmin, (req, res) => {
  const data = readData();
  const index = (data.completions || []).findIndex(
    item => item.uid === req.params.uid && item.status === 'pending'
  );

  if (index === -1) {
    return res.status(404).json({ error: 'Completion not found.' });
  }

  data.completions.splice(index, 1);
  writeData(data);
  res.json({ ok: true });
});

app.post('/api/auth/register', (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');

  const usernameError = validateUsername(username);
  if (usernameError) {
    return res.status(400).json({ error: usernameError });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  const store = readUsersStore();
  cleanExpiredSessions(store);

  const taken = store.users.some(
    user => user.username.toLowerCase() === username.toLowerCase()
  );
  if (taken) {
    return res.status(409).json({ error: 'Username is already taken.' });
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

  res.json({
    token: session.token,
    user: publicUser(user)
  });
});

app.post('/api/auth/login', (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const store = readUsersStore();
  cleanExpiredSessions(store);
  writeUsersStore(store);

  const user = store.users.find(
    item => item.username.toLowerCase() === username.toLowerCase()
  );

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const session = createSession(store, user);

  res.json({
    token: session.token,
    user: publicUser(user)
  });
});

app.post('/api/auth/logout', (req, res) => {
  const token = getTokenFromRequest(req);
  if (token) {
    removeSession(token);
  }
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const token = getTokenFromRequest(req);
  const session = findSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Not logged in.' });
  }

  res.json({
    username: session.username,
    isAdmin: session.isAdmin === true
  });
});

app.listen(PORT, () => {
  console.log(`ABPLL Level List running at http://localhost:${PORT}`);
});
