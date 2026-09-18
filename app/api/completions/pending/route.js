export const runtime = 'nodejs';
import { readData } from '@/lib/server/data.js';
import { requireAdmin, handleAuthError } from '@/lib/server/auth.js';
import {
  getPendingCompletions,
  groupCompletionsByPlayer
} from '@/lib/server/completions.js';

export async function GET(request) {
  try {
    requireAdmin(request);
    const data = readData();
    return Response.json({ groups: groupCompletionsByPlayer(getPendingCompletions(data)) });
  } catch (error) {
    return handleAuthError(error);
  }
}

