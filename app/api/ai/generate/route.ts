import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import {
  GenerationValidationError,
  createGeneration
} from '@/lib/ai/generations';
import { InsufficientCreditsError, getTeamCreditBalance } from '@/lib/ai/credits';

const generateSchema = z.object({
  aiModelDbId: z.number().int().positive(),
  prompt: z.string().min(1).max(2000),
  negativePrompt: z.string().max(1000).optional().nullable(),
  size: z.string().max(20).optional().nullable(),
  imageCount: z.number().int().min(1).max(4).optional()
});

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const team = await getTeamForUser();
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid request' },
      { status: 400 }
    );
  }

  const { aiModelDbId, prompt, negativePrompt, size, imageCount } = parsed.data;

  try {
    const generation = await createGeneration({
      teamId: team.id,
      userId: user.id,
      aiModelDbId,
      prompt,
      negativePrompt,
      size,
      imageCount,
      ipAddress: request.headers.get('x-forwarded-for')
    });
    return NextResponse.json({
      generation,
      creditBalance: await getTeamCreditBalance(team.id)
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: 'insufficient_credits',
          required: error.required,
          available: error.available
        },
        { status: 402 }
      );
    }
    if (error instanceof GenerationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Generation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 502 }
    );
  }
}
