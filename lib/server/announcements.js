import crypto from 'crypto';

export function createAnnouncement(data, { title, content, author = 'System' }) {
  data.announcements = data.announcements || [];
  data.announcements.push({
    uid: `announcement-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    title,
    content,
    author,
    createdAt: Date.now()
  });
}

export function getNewlyPlacedLevels(oldRanked, newRanked) {
  const oldUids = new Set((oldRanked || []).map(level => level.uid));
  return (newRanked || []).filter(level => level.uid && !oldUids.has(level.uid));
}

export function announceLevelPlaced(data, ranked, level) {
  const position = ranked.findIndex(item => item.uid === level.uid) + 1;
  createAnnouncement(data, {
    title: 'NEW LEVEL HAS BEEN PLACED',
    content: `${position} ${level.name}\n${level.by || 'Unknown'}`
  });
}

export function announceTop1Beat(data, player, levelName, videoUrl) {
  createAnnouncement(data, {
    title: `${player} JUST BEAT ${levelName}`,
    content: videoUrl ? `Video: ${videoUrl}` : 'Video: —'
  });
}
