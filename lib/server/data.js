import fs from 'fs';
import { DATA_FILE, DEFAULT_DATA } from './constants.js';

export function userCompletedLevel(username, victorEntry) {
  const normalized = String(victorEntry || '').trim();
  return normalized === username || normalized.startsWith(`${username} `);
}

export function normalizeRankedLevel(level) {
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

export function normalizeRankedLevels(ranked) {
  return (Array.isArray(ranked) ? ranked : []).map(normalizeRankedLevel);
}

export function readData() {
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

export function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function findRankedLevelByName(ranked, levelName) {
  const target = String(levelName || '').trim().toLowerCase();
  return ranked.find(level => level.name.trim().toLowerCase() === target) || null;
}

export function getRankedLevelIndex(ranked, level) {
  return ranked.findIndex(
    item => item.name.trim().toLowerCase() === level.name.trim().toLowerCase()
  );
}
