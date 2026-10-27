import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { creditTransactions, teams } from '@/lib/db/schema';
import type { CreditReason } from '@/lib/db/schema';

/** Bonus credits granted to each new team on sign-up. */
export const SIGNUP_BONUS_CREDITS = Number(process.env.SIGNUP_BONUS_CREDITS ?? 100);

export interface CreditPack {
  id: string;
  credits: number;
  amountUsd: number;
}

/** One-time credit packs purchasable via Stripe Checkout. */
export const CREDIT_PACKS: CreditPack[] = [
  { id: 'starter', credits: 500, amountUsd: 9 },
  { id: 'creator', credits: 1500, amountUsd: 24 },
  { id: 'studio', credits: 5000, amountUsd: 69 },
];

export function getCreditPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

export class InsufficientCreditsError extends Error {
  constructor(public required: number, public available: number) {
    super(`Insufficient credits: required ${required}, available ${available}`);
    this.name = 'InsufficientCreditsError';
  }
}

export interface CreditChangeInput {
  teamId: number;
  userId?: number | null;
  amount: number; // positive: grant, negative: deduct
  reason: CreditReason;
  generationId?: number | null;
  stripeSessionId?: string | null;
}

/**
 * Atomically adjust a team's credit balance inside a transaction with
 * row-level locking (SELECT ... FOR UPDATE) so concurrent generations
 * cannot overdraw the balance.
 */
async function changeCredits(input: CreditChangeInput) {
  return db.transaction(async (tx) => {
    const [team] = await tx
      .select()
      .from(teams)
      .where(eq(teams.id, input.teamId))
      .for('update');

    if (!team) {
      throw new Error('Team not found');
    }

    const newBalance = team.creditBalance + input.amount;
    if (newBalance < 0) {
      throw new InsufficientCreditsError(-input.amount, team.creditBalance);
    }

    const [updated] = await tx
      .update(teams)
      .set({ creditBalance: newBalance, updatedAt: new Date() })
      .where(eq(teams.id, input.teamId))
      .returning({ id: teams.id, creditBalance: teams.creditBalance });

    await tx.insert(creditTransactions).values({
      teamId: input.teamId,
      userId: input.userId ?? null,
      amount: input.amount,
      reason: input.reason,
      generationId: input.generationId ?? null,
      stripeSessionId: input.stripeSessionId ?? null,
    });

    return updated;
  });
}

export function deductCredits(
  input: Omit<CreditChangeInput, 'amount'> & { amount: number }
) {
  const amount = Math.abs(input.amount);
  return changeCredits({ ...input, amount: -amount });
}

export function addCredits(
  input: Omit<CreditChangeInput, 'amount'> & { amount: number }
) {
  const amount = Math.abs(input.amount);
  return changeCredits({ ...input, amount });
}

export async function getTeamCreditBalance(teamId: number): Promise<number> {
  const [team] = await db
    .select({ creditBalance: teams.creditBalance })
    .from(teams)
    .where(eq(teams.id, teamId));
  return team?.creditBalance ?? 0;
}
