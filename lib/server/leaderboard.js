import { readData, userCompletedLevel } from './data.js';
import { readUsersStore } from './users.js';

function getPointsForRank(rank) {
  if (rank === 1) return 500;
  if (rank === 2) return 450;
  if (rank === 3) return 400;
  if (rank === 4) return 350;
  if (rank === 5) return 300;
  return 300 - (rank - 5) * 10;
}

export function getAcceptedCompletionsForPlayer(username, ranked, completions) {
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

export function getLeaderboardEntries() {
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
