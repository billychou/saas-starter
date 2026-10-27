import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import {
  deleteGeneration,
  getGenerationWithImages,
  syncGeneration
} from '@/lib/ai/generations';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const team = await getTeamForUser();
  const { id } = await context.params;
  const generationId = Number(id);
  if (!team || !Number.isInteger(generationId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const generation = await getGenerationWithImages(generationId);
  if (!generation || generation.teamId !== team.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const synced = await syncGeneration(generation);
  const fresh = await getGenerationWithImages(generationId);

  return NextResponse.json({
    generation: { ...fresh!, status: synced.status, error: synced.error }
  });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const team = await getTeamForUser();
  const { id } = await context.params;
  const generationId = Number(id);
  if (!team || !Number.isInteger(generationId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const generation = await getGenerationWithImages(generationId);
  if (!generation || generation.teamId !== team.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isOwner = team.teamMembers.some(
    (m) => m.userId === user.id && m.role === 'owner'
  );
  if (generation.userId !== user.id && !isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await deleteGeneration(generation);
  return NextResponse.json({ success: true });
}
