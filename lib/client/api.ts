import type {
  Announcement,
  AuthUser,
  CompletionGroup,
  CompletionItem,
  LeaderboardEntry,
  RankedLevel,
  UploadedLevel,
} from './utils';

export const AUTH_TOKEN_KEY = 'abpll_auth_token';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function parseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = getAuthToken();
  if (!token) return null;

  const response = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    setAuthToken(null);
    return null;
  }

  return parseJson<AuthUser>(response);
}

export async function login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await parseJson<{ token?: string; user?: AuthUser; error?: string }>(response);
  if (!response.ok) throw new Error(data.error || 'Login failed.');
  return { token: data.token!, user: data.user! };
}

export async function register(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await parseJson<{ token?: string; user?: AuthUser; error?: string }>(response);
  if (!response.ok) throw new Error(data.error || 'Registration failed.');
  return { token: data.token!, user: data.user! };
}

export async function logout(): Promise<void> {
  const token = getAuthToken();
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      /* ignore */
    }
  }
  setAuthToken(null);
}

export async function loadGlobalData(): Promise<{ ranked: RankedLevel[]; uploaded: UploadedLevel[] }> {
  const response = await fetch('/api/data');
  if (!response.ok) throw new Error('Failed to load global data');
  return parseJson<{ ranked: RankedLevel[]; uploaded: UploadedLevel[] }>(response);
}

export async function saveGlobalData(ranked: RankedLevel[], uploaded: UploadedLevel[]): Promise<void> {
  const response = await fetch('/api/data', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ranked, uploaded }),
  });
  if (response.status === 401) throw new Error('Unauthorized');
  if (!response.ok) throw new Error('Failed to save global data');
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const response = await fetch('/api/leaderboard');
  if (!response.ok) throw new Error('Failed to load leaderboard');
  return parseJson<LeaderboardEntry[]>(response);
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const response = await fetch('/api/announcements');
  if (!response.ok) throw new Error('Failed to load announcements');
  const data = await parseJson<{ announcements: Announcement[] }>(response);
  return data.announcements || [];
}

export async function createAnnouncement(title: string, content: string): Promise<void> {
  const response = await fetch('/api/announcements', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title, content }),
  });
  const data = await parseJson<{ error?: string }>(response);
  if (!response.ok) throw new Error(data.error || 'Could not publish announcement.');
}

export async function deleteAnnouncement(uid: string): Promise<void> {
  const response = await fetch(`/api/announcements/${uid}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  const data = await parseJson<{ error?: string }>(response);
  if (!response.ok) throw new Error(data.error || 'Could not delete announcement.');
}

export async function fetchMyCompletions(): Promise<CompletionItem[]> {
  const response = await fetch('/api/completions/mine', {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  if (response.status === 401) throw new Error('Unauthorized');
  if (!response.ok) throw new Error('Failed to load pending completions');
  const data = await parseJson<{ completions: CompletionItem[] }>(response);
  return data.completions || [];
}

export async function submitCompletion(payload: {
  levelName: string;
  completion: string;
  rawFootage: string;
  opinion: string;
}): Promise<void> {
  const response = await fetch('/api/completions', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJson<{ error?: string }>(response);
  if (response.status === 401) throw new Error('Unauthorized');
  if (!response.ok) throw new Error(data.error || 'Could not submit completion.');
}

export async function fetchAdminCompletions(): Promise<{
  pendingGroups: CompletionGroup[];
  acceptedGroups: CompletionGroup[];
}> {
  const response = await fetch('/api/completions/admin', {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  if (response.status === 401 || response.status === 403) throw new Error('Forbidden');
  if (!response.ok) throw new Error('Failed to load completions');
  const data = await parseJson<{ pendingGroups: CompletionGroup[]; acceptedGroups: CompletionGroup[] }>(response);
  return {
    pendingGroups: data.pendingGroups || [],
    acceptedGroups: data.acceptedGroups || [],
  };
}

export async function reviewCompletion(uid: string, action: 'accept' | 'deny'): Promise<void> {
  const response = await fetch(`/api/completions/${uid}/${action}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  const data = await parseJson<{ error?: string }>(response);
  if (!response.ok) throw new Error(data.error || 'Action failed.');
}

export async function deleteCompletion(uid: string): Promise<void> {
  const response = await fetch(`/api/completions/${encodeURIComponent(uid)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  const data = await parseJson<{ error?: string }>(response);
  if (!response.ok) throw new Error(data.error || 'Could not delete completion.');
}
