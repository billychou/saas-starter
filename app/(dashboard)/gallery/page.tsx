import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { CREDIT_PACKS, getTeamCreditBalance } from '@/lib/ai/credits';
import { GalleryClient } from './gallery-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Gallery');
  return { title: t('title') };
}

export default async function GalleryPage() {
  const user = await getUser();
  if (!user) redirect('/sign-in');

  const team = await getTeamForUser();
  if (!team) redirect('/dashboard');

  const creditBalance = await getTeamCreditBalance(team.id);
  const isTeamOwner = team.teamMembers.some(
    (m) => m.userId === user.id && m.role === 'owner'
  );

  return (
    <GalleryClient
      currentUserId={user.id}
      isTeamOwner={isTeamOwner}
      initialCreditBalance={creditBalance}
      creditPacks={CREDIT_PACKS}
    />
  );
}
