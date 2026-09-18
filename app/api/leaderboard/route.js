export const runtime = 'nodejs';
import { getLeaderboardEntries } from '@/lib/server/leaderboard.js';

export async function GET() {
  return Response.json(getLeaderboardEntries());
}

