import fs from 'fs';
import os from 'os';
import path from 'path';

const ROOT = process.cwd();
const USE_TMP = Boolean(process.env.VERCEL);

function ensureTmpDir() {
  const tmpDir = path.join(os.tmpdir(), 'abpll');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  return tmpDir;
}

export function getDataFilePath() {
  if (!USE_TMP) {
    return path.join(ROOT, 'data.json');
  }

  const tmpPath = path.join(ensureTmpDir(), 'data.json');
  const rootPath = path.join(ROOT, 'data.json');

  if (!fs.existsSync(tmpPath) && fs.existsSync(rootPath)) {
    try {
      fs.copyFileSync(rootPath, tmpPath);
    } catch (error) {
      console.error('Failed to seed data.json on Vercel:', error);
    }
  }

  return tmpPath;
}

export function getUsersFilePath() {
  if (!USE_TMP) {
    return path.join(ROOT, 'users.json');
  }

  const tmpPath = path.join(ensureTmpDir(), 'users.json');
  const rootPath = path.join(ROOT, 'users.json');

  if (!fs.existsSync(tmpPath) && fs.existsSync(rootPath)) {
    try {
      fs.copyFileSync(rootPath, tmpPath);
    } catch (error) {
      console.error('Failed to seed users.json on Vercel:', error);
    }
  }

  return tmpPath;
}

export function readBundledJson(filename) {
  const rootPath = path.join(ROOT, filename);
  if (!fs.existsSync(rootPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(rootPath, 'utf8'));
  } catch {
    return null;
  }
}

export function safeWriteJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to write storage file:', filePath, error);
    return false;
  }
}
