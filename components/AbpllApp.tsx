'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react';
import {
  createAnnouncement,
  deleteAnnouncement,
  deleteCompletion,
  fetchAdminCompletions,
  fetchAnnouncements,
  fetchCurrentUser,
  fetchLeaderboard,
  fetchMyCompletions,
  loadGlobalData,
  login,
  logout,
  register,
  reviewCompletion,
  saveGlobalData,
  setAuthToken,
  submitCompletion,
} from '@/lib/client/api';
import {
  DEFAULT_RANKED_LEVELS,
  LEADERBOARD_EMOJIS,
  RANKED_LEVELS_KEY,
  UPLOADED_LEVELS_KEY,
  formatAnnouncementContent,
  formatCommentDate,
  getDisplayVictors,
  getImageSrc,
  getLevelVerifiedBy,
  getLevelsData,
  getPointsForRank,
  hasUnreadAnnouncements,
  normalizeRankedLevel,
  normalizeUploadedLevel,
  setAnnouncementsLastSeenAt,
  type Announcement,
  type AuthUser,
  type CompletionGroup,
  type CompletionItem,
  type LeaderboardEntry,
  type RankedLevel,
  type RouletteLevelDisplay,
  type UploadedLevel,
} from '@/lib/client/utils';

type ViewId =
  | 'lobby'
  | 'main-list'
  | 'leaderboard'
  | 'announcements'
  | 'info'
  | 'account'
  | 'admin'
  | 'admin-completions'
  | 'roulette-setup'
  | 'roulette-game'
  | 'roulette-win';

type ListTab = 'ranked' | 'uploaded';
type AuthMode = 'login' | 'register';
type PositionModalAction = 'accept-upload' | 'move-ranked' | null;

interface RouletteState {
  goal: number;
  skipsLeft: number;
  progress: number;
  currentLevel: RouletteLevelDisplay | null;
  extremeMode: boolean;
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export default function AbpllApp() {
  const [currentView, setCurrentView] = useState<ViewId>('lobby');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [rankedLevels, setRankedLevels] = useState<RankedLevel[]>([]);
  const [uploadedLevels, setUploadedLevels] = useState<UploadedLevel[]>([]);
  const [listTab, setListTab] = useState<ListTab>('ranked');
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);
  const [announcementsUnread, setAnnouncementsUnread] = useState(false);
  const [accountPending, setAccountPending] = useState<CompletionItem[]>([]);
  const [accountPendingError, setAccountPendingError] = useState<string | null>(null);
  const [adminPendingGroups, setAdminPendingGroups] = useState<CompletionGroup[]>([]);
  const [adminAcceptedGroups, setAdminAcceptedGroups] = useState<CompletionGroup[]>([]);
  const [adminCompletionsError, setAdminCompletionsError] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authError, setAuthError] = useState('');

  const [positionModalAction, setPositionModalAction] = useState<PositionModalAction>(null);
  const [pendingLevelUid, setPendingLevelUid] = useState<string | null>(null);
  const [acceptPosition, setAcceptPosition] = useState(1);

  const [openVictors, setOpenVictors] = useState<Set<string>>(new Set());
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [openLeaderboardMore, setOpenLeaderboardMore] = useState<Set<number>>(new Set());
  const [expandedCompletionGroups, setExpandedCompletionGroups] = useState<Set<string>>(new Set());
  const [highlightedLevelId, setHighlightedLevelId] = useState<string | null>(null);

  const [uploadPreview, setUploadPreview] = useState('');
  const uploadPhotoRef = useRef<HTMLInputElement>(null);

  const [roulette, setRoulette] = useState<RouletteState>({
    goal: 50,
    skipsLeft: 0,
    progress: 0,
    currentLevel: null,
    extremeMode: false,
  });
  const [rouletteExtreme, setRouletteExtreme] = useState(false);
  const [rouletteGoalInput, setRouletteGoalInput] = useState('50');
  const [rouletteSkipsInput, setRouletteSkipsInput] = useState('3');
  const [roulettePercent, setRoulettePercent] = useState('');
  const [rouletteInputError, setRouletteInputError] = useState('');
  const [rouletteNextDisabled, setRouletteNextDisabled] = useState(true);

  const saveQueueRef = useRef(Promise.resolve());
  const levelCardRefs = useRef<Record<string, HTMLElement | null>>({});

  const isAdmin = currentUser?.isAdmin === true;
  const sessionUser = currentUser?.username ?? null;

  const handleUnauthorized = useCallback(() => {
    setAuthToken(null);
    setCurrentUser(null);
    setAuthMode('login');
    setLoginOpen(true);
    setAuthError('Session expired. Please log in again.');
  }, []);

  const queueGlobalSave = useCallback(
    (ranked: RankedLevel[], uploaded: UploadedLevel[]) => {
      saveQueueRef.current = saveQueueRef.current
        .then(async () => {
          await saveGlobalData(ranked, uploaded);
          setSyncError(false);
        })
        .catch((error: Error) => {
          if (error.message === 'Unauthorized') handleUnauthorized();
          else setSyncError(true);
        });
      return saveQueueRef.current;
    },
    [handleUnauthorized],
  );

  const applyGlobalData = useCallback((ranked: RankedLevel[], uploaded: UploadedLevel[]) => {
    setRankedLevels(ranked.map(normalizeRankedLevel));
    setUploadedLevels(uploaded.map(normalizeUploadedLevel));
    setSyncError(false);
  }, []);

  const loadData = useCallback(async () => {
    const data = await loadGlobalData();
    applyGlobalData(
      Array.isArray(data.ranked) && data.ranked.length ? data.ranked : DEFAULT_RANKED_LEVELS,
      Array.isArray(data.uploaded) ? data.uploaded : [],
    );
  }, [applyGlobalData]);

  const migrateLocalDataToServer = useCallback(
    async (ranked: RankedLevel[], uploaded: UploadedLevel[]) => {
      let migratedRanked = ranked;
      let migratedUploaded = uploaded;
      let migrated = false;

      try {
        const localRanked = localStorage.getItem(RANKED_LEVELS_KEY);
        if (localRanked) {
          const parsed = JSON.parse(localRanked) as RankedLevel[];
          if (Array.isArray(parsed) && parsed.length) {
            migratedRanked = parsed.map(normalizeRankedLevel);
            migrated = true;
          }
          localStorage.removeItem(RANKED_LEVELS_KEY);
        }
      } catch {
        /* ignore */
      }

      try {
        const localUploaded = localStorage.getItem(UPLOADED_LEVELS_KEY);
        if (localUploaded) {
          const parsed = JSON.parse(localUploaded) as UploadedLevel[];
          if (Array.isArray(parsed) && parsed.length) {
            migratedUploaded = parsed.map(normalizeUploadedLevel);
            migrated = true;
          }
          localStorage.removeItem(UPLOADED_LEVELS_KEY);
        }
      } catch {
        /* ignore */
      }

      if (migrated) {
        await queueGlobalSave(migratedRanked, migratedUploaded);
      }
    },
    [queueGlobalSave],
  );

  const initGlobalData = useCallback(async () => {
    try {
      await loadData();
    } catch {
      let ranked = structuredClone(DEFAULT_RANKED_LEVELS).map(normalizeRankedLevel);
      let uploaded: UploadedLevel[] = [];
      try {
        await migrateLocalDataToServer(ranked, uploaded);
        await loadData();
      } catch {
        applyGlobalData(ranked, uploaded);
        setSyncError(true);
      }
    }
  }, [applyGlobalData, loadData, migrateLocalDataToServer]);

  const loadLeaderboard = useCallback(async () => {
    try {
      setLeaderboardError(null);
      setLeaderboardEntries(await fetchLeaderboard());
    } catch {
      setLeaderboardError('Cannot load leaderboard. Run npm start first.');
      setLeaderboardEntries([]);
    }
  }, []);

  const refreshAnnouncementsState = useCallback(
    async (markRead = false) => {
      try {
        const items = await fetchAnnouncements();
        setAnnouncementsError(null);
        if (markRead || currentView === 'announcements') {
          setAnnouncements(items);
          if (items.length) {
            setAnnouncementsLastSeenAt(Math.max(...items.map((i) => i.createdAt || 0)));
          }
          setAnnouncementsUnread(false);
        } else {
          setAnnouncementsUnread(hasUnreadAnnouncements(items));
        }
        return items;
      } catch {
        if (currentView === 'announcements') {
          setAnnouncementsError('Cannot load announcements. Run npm start first.');
        }
        return null;
      }
    },
    [currentView],
  );

  const refreshGlobalData = useCallback(async () => {
    try {
      await loadData();
      await loadLeaderboard();
      await refreshAnnouncementsState(false);
    } catch {
      setSyncError(true);
    }
  }, [loadData, loadLeaderboard, refreshAnnouncementsState]);

  const loadAccountPending = useCallback(async () => {
    if (!sessionUser) {
      setAccountPending([]);
      setAccountPendingError('Log in to see pending completions.');
      return;
    }
    try {
      setAccountPendingError(null);
      setAccountPending(await fetchMyCompletions());
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        setAccountPendingError('Log in to see pending completions.');
      } else {
        setAccountPendingError('Cannot load pending completions.');
      }
      setAccountPending([]);
    }
  }, [sessionUser]);

  const loadAdminCompletions = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setAdminCompletionsError(null);
      const data = await fetchAdminCompletions();
      setAdminPendingGroups(data.pendingGroups);
      setAdminAcceptedGroups(data.acceptedGroups);
    } catch (error) {
      if (error instanceof Error && error.message === 'Forbidden') {
        setAdminCompletionsError('Admin login required.');
      } else {
        setAdminCompletionsError('Cannot load completions.');
      }
      setAdminPendingGroups([]);
      setAdminAcceptedGroups([]);
    }
  }, [isAdmin]);

  useEffect(() => {
    async function bootstrap() {
      const user = await fetchCurrentUser();
      setCurrentUser(user);
      await initGlobalData();
      await loadLeaderboard();
      await refreshAnnouncementsState(false);
    }
    bootstrap();
  }, [initGlobalData, loadLeaderboard, refreshAnnouncementsState]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) refreshGlobalData();
    }, 15000);
    return () => clearInterval(id);
  }, [refreshGlobalData]);

  useEffect(() => {
    if (currentView === 'roulette-win') {
      const id = setTimeout(() => setCurrentView('lobby'), 3000);
      return () => clearTimeout(id);
    }
  }, [currentView]);

  useEffect(() => {
    if (!highlightedLevelId) return;
    const id = setTimeout(() => setHighlightedLevelId(null), 1500);
    return () => clearTimeout(id);
  }, [highlightedLevelId]);

  const handleAuthSuccess = async (token: string, user: AuthUser, redirectToLeaderboard = false) => {
    setAuthToken(token);
    setCurrentUser(user);
    setLoginOpen(false);
    setAuthError('');
    await loadLeaderboard();
    if (redirectToLeaderboard) setCurrentView('leaderboard');
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setCurrentView('lobby');
  };

  const scrollToLevel = (uid: string) => {
    const el = levelCardRefs.current[uid];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedLevelId(uid);
    }
  };

  const toggleSetItem = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const openPositionModal = (action: PositionModalAction, uid: string) => {
    setPositionModalAction(action);
    setPendingLevelUid(uid);
    if (action === 'accept-upload') {
      setAcceptPosition(rankedLevels.length + 1);
    } else {
      const idx = rankedLevels.findIndex((l) => l.uid === uid);
      setAcceptPosition(idx >= 0 ? idx + 1 : 1);
    }
    setAcceptOpen(true);
  };

  const closePositionModal = () => {
    setPositionModalAction(null);
    setPendingLevelUid(null);
    setAcceptOpen(false);
  };

  const saveRanked = (levels: RankedLevel[]) => {
    const normalized = levels.map(normalizeRankedLevel);
    setRankedLevels(normalized);
    return queueGlobalSave(normalized, uploadedLevels);
  };

  const saveUploaded = (levels: UploadedLevel[]) => {
    const normalized = levels.map(normalizeUploadedLevel);
    setUploadedLevels(normalized);
    return queueGlobalSave(rankedLevels, normalized);
  };

  const deleteRankedLevel = (uid: string) => {
    saveRanked(rankedLevels.filter((l) => l.uid !== uid));
  };

  const moveRankedLevel = (uid: string, newPosition: number) => {
    const ranked = [...rankedLevels];
    const oldIndex = ranked.findIndex((l) => l.uid === uid);
    if (oldIndex === -1) return;
    const [level] = ranked.splice(oldIndex, 1);
    const pos = Math.max(1, Math.min(newPosition, ranked.length + 1));
    ranked.splice(pos - 1, 0, level);
    saveRanked(ranked);
  };

  const denyUploadedLevel = (uid: string) => {
    saveUploaded(uploadedLevels.filter((l) => l.uid !== uid));
  };

  const acceptUploadedLevel = (position: number) => {
    const uploaded = [...uploadedLevels];
    const uploadIndex = uploaded.findIndex((l) => l.uid === pendingLevelUid);
    if (uploadIndex === -1) return;
    const level = uploaded[uploadIndex];
    uploaded.splice(uploadIndex, 1);
    const ranked = [...rankedLevels];
    const pos = Math.max(1, Math.min(position, ranked.length + 1));
    ranked.splice(
      pos - 1,
      0,
      normalizeRankedLevel({
        uid: 'level-' + Date.now(),
        name: level.name,
        levelId: level.levelId,
        by: level.by,
        verifiedBy: level.verifiedBy,
        video: level.video,
        image: level.image,
        victors: [],
      }),
    );
    Promise.all([saveUploaded(uploaded), saveRanked(ranked)]).then(() => {
      closePositionModal();
      setListTab('ranked');
    });
  };

  const confirmPositionModal = () => {
    if (positionModalAction === 'accept-upload') acceptUploadedLevel(acceptPosition);
    else if (positionModalAction === 'move-ranked' && pendingLevelUid) {
      moveRankedLevel(pendingLevelUid, acceptPosition);
      closePositionModal();
    }
  };

  const toggleUploadLike = (uid: string) => {
    if (!sessionUser) {
      setAuthMode('login');
      setLoginOpen(true);
      return;
    }
    const levels = uploadedLevels.map(normalizeUploadedLevel);
    const level = levels.find((l) => l.uid === uid);
    if (!level) return;
    const idx = level.likes.indexOf(sessionUser);
    if (idx === -1) level.likes.push(sessionUser);
    else level.likes.splice(idx, 1);
    saveUploaded(levels);
  };

  const addUploadComment = (uid: string, text: string) => {
    if (!sessionUser) {
      setAuthMode('login');
      setLoginOpen(true);
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    const levels = uploadedLevels.map(normalizeUploadedLevel);
    const level = levels.find((l) => l.uid === uid);
    if (!level) return;
    level.comments.push({
      id: 'comment-' + Date.now(),
      author: sessionUser,
      text: trimmed,
      createdAt: Date.now(),
    });
    saveUploaded(levels).then(() => setOpenComments((prev) => new Set(prev).add(uid)));
  };

  const handleUploadSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const file = uploadPhotoRef.current?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const level: UploadedLevel = {
        uid: 'uploaded-' + Date.now(),
        name: (form.elements.namedItem('upload-name') as HTMLInputElement).value.trim(),
        levelId: (form.elements.namedItem('upload-id') as HTMLInputElement).value.trim(),
        by: (form.elements.namedItem('upload-by') as HTMLInputElement).value.trim(),
        verifiedBy: (form.elements.namedItem('upload-verified-by') as HTMLInputElement).value.trim(),
        video: (form.elements.namedItem('upload-video') as HTMLInputElement).value.trim(),
        image: reader.result as string,
        likes: [],
        comments: [],
      };
      const levels = [...uploadedLevels, level];
      saveUploaded(levels).then(() => {
        setListTab('uploaded');
        form.reset();
        setUploadPreview('');
        setUploadOpen(false);
      });
    };
    reader.readAsDataURL(file);
  };

  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError('');
    const form = e.currentTarget;
    const username = (form.elements.namedItem('login-username') as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem('login-password') as HTMLInputElement).value;
    if (!username || !password) return;
    try {
      const data = await login(username, password);
      form.reset();
      await handleAuthSuccess(data.token, data.user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Login failed.');
    }
  };

  const handleRegisterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError('');
    const form = e.currentTarget;
    const username = (form.elements.namedItem('register-username') as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem('register-password') as HTMLInputElement).value;
    const confirm = (form.elements.namedItem('register-password-confirm') as HTMLInputElement).value;
    if (password !== confirm) {
      setAuthError('Passwords do not match.');
      return;
    }
    try {
      const data = await register(username, password);
      form.reset();
      await handleAuthSuccess(data.token, data.user, true);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Registration failed.');
    }
  };

  const handleCompletionSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    try {
      await submitCompletion({
        levelName: (form.elements.namedItem('completion-level-name') as HTMLInputElement).value.trim(),
        completion: (form.elements.namedItem('completion-video') as HTMLInputElement).value.trim(),
        rawFootage: (form.elements.namedItem('completion-raw-footage') as HTMLInputElement).value.trim(),
        opinion: (form.elements.namedItem('completion-opinion') as HTMLTextAreaElement).value.trim(),
      });
      form.reset();
      setCompletionOpen(false);
      await loadAccountPending();
      alert('Completion submitted. Waiting for admin review.');
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') handleUnauthorized();
      else alert(error instanceof Error ? error.message : 'Could not submit completion.');
    }
  };

  const handleAnnouncementSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin) return;
    const form = e.currentTarget;
    const title = (form.elements.namedItem('announcement-title') as HTMLInputElement).value.trim();
    const content = (form.elements.namedItem('announcement-content') as HTMLTextAreaElement).value.trim();
    try {
      await createAnnouncement(title, content);
      form.reset();
      await refreshAnnouncementsState(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not publish announcement.');
    }
  };

  const handleAdminReview = async (uid: string, action: 'accept' | 'deny') => {
    try {
      await reviewCompletion(uid, action);
      await loadData();
      await loadLeaderboard();
      await loadAdminCompletions();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Action failed.');
    }
  };

  const handleAdminDeleteCompletion = async (uid: string, isAccepted: boolean) => {
    const message = isAccepted
      ? 'Delete this accepted completion? The player will be removed from victors and the leaderboard.'
      : 'Delete this completion?';
    if (!confirm(message)) return;
    try {
      await deleteCompletion(uid);
      await loadData();
      await loadLeaderboard();
      await loadAdminCompletions();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not delete completion.');
    }
  };

  const getMinProgressGain = () => (roulette.extremeMode ? 2 : 1);

  const getMinAllowedPercent = (progress: number, extreme: boolean) => {
    const minForGain = progress + getMinProgressGain() - 1;
    if (extreme) return Math.max(minForGain, 2);
    return Math.max(minForGain, 1);
  };

  const validateRoulettePercent = (value: string, progress: number, extreme: boolean) => {
    if (value === '' || Number.isNaN(Number(value))) {
      setRouletteNextDisabled(true);
      setRouletteInputError('');
      return false;
    }
    const entered = parseInt(value, 10);
    if (entered < 0 || entered > 100) {
      setRouletteNextDisabled(true);
      setRouletteInputError('Enter a value between 0 and 100.');
      return false;
    }
    const minEntered = getMinAllowedPercent(progress, extreme);
    if (entered < minEntered) {
      setRouletteNextDisabled(true);
      setRouletteInputError(
        extreme
          ? `Extreme mode requires at least 2% per level. Enter at least ${minEntered}%.`
          : `You must beat ${progress}%. Enter at least ${minEntered}%.`,
      );
      return false;
    }
    setRouletteNextDisabled(false);
    setRouletteInputError('');
    return true;
  };

  const pickRandomLevel = (excludeId?: string): RouletteLevelDisplay => {
    const levelsData = getLevelsData(rankedLevels);
    const pool = excludeId ? levelsData.filter((l) => l.id !== excludeId) : levelsData;
    const source = pool.length ? pool : levelsData;
    return source[Math.floor(Math.random() * source.length)];
  };

  const startRouletteGame = (extreme: boolean, goal: number, skips: number) => {
    const level = pickRandomLevel();
    setRoulette({
      goal,
      skipsLeft: skips,
      progress: 0,
      currentLevel: level,
      extremeMode: extreme,
    });
    setRoulettePercent('');
    setRouletteInputError('');
    setRouletteNextDisabled(true);
    setCurrentView('roulette-game');
  };

  const overlayClick = (e: MouseEvent<HTMLDivElement>, close: () => void) => {
    if (e.target === e.currentTarget) close();
  };

  const positionMax =
    positionModalAction === 'accept-upload' ? rankedLevels.length + 1 : rankedLevels.length;

  return (
    <>
      <div className={cn('sync-status', !syncError && 'hidden')}>
        Cannot reach server — run npm start
      </div>

      <div className={cn('session-bar', !sessionUser && 'hidden')}>
        <span className={cn('session-admin-badge', !isAdmin && 'hidden')}>Admin</span>
        <span>
          Logged in as <strong>{sessionUser}</strong>
        </span>
        <button type="button" className="session-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Lobby */}
      <section className={cn('lobby view', currentView === 'lobby' && 'active')}>
        <div className="lobby-content">
          <h1 className="lobby-title">Welcome to ABPLL Level List!</h1>
          <nav className="lobby-buttons">
            <button type="button" className="lobby-btn" onClick={() => setCurrentView('main-list')}>
              Main list
            </button>
            <button
              type="button"
              className="lobby-btn"
              onClick={async () => {
                await loadLeaderboard();
                setCurrentView('leaderboard');
              }}
            >
              Leaderboard
            </button>
            <button
              type="button"
              className="lobby-btn"
              onClick={() => {
                if (rouletteExtreme) {
                  setRouletteGoalInput('100');
                  setRouletteSkipsInput('0');
                }
                setCurrentView('roulette-setup');
              }}
            >
              Roulette
            </button>
            <button type="button" className="lobby-btn" onClick={() => setCurrentView('info')}>
              Info
            </button>
            <button
              type="button"
              className={cn('lobby-btn', announcementsUnread && 'unread')}
              onClick={async () => {
                try {
                  const items = await fetchAnnouncements();
                  setAnnouncements(items);
                  setAnnouncementsError(null);
                  if (items.length) {
                    setAnnouncementsLastSeenAt(Math.max(...items.map((i) => i.createdAt || 0)));
                  }
                  setAnnouncementsUnread(false);
                } catch {
                  setAnnouncementsError('Cannot load announcements. Run npm start first.');
                  setAnnouncements([]);
                }
                setCurrentView('announcements');
              }}
            >
              Announcements
            </button>
            <button
              type="button"
              className={cn('lobby-btn', (isAdmin || !sessionUser) && 'hidden')}
              onClick={async () => {
                if (!sessionUser) {
                  setAuthMode('login');
                  setLoginOpen(true);
                  return;
                }
                await loadAccountPending();
                setCurrentView('account');
              }}
            >
              Account
            </button>
            <button
              type="button"
              className={cn('lobby-btn', !isAdmin && 'hidden')}
              onClick={() => {
                if (!isAdmin) {
                  setAuthMode('login');
                  setLoginOpen(true);
                  return;
                }
                setCurrentView('admin');
              }}
            >
              Admin
            </button>
            <button
              type="button"
              className={cn('lobby-btn', sessionUser && 'hidden')}
              onClick={() => {
                setAuthMode('login');
                setLoginOpen(true);
              }}
            >
              Login
            </button>
          </nav>
        </div>
      </section>

      {/* Main list */}
      <section className={cn('main-list view', currentView === 'main-list' && 'active')}>
        <header className="main-list-header">
          <h1 className="main-list-title">ABPLL Main List. Levels:</h1>
          <div className="main-list-actions">
            <button
              type="button"
              className="action-btn"
              onClick={() => {
                if (!sessionUser) {
                  setAuthMode('login');
                  setLoginOpen(true);
                  return;
                }
                setUploadOpen(true);
              }}
            >
              Upload your levels here!
            </button>
            <button type="button" className="action-btn" onClick={() => setCurrentView('lobby')}>
              Back
            </button>
          </div>
        </header>
        <div className="list-tabs">
          <button
            type="button"
            className={cn('list-tab', listTab === 'ranked' && 'active')}
            onClick={() => setListTab('ranked')}
          >
            Main List
          </button>
          <button
            type="button"
            className={cn('list-tab', listTab === 'uploaded' && 'active')}
            onClick={() => setListTab('uploaded')}
          >
            Uploaded levels
          </button>
        </div>

        <div className={cn('main-list-panel', listTab !== 'ranked' && 'hidden')}>
          <div className="main-list-body">
            <aside className="levels-index">
              <h2 className="levels-index-title">Levels</h2>
              <nav className="levels-index-list">
                {rankedLevels.map((level, index) => (
                  <a
                    key={level.uid}
                    href={`#${level.uid}`}
                    className="level-index-link"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToLevel(level.uid);
                    }}
                  >
                    #{index + 1} {level.name}
                  </a>
                ))}
              </nav>
            </aside>
            <div className="levels-area">
              {rankedLevels.map((level, index) => {
                const rank = index + 1;
                const points = getPointsForRank(rank);
                const victors = getDisplayVictors(level);
                return (
                  <article
                    key={level.uid}
                    id={level.uid}
                    ref={(el) => {
                      levelCardRefs.current[level.uid] = el;
                    }}
                    className={cn('level-card', highlightedLevelId === level.uid && 'highlight')}
                  >
                    <div className="level-card-main">
                      <img
                        src={getImageSrc(level.image)}
                        alt={`#${rank} ${level.name}`}
                        className="level-card-image"
                      />
                      <div className="level-card-info">
                        <h2 className="level-card-name">
                          #{rank} {level.name}
                        </h2>
                        <div className="level-card-details">
                          <p>By: {level.by}</p>
                          <p>Verified by: {getLevelVerifiedBy(level)}</p>
                          <p>Id: {level.levelId}</p>
                          <p>Points: {points}</p>
                        </div>
                      </div>
                      <div className="level-card-actions">
                        <div className="level-card-actions-group">
                          <a
                            href={level.video}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="level-btn"
                          >
                            Verification video
                          </a>
                          <button
                            type="button"
                            className="level-btn victors-toggle"
                            onClick={() => setOpenVictors((prev) => toggleSetItem(prev, level.uid))}
                          >
                            Victors
                          </button>
                        </div>
                        {isAdmin && (
                          <div className="level-card-actions-group level-card-actions-admin">
                            <button
                              type="button"
                              className="level-btn admin-move-ranked"
                              onClick={() => openPositionModal('move-ranked', level.uid)}
                            >
                              Move
                            </button>
                            <button
                              type="button"
                              className="level-btn admin-delete-ranked"
                              onClick={() => deleteRankedLevel(level.uid)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={cn('victors-panel', openVictors.has(level.uid) && 'open')}>
                      {victors.length ? (
                        victors.map((v) => <p key={v}>{v}</p>)
                      ) : (
                        <p>No victors yet</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        <div className={cn('main-list-panel', listTab !== 'uploaded' && 'hidden')}>
          <div className="main-list-body">
            <aside className="levels-index">
              <h2 className="levels-index-title">Uploaded levels</h2>
              <nav className="levels-index-list">
                {uploadedLevels.map((level) => (
                  <a
                    key={level.uid}
                    href={`#${level.uid}`}
                    className="level-index-link"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToLevel(level.uid);
                    }}
                  >
                    {level.name}
                  </a>
                ))}
              </nav>
            </aside>
            <div className="levels-area">
              {uploadedLevels.length === 0 && (
                <p className="uploaded-empty">No uploaded levels yet.</p>
              )}
              {uploadedLevels.map((level) => {
                const liked = sessionUser ? level.likes.includes(sessionUser) : false;
                const likeCount = level.likes.length;
                const likeLabel = liked ? `Unlike (${likeCount})` : `Like (${likeCount})`;
                return (
                  <article
                    key={level.uid}
                    id={level.uid}
                    ref={(el) => {
                      levelCardRefs.current[level.uid] = el;
                    }}
                    className={cn('level-card', highlightedLevelId === level.uid && 'highlight')}
                  >
                    <div className="level-card-main">
                      <img
                        src={getImageSrc(level.image)}
                        alt={level.name}
                        className="level-card-image"
                      />
                      <div className="level-card-info">
                        <h2 className="level-card-name">{level.name}</h2>
                        <div className="level-card-details">
                          <p>By: {level.by}</p>
                          <p>Verified by: {getLevelVerifiedBy(level)}</p>
                          <p>Id: {level.levelId}</p>
                        </div>
                      </div>
                      <div className="level-card-actions">
                        <div className="level-card-actions-group">
                          <a
                            href={level.video}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="level-btn"
                          >
                            Verification video
                          </a>
                          <button
                            type="button"
                            className={cn('level-btn upload-like-btn', liked && 'liked')}
                            onClick={() => toggleUploadLike(level.uid)}
                          >
                            {likeLabel}
                          </button>
                          <button
                            type="button"
                            className="level-btn comments-toggle"
                            onClick={() => setOpenComments((prev) => toggleSetItem(prev, level.uid))}
                          >
                            Comments ({level.comments.length})
                          </button>
                        </div>
                        {isAdmin && (
                          <div className="level-card-actions-group level-card-actions-admin">
                            <button
                              type="button"
                              className="level-btn admin-accept"
                              onClick={() => openPositionModal('accept-upload', level.uid)}
                            >
                              Accepted
                            </button>
                            <button
                              type="button"
                              className="level-btn admin-deny"
                              onClick={() => denyUploadedLevel(level.uid)}
                            >
                              Denied
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={cn('comments-panel', openComments.has(level.uid) && 'open')}>
                      <div className="comments-list">
                        {level.comments.length ? (
                          level.comments.map((comment) => (
                            <div key={comment.id} className="comment-item">
                              <div className="comment-meta">
                                {comment.author} · {formatCommentDate(comment.createdAt)}
                              </div>
                              <div className="comment-text">{comment.text}</div>
                            </div>
                          ))
                        ) : (
                          <p className="comments-empty">No comments yet.</p>
                        )}
                      </div>
                      {sessionUser ? (
                        <form
                          className="comment-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const textarea = e.currentTarget.querySelector('textarea') as HTMLTextAreaElement;
                            addUploadComment(level.uid, textarea.value);
                            textarea.value = '';
                          }}
                        >
                          <textarea placeholder="Write a comment..." required maxLength={500} />
                          <button type="submit" className="level-btn">
                            Post comment
                          </button>
                        </form>
                      ) : (
                        <p className="comment-login-note">Log in to comment.</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className={cn('leaderboard-view view', currentView === 'leaderboard' && 'active')}>
        <div className="leaderboard-content">
          <header className="leaderboard-header">
            <h1 className="leaderboard-title">ABPLL Leaderboard</h1>
            <button type="button" className="action-btn" onClick={() => setCurrentView('lobby')}>
              Back
            </button>
          </header>
          <div className="leaderboard-list">
            {leaderboardError ? (
              <p className="leaderboard-empty">{leaderboardError}</p>
            ) : leaderboardEntries.length === 0 ? (
              <p className="leaderboard-empty">No players on the leaderboard yet.</p>
            ) : (
              leaderboardEntries.map((entry, index) => {
                const rank = index + 1;
                const emoji = rank <= 3 ? LEADERBOARD_EMOJIS[rank - 1] : null;
                return (
                  <div key={entry.username} className="leaderboard-entry-wrap">
                    <article className="leaderboard-entry">
                      <div className="leaderboard-entry-info">
                        <h2 className="leaderboard-rank-name">
                          <span>
                            #{rank} {entry.username}
                          </span>
                          {emoji && (
                            <span className="leaderboard-emoji" aria-hidden="true">
                              {emoji}
                            </span>
                          )}
                        </h2>
                        <p className="leaderboard-points">Points: {entry.points}</p>
                      </div>
                      <button
                        type="button"
                        className="level-btn leaderboard-more-toggle"
                        onClick={() =>
                          setOpenLeaderboardMore((prev) => {
                            const next = new Set(prev);
                            if (next.has(index)) next.delete(index);
                            else next.add(index);
                            return next;
                          })
                        }
                      >
                        More
                      </button>
                    </article>
                    <div className={cn('leaderboard-more-panel', openLeaderboardMore.has(index) && 'open')}>
                      <p>Hardest verification: {entry.hardestVerification}</p>
                      <p>Hardest completion: {entry.hardestCompletion}</p>
                      <p>Levels made: {entry.levelsMade}</p>
                      <span className="leaderboard-accepted-title">Accepted completions:</span>
                      {(entry.acceptedCompletions || []).length === 0 ? (
                        <p className="completion-item-detail">No accepted completions yet.</p>
                      ) : (
                        <div className="leaderboard-accepted-list">
                          {(entry.acceptedCompletions || []).map((item) => (
                            <div key={item.uid} className="leaderboard-accepted-item">
                              <strong>{item.levelName}</strong>
                              {item.completion && (
                                <div>
                                  <strong>Completion:</strong>{' '}
                                  <a href={item.completion} target="_blank" rel="noopener noreferrer">
                                    {item.completion}
                                  </a>
                                </div>
                              )}
                              {item.rawFootage && (
                                <div>
                                  <strong>Raw footage:</strong>{' '}
                                  <a href={item.rawFootage} target="_blank" rel="noopener noreferrer">
                                    {item.rawFootage}
                                  </a>
                                </div>
                              )}
                              {item.opinion && (
                                <div>
                                  <strong>Opinion:</strong> {item.opinion}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Announcements */}
      <section className={cn('leaderboard-view view', currentView === 'announcements' && 'active')}>
        <div className="leaderboard-content">
          <header className="leaderboard-header">
            <h1 className="leaderboard-title">Announcements</h1>
            <button type="button" className="action-btn" onClick={() => setCurrentView('lobby')}>
              Back
            </button>
          </header>
          {isAdmin && (
            <form className="announcement-form" onSubmit={handleAnnouncementSubmit}>
              <div className="upload-field">
                <label htmlFor="announcement-title">Title</label>
                <input
                  id="announcement-title"
                  name="announcement-title"
                  type="text"
                  placeholder="Announcement title"
                  required
                  maxLength={120}
                />
              </div>
              <div className="upload-field">
                <label htmlFor="announcement-content">Content</label>
                <textarea
                  id="announcement-content"
                  name="announcement-content"
                  placeholder="Write the announcement..."
                  required
                  maxLength={2000}
                />
              </div>
              <button type="submit" className="action-btn">
                Publish announcement
              </button>
            </form>
          )}
          <div className="leaderboard-list">
            {announcementsError ? (
              <p className="leaderboard-empty">{announcementsError}</p>
            ) : announcements.length === 0 ? (
              <p className="leaderboard-empty">No announcements yet.</p>
            ) : (
              announcements.map((item) => (
                <article key={item.uid} className="announcement-card">
                  <h2 className="announcement-card-title">{item.title}</h2>
                  <p className="announcement-card-meta">
                    {item.author} · {formatCommentDate(item.createdAt)}
                  </p>
                  <div
                    className="announcement-card-content"
                    dangerouslySetInnerHTML={{ __html: formatAnnouncementContent(item.content) }}
                  />
                  {isAdmin && (
                    <div className="completion-item-actions">
                      <button
                        type="button"
                        className="level-btn admin-announcement-delete"
                        onClick={async () => {
                          if (!confirm('Delete this announcement?')) return;
                          try {
                            await deleteAnnouncement(item.uid);
                            await refreshAnnouncementsState(true);
                          } catch (error) {
                            alert(error instanceof Error ? error.message : 'Could not delete announcement.');
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Info */}
      <section className={cn('leaderboard-view view', currentView === 'info' && 'active')}>
        <div className="leaderboard-content">
          <header className="leaderboard-header">
            <h1 className="leaderboard-title">Info</h1>
            <button type="button" className="action-btn" onClick={() => setCurrentView('lobby')}>
              Back
            </button>
          </header>
          <div className="info-links">
            <a
              href="https://discord.gg/E36TbYcb"
              target="_blank"
              rel="noopener noreferrer"
              className="lobby-btn"
            >
              Discord
            </a>
          </div>
        </div>
      </section>

      {/* Account */}
      <section className={cn('leaderboard-view view', currentView === 'account' && 'active')}>
        <div className="leaderboard-content">
          <header className="leaderboard-header">
            <h1 className="leaderboard-title">Account</h1>
            <button type="button" className="action-btn" onClick={() => setCurrentView('lobby')}>
              Back
            </button>
          </header>
          <div className="account-panel">
            <p className="account-panel-title">
              Logged in as <strong>{sessionUser}</strong>
            </p>
            <p className="account-panel-note">You are logged in with a saved account on this device.</p>
            <ul className="account-panel-list">
              <li>Upload levels to Uploaded levels</li>
              <li>Submit completions for Main List levels</li>
              <li>Like and comment on uploaded levels</li>
            </ul>
            <button
              type="button"
              className="action-btn"
              onClick={() => {
                if (!sessionUser) {
                  setAuthMode('login');
                  setLoginOpen(true);
                  return;
                }
                setCompletionOpen(true);
              }}
            >
              Upload completion
            </button>
            <button type="button" className="action-btn" onClick={handleLogout}>
              Logout
            </button>
            <div className="account-pending-section">
              <h3 className="account-pending-title">Pending completions</h3>
              <div>
                {accountPendingError ? (
                  <p className="leaderboard-empty">{accountPendingError}</p>
                ) : accountPending.length === 0 ? (
                  <p className="leaderboard-empty">No pending completions.</p>
                ) : (
                  accountPending.map((item) => (
                    <div key={item.uid} className="completion-item">
                      <div className="completion-item-title">{item.levelName}</div>
                      <div className="completion-item-detail">
                        <strong>Completion:</strong>{' '}
                        <a href={item.completion} target="_blank" rel="noopener noreferrer">
                          {item.completion}
                        </a>
                      </div>
                      <div className="completion-item-detail">
                        <strong>Raw footage:</strong>{' '}
                        {item.rawFootage ? (
                          <a href={item.rawFootage} target="_blank" rel="noopener noreferrer">
                            {item.rawFootage}
                          </a>
                        ) : (
                          '-'
                        )}
                      </div>
                      <div className="completion-item-detail">
                        <strong>Opinion:</strong> {item.opinion}
                      </div>
                      <div className="completion-item-detail">
                        <strong>Status:</strong> Waiting for admin review
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Admin */}
      <section className={cn('leaderboard-view view', currentView === 'admin' && 'active')}>
        <div className="leaderboard-content">
          <header className="leaderboard-header">
            <h1 className="leaderboard-title">Admin</h1>
            <button type="button" className="action-btn" onClick={() => setCurrentView('lobby')}>
              Back
            </button>
          </header>
          <div className="account-panel">
            <span className="account-admin-badge">Admin</span>
            <p className="account-panel-title">
              Logged in as <strong>{sessionUser}</strong>
            </p>
            <p className="account-panel-note">You have moderator access on the level list.</p>
            <ul className="account-panel-list">
              <li>Accept or deny levels on Uploaded levels</li>
              <li>Review player completions (accept, deny, delete accepted)</li>
              <li>Move or delete levels on Main List</li>
            </ul>
            <button type="button" className="action-btn" onClick={() => setCurrentView('main-list')}>
              Open Main list
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={async () => {
                if (!isAdmin) {
                  setAuthMode('login');
                  setLoginOpen(true);
                  return;
                }
                await loadAdminCompletions();
                setCurrentView('admin-completions');
              }}
            >
              Completions
            </button>
            <button type="button" className="action-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </section>

      {/* Admin completions */}
      <section className={cn('leaderboard-view view', currentView === 'admin-completions' && 'active')}>
        <div className="leaderboard-content">
          <header className="leaderboard-header">
            <h1 className="leaderboard-title">Completions</h1>
            <button type="button" className="action-btn" onClick={() => setCurrentView('admin')}>
              Back
            </button>
          </header>
          <div className="leaderboard-list">
            {adminCompletionsError ? (
              <p className="leaderboard-empty">{adminCompletionsError}</p>
            ) : (
              <>
                <h2 className="admin-section-title">Pending</h2>
                {adminPendingGroups.length === 0 ? (
                  <p className="leaderboard-empty">No pending completions.</p>
                ) : (
                  adminPendingGroups.map((group) => {
                    const groupKey = `pending-${group.player}`;
                    const expanded = expandedCompletionGroups.has(groupKey);
                    return (
                      <div key={groupKey} className="completion-group">
                        <div
                          className="completion-group-header"
                          onClick={(e) => {
                            if (
                              (e.target as HTMLElement).closest(
                                '.admin-completion-accept, .admin-completion-deny, .admin-completion-delete',
                              )
                            )
                              return;
                            setExpandedCompletionGroups((prev) => toggleSetItem(prev, groupKey));
                          }}
                        >
                          <div>
                            <div className="completion-group-title">{group.player}</div>
                            <div className="completion-group-count">
                              {group.count} pending completion{group.count === 1 ? '' : 's'}
                            </div>
                          </div>
                          <button type="button" className="level-btn completion-group-toggle">
                            {expanded ? 'Collapse' : 'Expand'}
                          </button>
                        </div>
                        <div className={cn('completion-group-panel', expanded && 'open')}>
                          {group.completions.map((item) => (
                            <div key={item.uid} className="completion-item">
                              <div className="completion-item-title">{item.levelName}</div>
                              <div className="completion-item-detail">
                                <strong>Completion:</strong>{' '}
                                <a href={item.completion} target="_blank" rel="noopener noreferrer">
                                  {item.completion}
                                </a>
                              </div>
                              <div className="completion-item-detail">
                                <strong>Raw footage:</strong>{' '}
                                {item.rawFootage ? (
                                  <a href={item.rawFootage} target="_blank" rel="noopener noreferrer">
                                    {item.rawFootage}
                                  </a>
                                ) : (
                                  '-'
                                )}
                              </div>
                              <div className="completion-item-detail">
                                <strong>Opinion:</strong> {item.opinion}
                              </div>
                              <div className="completion-item-actions">
                                <button
                                  type="button"
                                  className="level-btn admin-completion-accept"
                                  onClick={() => handleAdminReview(item.uid, 'accept')}
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  className="level-btn admin-completion-deny"
                                  onClick={() => handleAdminReview(item.uid, 'deny')}
                                >
                                  Denied
                                </button>
                                <button
                                  type="button"
                                  className="level-btn admin-completion-delete"
                                  onClick={() => handleAdminDeleteCompletion(item.uid, false)}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
                <h2 className="admin-section-title">Accepted</h2>
                {adminAcceptedGroups.length === 0 ? (
                  <p className="leaderboard-empty">No accepted completions.</p>
                ) : (
                  adminAcceptedGroups.map((group) => {
                    const groupKey = `accepted-${group.player}`;
                    const expanded = expandedCompletionGroups.has(groupKey);
                    return (
                      <div key={groupKey} className="completion-group">
                        <div
                          className="completion-group-header"
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest('.admin-completion-delete')) return;
                            setExpandedCompletionGroups((prev) => toggleSetItem(prev, groupKey));
                          }}
                        >
                          <div>
                            <div className="completion-group-title">{group.player}</div>
                            <div className="completion-group-count">
                              {group.count} accepted completion{group.count === 1 ? '' : 's'}
                            </div>
                          </div>
                          <button type="button" className="level-btn completion-group-toggle">
                            {expanded ? 'Collapse' : 'Expand'}
                          </button>
                        </div>
                        <div className={cn('completion-group-panel', expanded && 'open')}>
                          {group.completions.map((item) => (
                            <div key={item.uid} className="completion-item">
                              <div className="completion-item-title">{item.levelName}</div>
                              <div className="completion-item-detail">
                                <strong>Completion:</strong>{' '}
                                <a href={item.completion} target="_blank" rel="noopener noreferrer">
                                  {item.completion}
                                </a>
                              </div>
                              <div className="completion-item-detail">
                                <strong>Raw footage:</strong>{' '}
                                {item.rawFootage ? (
                                  <a href={item.rawFootage} target="_blank" rel="noopener noreferrer">
                                    {item.rawFootage}
                                  </a>
                                ) : (
                                  '-'
                                )}
                              </div>
                              <div className="completion-item-detail">
                                <strong>Opinion:</strong> {item.opinion}
                              </div>
                              <div className="completion-item-actions">
                                <button
                                  type="button"
                                  className="level-btn admin-completion-delete"
                                  onClick={() => handleAdminDeleteCompletion(item.uid, true)}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Roulette setup */}
      <section className={cn('roulette-view view', currentView === 'roulette-setup' && 'active')}>
        <div className="roulette-content">
          <h1 className="roulette-title">ABPLL Roulette</h1>
          <form
            className="roulette-setup-form"
            onSubmit={(e) => {
              e.preventDefault();
              const extreme = rouletteExtreme;
              const goal = extreme
                ? 100
                : Math.min(100, Math.max(0, parseInt(rouletteGoalInput, 10) || 0));
              const skips = extreme
                ? 0
                : Math.min(100, Math.max(0, parseInt(rouletteSkipsInput, 10) || 0));
              startRouletteGame(extreme, goal, skips);
            }}
          >
            <div className="roulette-field">
              <label className="roulette-extreme-toggle">
                <input
                  type="checkbox"
                  checked={rouletteExtreme}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRouletteExtreme(checked);
                    if (checked) {
                      setRouletteGoalInput('100');
                      setRouletteSkipsInput('0');
                    }
                  }}
                />
                Extreme mode
              </label>
              <p className="roulette-extreme-note">
                Reach 100%, no skips, at least +2% progress per level.
              </p>
            </div>
            <div className="roulette-field">
              <label htmlFor="roulette-goal">Goal (0 - 100)</label>
              <input
                id="roulette-goal"
                type="number"
                min={0}
                max={100}
                value={rouletteGoalInput}
                disabled={rouletteExtreme}
                required
                onChange={(e) => setRouletteGoalInput(e.target.value)}
              />
            </div>
            <div className="roulette-field">
              <label htmlFor="roulette-skips">Skips (0 - 100)</label>
              <input
                id="roulette-skips"
                type="number"
                min={0}
                max={100}
                value={rouletteSkipsInput}
                disabled={rouletteExtreme}
                required
                onChange={(e) => setRouletteSkipsInput(e.target.value)}
              />
            </div>
            <button type="submit" className="action-btn">
              Start
            </button>
            <button type="button" className="action-btn" onClick={() => setCurrentView('lobby')}>
              Back
            </button>
          </form>
        </div>
      </section>

      {/* Roulette game */}
      <section className={cn('roulette-view view', currentView === 'roulette-game' && 'active')}>
        <div className="roulette-content">
          <h1 className="roulette-title">ABPLL Roulette</h1>
          <div className={cn('roulette-mode-badge', !roulette.extremeMode && 'hidden')}>
            Extreme Mode
          </div>
          <div className="roulette-stats">
            <span className="roulette-stat">
              Progress: <span>{roulette.progress}</span>%
            </span>
            <span className="roulette-stat">
              Goal: <span>{roulette.goal}</span>%
            </span>
            <span className="roulette-stat">
              Skips left: <span>{roulette.skipsLeft}</span>
            </span>
          </div>
          {roulette.currentLevel && (
            <div className="roulette-level-wrap">
              <article className="level-card">
                <div className="level-card-main">
                  <img
                    src={roulette.currentLevel.image}
                    alt={roulette.currentLevel.imageAlt}
                    className="level-card-image"
                  />
                  <div className="level-card-info">
                    <h2 className="level-card-name">{roulette.currentLevel.name}</h2>
                    <div className="level-card-details">
                      <p>By: {roulette.currentLevel.by}</p>
                      <p>Id: {roulette.currentLevel.levelId}</p>
                      <p>Points: {roulette.currentLevel.points}</p>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          )}
          <div className="roulette-input-row">
            <label htmlFor="roulette-percent">Your progress on this level (%):</label>
            <input
              id="roulette-percent"
              type="number"
              min={getMinAllowedPercent(roulette.progress, roulette.extremeMode)}
              max={100}
              placeholder="0"
              value={roulettePercent}
              className={cn(rouletteInputError && 'invalid')}
              onChange={(e) => {
                setRoulettePercent(e.target.value);
                validateRoulettePercent(e.target.value, roulette.progress, roulette.extremeMode);
              }}
            />
          </div>
          <p className="roulette-input-error">{rouletteInputError}</p>
          <div className="roulette-actions">
            <button
              type="button"
              className="action-btn"
              disabled={rouletteNextDisabled}
              onClick={() => {
                if (!validateRoulettePercent(roulettePercent, roulette.progress, roulette.extremeMode))
                  return;
                const entered = parseInt(roulettePercent, 10);
                const newProgress = entered + 1;
                if (newProgress >= roulette.goal) {
                  setCurrentView('roulette-win');
                  return;
                }
                const nextLevel = pickRandomLevel(roulette.currentLevel?.id);
                setRoulette((prev) => ({ ...prev, progress: newProgress, currentLevel: nextLevel }));
                setRoulettePercent('');
                setRouletteInputError('');
                setRouletteNextDisabled(true);
              }}
            >
              Next level
            </button>
            <button
              type="button"
              className={cn('action-btn', roulette.extremeMode && 'hidden')}
              disabled={roulette.skipsLeft <= 0 || roulette.extremeMode}
              onClick={() => {
                if (roulette.skipsLeft <= 0) return;
                const nextLevel = pickRandomLevel(roulette.currentLevel?.id);
                setRoulette((prev) => ({
                  ...prev,
                  skipsLeft: prev.skipsLeft - 1,
                  currentLevel: nextLevel,
                }));
                setRoulettePercent('');
                setRouletteInputError('');
                setRouletteNextDisabled(true);
              }}
            >
              Skip
            </button>
            <button type="button" className="action-btn" onClick={() => setCurrentView('lobby')}>
              Exit
            </button>
          </div>
        </div>
      </section>

      {/* Roulette win */}
      <section className={cn('roulette-view view', currentView === 'roulette-win' && 'active')}>
        <div className="roulette-content">
          <div className="roulette-win">
            <h2>Congratulations! You beat the roulette!</h2>
            <button type="button" className="action-btn" onClick={() => setCurrentView('lobby')}>
              Back to lobby
            </button>
          </div>
        </div>
      </section>

      {/* Upload modal */}
      <div
        className={cn('upload-overlay', uploadOpen && 'open')}
        onClick={(e) => overlayClick(e, () => setUploadOpen(false))}
      >
        <div className="upload-modal">
          <h2 className="upload-modal-title">Upload Level Template</h2>
          <p className="upload-modal-note">Fill in all fields below to add your level to Uploaded levels.</p>
          <form className="upload-form" onSubmit={handleUploadSubmit}>
            <div className="upload-field">
              <label htmlFor="upload-name">Level name</label>
              <input id="upload-name" name="upload-name" type="text" placeholder="e.g. ABPLL blade" required />
            </div>
            <div className="upload-field">
              <label htmlFor="upload-photo">Photo</label>
              <input
                ref={uploadPhotoRef}
                id="upload-photo"
                type="file"
                accept="image/*"
                required
                onChange={() => {
                  const file = uploadPhotoRef.current?.files?.[0];
                  if (file) setUploadPreview(URL.createObjectURL(file));
                  else setUploadPreview('');
                }}
              />
              <img
                src={uploadPreview}
                alt="Preview"
                className={cn('upload-preview', uploadPreview && 'visible')}
              />
            </div>
            <div className="upload-field">
              <label htmlFor="upload-id">Level ID</label>
              <input id="upload-id" name="upload-id" type="text" placeholder="e.g. 147308748" required />
            </div>
            <div className="upload-field">
              <label htmlFor="upload-by">By</label>
              <input
                id="upload-by"
                name="upload-by"
                type="text"
                placeholder="Creator name"
                defaultValue={sessionUser ?? ''}
                required
              />
            </div>
            <div className="upload-field">
              <label htmlFor="upload-verified-by">Verified by</label>
              <input
                id="upload-verified-by"
                name="upload-verified-by"
                type="text"
                placeholder="Verifier name"
                required
              />
            </div>
            <div className="upload-field">
              <label htmlFor="upload-video">Verification video</label>
              <input
                id="upload-video"
                name="upload-video"
                type="url"
                placeholder="https://medal.tv/..."
                required
              />
            </div>
            <div className="upload-actions">
              <button type="submit" className="action-btn">
                Upload
              </button>
              <button type="button" className="action-btn" onClick={() => setUploadOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Accept position modal */}
      <div
        className={cn('upload-overlay', acceptOpen && 'open')}
        onClick={(e) => overlayClick(e, closePositionModal)}
      >
        <div className="upload-modal">
          <h2 className="upload-modal-title">
            {positionModalAction === 'accept-upload' ? 'Accept level' : 'Move level'}
          </h2>
          <p className="upload-modal-note">
            {positionModalAction === 'accept-upload'
              ? 'Choose the position on the Main List for this level.'
              : 'Choose the new position for this level.'}
          </p>
          <form
            className="upload-form"
            onSubmit={(e) => {
              e.preventDefault();
              confirmPositionModal();
            }}
          >
            <div className="upload-field">
              <label htmlFor="accept-position">Position</label>
              <input
                id="accept-position"
                type="number"
                min={1}
                max={positionMax}
                value={acceptPosition}
                required
                onChange={(e) => setAcceptPosition(parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <div className="upload-actions">
              <button type="submit" className="action-btn">
                Confirm
              </button>
              <button type="button" className="action-btn" onClick={closePositionModal}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Login modal */}
      <div
        className={cn('upload-overlay', loginOpen && 'open')}
        onClick={(e) => overlayClick(e, () => { setLoginOpen(false); setAuthError(''); })}
      >
        <div className="upload-modal">
          <h2 className="upload-modal-title">{authMode === 'login' ? 'Login' : 'Register'}</h2>
          <p className="login-note">Create an account or log in with your username and password.</p>
          <div className="auth-tabs">
            <button
              type="button"
              className={cn('auth-tab', authMode === 'login' && 'active')}
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
            >
              Login
            </button>
            <button
              type="button"
              className={cn('auth-tab', authMode === 'register' && 'active')}
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
            >
              Register
            </button>
          </div>
          <p className="auth-error">{authError}</p>
          <form
            className={cn('upload-form auth-panel', authMode !== 'login' && 'hidden')}
            onSubmit={handleLoginSubmit}
          >
            <div className="upload-field">
              <label htmlFor="login-username">Username</label>
              <input
                id="login-username"
                name="login-username"
                type="text"
                placeholder="Your username"
                required
                autoComplete="username"
              />
            </div>
            <div className="upload-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                name="login-password"
                type="password"
                placeholder="Your password"
                required
                autoComplete="current-password"
              />
            </div>
            <div className="upload-actions">
              <button type="submit" className="action-btn">
                Login
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={() => { setLoginOpen(false); setAuthError(''); }}
              >
                Cancel
              </button>
            </div>
          </form>
          <form
            className={cn('upload-form auth-panel', authMode !== 'register' && 'hidden')}
            onSubmit={handleRegisterSubmit}
          >
            <div className="upload-field">
              <label htmlFor="register-username">Username</label>
              <input
                id="register-username"
                name="register-username"
                type="text"
                placeholder="3-20 chars, letters/numbers/_"
                required
                autoComplete="username"
              />
            </div>
            <div className="upload-field">
              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                name="register-password"
                type="password"
                placeholder="At least 6 characters"
                required
                autoComplete="new-password"
              />
            </div>
            <div className="upload-field">
              <label htmlFor="register-password-confirm">Confirm password</label>
              <input
                id="register-password-confirm"
                name="register-password-confirm"
                type="password"
                placeholder="Repeat password"
                required
                autoComplete="new-password"
              />
            </div>
            <div className="upload-actions">
              <button type="submit" className="action-btn">
                Create account
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={() => { setLoginOpen(false); setAuthError(''); }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Completion modal */}
      <div
        className={cn('upload-overlay', completionOpen && 'open')}
        onClick={(e) => overlayClick(e, () => setCompletionOpen(false))}
      >
        <div className="upload-modal">
          <h2 className="upload-modal-title">Upload Completion</h2>
          <p className="upload-modal-note">
            Submit your completion for a level on the Main List. An admin will review it.
          </p>
          <form className="upload-form" onSubmit={handleCompletionSubmit}>
            <div className="upload-field">
              <label htmlFor="completion-level-name">Level name</label>
              <input
                id="completion-level-name"
                name="completion-level-name"
                type="text"
                list="completion-level-options"
                placeholder="e.g. ABPLL blade"
                required
              />
              <datalist id="completion-level-options">
                {rankedLevels.map((level) => (
                  <option key={level.uid} value={level.name} />
                ))}
              </datalist>
            </div>
            <div className="upload-field">
              <label htmlFor="completion-video">Completion</label>
              <input
                id="completion-video"
                name="completion-video"
                type="url"
                placeholder="https://medal.tv/..."
                required
              />
            </div>
            <div className="upload-field">
              <label htmlFor="completion-raw-footage">Raw footage (optional)</label>
              <input
                id="completion-raw-footage"
                name="completion-raw-footage"
                type="url"
                placeholder="https://..."
              />
            </div>
            <div className="upload-field">
              <label htmlFor="completion-opinion">Opinion</label>
              <textarea
                id="completion-opinion"
                name="completion-opinion"
                placeholder="Your opinion about this level..."
                required
                maxLength={1000}
              />
            </div>
            <div className="upload-actions">
              <button type="submit" className="action-btn">
                Submit
              </button>
              <button type="button" className="action-btn" onClick={() => setCompletionOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
