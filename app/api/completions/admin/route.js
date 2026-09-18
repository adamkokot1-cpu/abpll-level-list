import { readData } from '@/lib/server/data.js';
import { requireAdmin, handleAuthError } from '@/lib/server/auth.js';
import {
  getPendingCompletions,
  getAcceptedCompletionsForAdmin,
  groupCompletionsByPlayer
} from '@/lib/server/completions.js';

export async function GET(request) {
  try {
    requireAdmin(request);
    const data = readData();

    return Response.json({
      pendingGroups: groupCompletionsByPlayer(getPendingCompletions(data)),
      acceptedGroups: groupCompletionsByPlayer(getAcceptedCompletionsForAdmin(data))
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
