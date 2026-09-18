import fs from 'fs';
import { DEFAULT_DATA } from './constants.js';
import { getDataFilePath, readBundledJson, safeWriteJson } from './storage.js';

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

function parseDataStore(parsed) {
  return {
    ranked: normalizeRankedLevels(parsed.ranked || DEFAULT_DATA.ranked),
    uploaded: Array.isArray(parsed.uploaded) ? parsed.uploaded : [],
    completions: Array.isArray(parsed.completions) ? parsed.completions : [],
    announcements: Array.isArray(parsed.announcements) ? parsed.announcements : []
  };
}

export function readData() {
  const dataFile = getDataFilePath();

  if (!fs.existsSync(dataFile)) {
    const bundled = readBundledJson('data.json');
    const initial = bundled || structuredClone(DEFAULT_DATA);
    safeWriteJson(dataFile, initial);
    return parseDataStore(initial);
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    return parseDataStore(parsed);
  } catch {
    const bundled = readBundledJson('data.json');
    const fallback = bundled || structuredClone(DEFAULT_DATA);
    safeWriteJson(dataFile, fallback);
    return parseDataStore(fallback);
  }
}

export function writeData(data) {
  safeWriteJson(getDataFilePath(), data);
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
