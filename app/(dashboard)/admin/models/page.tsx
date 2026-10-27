import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { asc } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { aiModels } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { isAdminUser } from '@/lib/auth/admin';
import { AdminModelsClient } from './admin-models-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Admin');
  return { title: t('modelsTitle') };
}

export default async function AdminModelsPage() {
  const user = await getUser();
  if (!user) redirect('/sign-in');
  if (!isAdminUser(user)) redirect('/dashboard');

  const models = await db
    .select({
      id: aiModels.id,
      name: aiModels.name,
      provider: aiModels.provider,
      modelId: aiModels.modelId,
      hasCustomKey: aiModels.apiKey,
      apiBase: aiModels.apiBase,
      sizes: aiModels.sizes,
      maxImages: aiModels.maxImages,
      creditCost: aiModels.creditCost,
      enabled: aiModels.enabled,
      isDefault: aiModels.isDefault,
      description: aiModels.description,
      sortOrder: aiModels.sortOrder
    })
    .from(aiModels)
    .orderBy(asc(aiModels.sortOrder), asc(aiModels.id));

  // Never ship raw keys to the client; expose presence only.
  const safeModels = models.map(({ hasCustomKey, ...rest }) => ({
    ...rest,
    hasCustomKey: Boolean(hasCustomKey)
  }));

  return <AdminModelsClient models={safeModels} />;
}
