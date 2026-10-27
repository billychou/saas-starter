import { NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getEnabledModels } from '@/lib/ai/generations';
import { CREDIT_PACKS, getTeamCreditBalance } from '@/lib/ai/credits';

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const team = await getTeamForUser();
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 400 });
  }

  const models = await getEnabledModels();
  const creditBalance = await getTeamCreditBalance(team.id);

  return NextResponse.json({
    models: models.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      modelId: m.modelId,
      sizes: m.sizes,
      maxImages: m.maxImages,
      creditCost: m.creditCost,
      isDefault: m.isDefault,
      description: m.description
    })),
    creditBalance,
    creditPacks: CREDIT_PACKS
  });
}
