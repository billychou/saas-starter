'use server';

import { redirect } from 'next/navigation';
import {
  createCheckoutSession,
  createCreditPackCheckoutSession,
  createCustomerPortalSession
} from './stripe';
import { withTeam } from '@/lib/auth/middleware';
import { getUser } from '@/lib/db/queries';
import { getCreditPack } from '@/lib/ai/credits';

export const checkoutAction = withTeam(async (formData, team) => {
  const priceId = formData.get('priceId') as string;
  await createCheckoutSession({ team: team, priceId });
});

export const creditPackCheckoutAction = withTeam(async (formData, team) => {
  const user = await getUser();
  const packId = formData.get('packId') as string;
  const pack = getCreditPack(packId);
  if (!user || !pack) {
    throw new Error('Invalid credit pack');
  }
  await createCreditPackCheckoutSession({ team, user, pack });
});

export const customerPortalAction = withTeam(async (_, team) => {
  const portalSession = await createCustomerPortalSession(team);
  redirect(portalSession.url);
});
