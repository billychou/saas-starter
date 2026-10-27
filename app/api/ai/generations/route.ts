import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import {
  listTeamGenerations,
  syncUnfinishedGenerations
} from '@/lib/ai/generations';

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const team = await getTeamForUser();
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const scope = searchParams.get('scope') === 'all' ? 'all' : 'mine';
  const limit = Math.min(Number(searchParams.get('limit') ?? 30) || 30, 100);
  const offset = Math.max(Number(searchParams.get('offset') ?? 0) || 0, 0);

  // Refresh provider task states before returning the list.
  await syncUnfinishedGenerations(team.id);

  const items = await listTeamGenerations({
    teamId: team.id,
    scope,
    userId: user.id,
    limit,
    offset
  });

  return NextResponse.json({ items });
}
