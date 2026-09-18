export interface RankedLevel {
  uid: string;
  name: string;
  levelId: string;
  by: string;
  verifiedBy?: string;
  video: string;
  image: string;
  victors: string[];
}

export interface UploadComment {
  id: string;
  author: string;
  text: string;
  createdAt: number;
}

export interface UploadedLevel {
  uid: string;
  name: string;
  levelId: string;
  by: string;
  verifiedBy?: string;
  video: string;
  image: string;
  likes: string[];
  comments: UploadComment[];
}

export interface Announcement {
  uid: string;
  title: string;
  author: string;
  content: string;
  createdAt: number;
}

export interface CompletionItem {
  uid: string;
  levelName: string;
  completion: string;
  rawFootage?: string;
  opinion: string;
}

export interface CompletionGroup {
  player: string;
  count: number;
  completions: CompletionItem[];
}

export interface LeaderboardEntry {
  username: string;
  points: number;
  hardestVerification: string;
  hardestCompletion: string;
  levelsMade: string;
  acceptedCompletions?: CompletionItem[];
}

export interface AuthUser {
  username: string;
  isAdmin?: boolean;
}

export interface RouletteLevelDisplay {
  id: string;
  name: string;
  image: string;
  imageAlt: string;
  by: string;
  levelId: string;
  points: number;
}

export const DEFAULT_RANKED_LEVELS: RankedLevel[] = [
  {
    uid: 'level-1',
    name: 'ABPLL blade',
    levelId: '147308748',
    by: 'GDarisu',
    verifiedBy: 'GDarisu',
    video: 'https://medal.tv/games/geometry-dash/clips/nml9jbtYOXinjm4GN?invite=cr-MSw3emwsMjYyNjMxMjgy',
    image: '3D64D0A5-1DF1-4FE1-97E5-AAFB044407E5.png',
    victors: [],
  },
  {
    uid: 'level-2',
    name: 'The falling ABPLL',
    levelId: '147314808',
    by: 'GDarisu',
    verifiedBy: 'GDarisu',
    video: 'https://medal.tv/games/geometry-dash/clips/nlWXDex0oIITAjFut?invite=cr-MSx1dXMsMjYyNjMxMjgy',
    image: 'E43200F8-846C-4B37-9EC6-DE35F4E5BDD3.png',
    victors: [],
  },
  {
    uid: 'level-3',
    name: 'ABPLL aura',
    levelId: '147309593',
    by: 'GDarisu',
    verifiedBy: 'GDarisu',
    video: 'https://medal.tv/games/geometry-dash/clips/nlV8twNUQ_O8xaI0N?invite=cr-MSxidjEsMjYyNjMxMjgy',
    image: 'abpll-aura.png',
    victors: ['VegasZ 100%'],
  },
  {
    uid: 'level-4',
    name: 'Decaying abpll',
    levelId: '147315867',
    by: 'GDarisu',
    verifiedBy: 'GDarisu',
    video: 'https://medal.tv/games/geometry-dash/clips/nlXaXOrCLNgHOMJ4X?invite=cr-MSxQSjEsMjYyNjMxMjgy',
    image: '5E9B0BB9-6325-469B-9B9D-8A627904FB93.png',
    victors: ['VegasZ 100%'],
  },
];

export const LEADERBOARD_EMOJIS = ['🥇', '🥈', '🥉'];
export const ANNOUNCEMENTS_LAST_SEEN_KEY = 'abpll_announcements_last_seen';
export const UPLOADED_LEVELS_KEY = 'abpll_uploaded_levels';
export const RANKED_LEVELS_KEY = 'abpll_ranked_levels';

export function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function victorToUsername(victorEntry: string): string {
  const normalized = String(victorEntry || '').trim();
  const match = normalized.match(/^(.+?)\s+\d+%$/);
  return match ? match[1] : normalized;
}

export function getLevelVerifiedBy(level: { verifiedBy?: string }): string {
  return (level?.verifiedBy || 'GDarisu').trim();
}

export function getDisplayVictors(level: { verifiedBy?: string; victors?: string[] }): string[] {
  const verifiedBy = getLevelVerifiedBy(level);
  return (level.victors || []).filter((victor) => victorToUsername(victor) !== verifiedBy);
}

export function normalizeRankedLevel(level: RankedLevel): RankedLevel {
  const normalized = { ...level };
  if (!normalized.verifiedBy) normalized.verifiedBy = 'GDarisu';
  normalized.victors = getDisplayVictors(normalized);
  return normalized;
}

export function formatCommentDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatAnnouncementContent(content: string): string {
  const escaped = escapeHtml(content || '');
  return escaped.replace(
    /(Video:\s*)(https?:\/\/\S+)/i,
    (_, prefix: string, url: string) =>
      `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`,
  );
}

export function getPointsForRank(rank: number): number {
  if (rank === 1) return 500;
  if (rank === 2) return 450;
  if (rank === 3) return 400;
  if (rank === 4) return 350;
  if (rank === 5) return 300;
  return 300 - (rank - 5) * 10;
}

export function normalizeUploadedLevel(level: UploadedLevel): UploadedLevel {
  if (!Array.isArray(level.likes)) level.likes = [];
  if (!Array.isArray(level.comments)) level.comments = [];
  return level;
}

export function getImageSrc(image: string): string {
  if (!image) return '';
  if (image.startsWith('data:') || image.startsWith('http') || image.startsWith('/')) {
    return image;
  }
  return `/${image}`;
}

export function getLevelsData(rankedLevels: RankedLevel[]): RouletteLevelDisplay[] {
  return rankedLevels.map((level, index) => ({
    id: level.uid,
    name: `#${index + 1} ${level.name}`,
    image: getImageSrc(level.image),
    imageAlt: `#${index + 1} ${level.name}`,
    by: level.by,
    levelId: level.levelId,
    points: getPointsForRank(index + 1),
  }));
}

export function getAnnouncementsLastSeenAt(): number {
  if (typeof window === 'undefined') return 0;
  const value = parseInt(localStorage.getItem(ANNOUNCEMENTS_LAST_SEEN_KEY) || '0', 10);
  return Number.isFinite(value) ? value : 0;
}

export function setAnnouncementsLastSeenAt(timestamp: number): void {
  if (typeof window === 'undefined') return;
  const nextValue = Math.max(getAnnouncementsLastSeenAt(), timestamp || 0);
  localStorage.setItem(ANNOUNCEMENTS_LAST_SEEN_KEY, String(nextValue));
}

export function hasUnreadAnnouncements(announcements: Announcement[]): boolean {
  const lastSeen = getAnnouncementsLastSeenAt();
  return (announcements || []).some((item) => (item.createdAt || 0) > lastSeen);
}
