import { stripe } from '../payments/stripe';
import { db } from './drizzle';
import {
  users,
  teams,
  teamMembers,
  aiModels,
  creditTransactions,
} from './schema';
import { hashPassword } from '@/lib/auth/session';
import { SIGNUP_BONUS_CREDITS } from '@/lib/ai/credits';

async function seedAiModels() {
  console.log('Creating default AI models...');

  await db.insert(aiModels).values([
    {
      name: 'Wanx 2.1 Turbo',
      provider: 'bailian',
      modelId: 'wanx2.1-t2i-turbo',
      sizes: ['1024*1024', '720*1280', '1280*720'],
      maxImages: 4,
      creditCost: 1,
      enabled: true,
      isDefault: true,
      description: 'Fast text-to-image generation via Alibaba Cloud Bailian.',
      sortOrder: 0,
    },
    {
      name: 'Wanx 2.1 Plus',
      provider: 'bailian',
      modelId: 'wanx2.1-t2i-plus',
      sizes: ['1024*1024', '720*1280', '1280*720'],
      maxImages: 4,
      creditCost: 4,
      enabled: true,
      isDefault: false,
      description: 'Higher-quality text-to-image generation, slower than Turbo.',
      sortOrder: 1,
    },
    {
      name: 'FLUX.1 Schnell',
      provider: 'bailian',
      modelId: 'flux-schnell',
      sizes: ['1024*1024', '768*1344', '1344*768', '864*1152', '1152*864'],
      maxImages: 4,
      creditCost: 2,
      enabled: true,
      isDefault: false,
      description: 'Black Forest Labs FLUX.1 schnell hosted on Bailian.',
      sortOrder: 2,
    },
  ]);

  console.log('Default AI models created.');
}

async function createStripeProducts() {
  console.log('Creating Stripe products and prices...');

  const baseProduct = await stripe.products.create({
    name: 'Base',
    description: 'Base subscription plan',
  });

  await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 800, // $8 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  const plusProduct = await stripe.products.create({
    name: 'Plus',
    description: 'Plus subscription plan',
  });

  await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 1200, // $12 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  console.log('Stripe products and prices created successfully.');
}

async function seed() {
  const email = 'test@test.com';
  const password = 'admin123';
  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values([
      {
        email: email,
        passwordHash: passwordHash,
        role: "owner",
      },
    ])
    .returning();

  console.log('Initial user created.');

  const [team] = await db
    .insert(teams)
    .values({
      name: 'Test Team',
      creditBalance: SIGNUP_BONUS_CREDITS,
    })
    .returning();

  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: user.id,
    role: 'owner',
  });

  await db.insert(creditTransactions).values({
    teamId: team.id,
    userId: user.id,
    amount: SIGNUP_BONUS_CREDITS,
    reason: 'signup_bonus',
  });

  await seedAiModels();
  await createStripeProducts();
}

seed()
  .catch((error) => {
    console.error('Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Seed process finished. Exiting...');
    process.exit(0);
  });
