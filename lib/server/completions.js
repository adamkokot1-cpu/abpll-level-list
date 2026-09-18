import {
  findRankedLevelByName,
  userCompletedLevel
} from './data.js';

export function getPendingCompletions(data) {
  return (data.completions || []).filter(item => item.status === 'pending');
}

export function groupCompletionsByPlayer(completions) {
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

export function victorToUsername(victorEntry) {
  const normalized = String(victorEntry || '').trim();
  const match = normalized.match(/^(.+?)\s+\d+%$/);
  return match ? match[1] : normalized;
}

export function getAcceptedCompletionsForAdmin(data) {
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

export function removePlayerFromVictors(data, player, levelName) {
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

export function removeCompletionByUid(data, uid) {
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
