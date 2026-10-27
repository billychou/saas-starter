import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { ImageIcon } from 'lucide-react';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getEnabledModels } from '@/lib/ai/generations';
import { CREDIT_PACKS, getTeamCreditBalance } from '@/lib/ai/credits';
import { StudioClient } from './studio-client';
import type { AiModelInfo } from '@/components/ai/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Studio');
  return { title: t('title') };
}

export default async function StudioPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations('Studio');
  const params = await searchParams;
  const user = await getUser();
  if (!user) redirect('/sign-in');

  const str = (v: string | string[] | undefined) =>
    typeof v === 'string' ? v : undefined;
  const prefill = {
    prompt: str(params.prompt),
    negativePrompt: str(params.negative),
    size: str(params.size),
    imageCount: str(params.count) ? Number(str(params.count)) : undefined,
    modelId: str(params.model)
  };

  const team = await getTeamForUser();
  if (!team) redirect('/dashboard');

  const models = await getEnabledModels();
  const creditBalance = await getTeamCreditBalance(team.id);

  if (models.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-4 py-24 text-center">
        <ImageIcon className="text-muted-foreground size-10" />
        <h1 className="text-foreground text-xl font-semibold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('noModels')}</p>
      </div>
    );
  }

  const initialModels: AiModelInfo[] = models.map((m) => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    modelId: m.modelId,
    sizes: m.sizes,
    maxImages: m.maxImages,
    creditCost: m.creditCost,
    isDefault: m.isDefault,
    description: m.description
  }));

  return (
    <StudioClient
      initialModels={initialModels}
      initialCreditBalance={creditBalance}
      creditPacks={CREDIT_PACKS}
      currentUserId={user.id}
      prefill={prefill}
    />
  );
}
