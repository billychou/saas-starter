import fs from 'fs/promises';
import path from 'path';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  ActivityType,
  activityLogs,
  aiModels,
  creditTransactions,
  generationImages,
  generations,
  users,
  type AiModel,
  type Generation,
  type GenerationImage,
} from '@/lib/db/schema';
import { createTextToImageTask, fetchTaskResult } from './bailian';
import { addCredits, deductCredits } from './credits';

const GENERATED_DIR = path.join(process.cwd(), 'public', 'generated');

export interface GenerationWithDetails extends Generation {
  images: GenerationImage[];
  user: { id: number; name: string | null; email: string };
}

export interface CreateGenerationInput {
  teamId: number;
  userId: number;
  aiModelDbId: number;
  prompt: string;
  negativePrompt?: string | null;
  size?: string | null;
  imageCount?: number;
  ipAddress?: string | null;
}

export class GenerationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GenerationValidationError';
  }
}

function modelCredentials(model: Pick<AiModel, 'apiKey' | 'apiBase'>) {
  return { apiKey: model.apiKey ?? '', apiBase: model.apiBase };
}

async function downloadImage(generationId: number, index: number, url: string): Promise<string> {
  await fs.mkdir(GENERATED_DIR, { recursive: true });
  let ext = 'png';
  const match = url.split('?')[0].match(/\.(\w+)$/);
  if (match && ['png', 'jpg', 'jpeg', 'webp'].includes(match[1].toLowerCase())) {
    ext = match[1].toLowerCase();
  }
  const fileName = `gen-${generationId}-${index}.${ext}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download image: HTTP ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(path.join(GENERATED_DIR, fileName), buffer);
  return `/generated/${fileName}`;
}

export async function getEnabledModels(): Promise<AiModel[]> {
  return db
    .select()
    .from(aiModels)
    .where(eq(aiModels.enabled, true))
    .orderBy(aiModels.sortOrder);
}

export async function createGeneration(input: CreateGenerationInput) {
  const { teamId, userId, aiModelDbId, prompt, negativePrompt, size, ipAddress } = input;
  const imageCount = Math.max(1, Math.min(4, input.imageCount ?? 1));

  const [model] = await db
    .select()
    .from(aiModels)
    .where(and(eq(aiModels.id, aiModelDbId), eq(aiModels.enabled, true)));

  if (!model) {
    throw new GenerationValidationError('Selected model is not available');
  }
  if (imageCount > model.maxImages) {
    throw new GenerationValidationError(
      `Model allows at most ${model.maxImages} images per generation`
    );
  }
  if (size && !model.sizes.includes(size)) {
    throw new GenerationValidationError('Selected size is not supported by this model');
  }
  const finalSize = size ?? model.sizes[0];
  const cost = model.creditCost * imageCount;

  const [generation] = await db
    .insert(generations)
    .values({
      teamId,
      userId,
      aiModelId: model.id,
      modelName: model.name,
      modelId: model.modelId,
      prompt,
      negativePrompt: negativePrompt || null,
      size: finalSize,
      imageCount,
      status: 'pending',
      creditsUsed: cost,
    })
    .returning();

  // Deduct credits before hitting the provider; refund on submission failure.
  await deductCredits({
    teamId,
    userId,
    amount: cost,
    reason: 'generation',
    generationId: generation.id,
  });

  try {
    const taskId = await createTextToImageTask(modelCredentials(model), {
      modelId: model.modelId,
      prompt,
      negativePrompt,
      size: finalSize,
      n: imageCount,
    });
    const [updated] = await db
      .update(generations)
      .set({ taskRef: taskId, status: 'running', updatedAt: new Date() })
      .where(eq(generations.id, generation.id))
      .returning();

    await db.insert(activityLogs).values({
      teamId,
      userId,
      action: ActivityType.IMAGE_GENERATED,
      ipAddress: ipAddress ?? null,
    });

    return updated;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await db
      .update(generations)
      .set({ status: 'failed', error: message, updatedAt: new Date() })
      .where(eq(generations.id, generation.id));
    await addCredits({ teamId, userId, amount: cost, reason: 'refund', generationId: generation.id });
    throw error;
  }
}

/**
 * Poll the provider for an unfinished generation and persist the outcome:
 * download images to public/generated on success, refund credits on failure.
 */
export async function syncGeneration(generation: Generation): Promise<Generation> {
  if (generation.status !== 'pending' && generation.status !== 'running') {
    return generation;
  }
  if (!generation.taskRef) {
    return generation;
  }

  // Prefer the (possibly customized) credentials of the source model;
  // fall back to env-level config if the model was deleted.
  const [model] = generation.aiModelId
    ? await db.select().from(aiModels).where(eq(aiModels.id, generation.aiModelId))
    : [];

  let result;
  try {
    result = await fetchTaskResult(modelCredentials(model ?? { apiKey: null, apiBase: null }), generation.taskRef);
  } catch (error) {
    // Transient polling errors keep the generation in its current state.
    console.error(`Failed to poll task ${generation.taskRef}:`, error);
    return generation;
  }

  if (result.status === 'SUCCEEDED') {
    const images: { generationId: number; url: string; localPath: string | null }[] = [];
    for (let i = 0; i < result.urls.length; i++) {
      const url = result.urls[i];
      let localPath: string | null = null;
      try {
        localPath = await downloadImage(generation.id, i, url);
      } catch (error) {
        console.error(`Failed to download image for generation ${generation.id}:`, error);
      }
      images.push({ generationId: generation.id, url, localPath });
    }
    await db.insert(generationImages).values(images);
    const [updated] = await db
      .update(generations)
      .set({ status: 'succeeded', error: null, updatedAt: new Date() })
      .where(eq(generations.id, generation.id))
      .returning();
    return updated;
  }

  if (result.status === 'FAILED') {
    const [updated] = await db
      .update(generations)
      .set({ status: 'failed', error: result.error ?? 'Generation failed', updatedAt: new Date() })
      .where(eq(generations.id, generation.id))
      .returning();
    if (updated.creditsUsed > 0) {
      await addCredits({
        teamId: generation.teamId,
        userId: generation.userId,
        amount: updated.creditsUsed,
        reason: 'refund',
        generationId: generation.id,
      });
    }
    return updated;
  }

  // Still PENDING/RUNNING
  const nextStatus = result.status === 'RUNNING' ? 'running' : generation.status;
  if (nextStatus !== generation.status) {
    const [updated] = await db
      .update(generations)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(generations.id, generation.id))
      .returning();
    return updated;
  }
  return generation;
}

export async function syncUnfinishedGenerations(teamId: number): Promise<void> {
  const pending = await db
    .select()
    .from(generations)
    .where(
      and(
        eq(generations.teamId, teamId),
        inArray(generations.status, ['pending', 'running'])
      )
    );
  await Promise.all(pending.map(syncGeneration));
}

export async function listTeamGenerations(options: {
  teamId: number;
  scope: 'mine' | 'all';
  userId: number;
  limit?: number;
  offset?: number;
}): Promise<GenerationWithDetails[]> {
  const { teamId, scope, userId, limit = 30, offset = 0 } = options;

  const rows = await db
    .select({
      generation: generations,
      user: { id: users.id, name: users.name, email: users.email },
    })
    .from(generations)
    .innerJoin(users, eq(generations.userId, users.id))
    .where(
      scope === 'mine'
        ? and(eq(generations.teamId, teamId), eq(generations.userId, userId))
        : eq(generations.teamId, teamId)
    )
    .orderBy(desc(generations.createdAt))
    .limit(limit)
    .offset(offset);

  if (rows.length === 0) return [];

  const images = await db
    .select()
    .from(generationImages)
    .where(inArray(generationImages.generationId, rows.map((r) => r.generation.id)));

  const imagesByGeneration = new Map<number, GenerationImage[]>();
  for (const image of images) {
    const list = imagesByGeneration.get(image.generationId) ?? [];
    list.push(image);
    imagesByGeneration.set(image.generationId, list);
  }

  return rows.map((row) => ({
    ...row.generation,
    images: imagesByGeneration.get(row.generation.id) ?? [],
    user: row.user,
  }));
}

export async function getGenerationWithImages(
  id: number
): Promise<(Generation & { images: GenerationImage[] }) | undefined> {
  const [generation] = await db
    .select()
    .from(generations)
    .where(eq(generations.id, id));
  if (!generation) return undefined;
  const images = await db
    .select()
    .from(generationImages)
    .where(eq(generationImages.generationId, id));
  return { ...generation, images };
}

export async function deleteGeneration(generation: Generation): Promise<void> {
  const images = await db
    .select()
    .from(generationImages)
    .where(eq(generationImages.generationId, generation.id));

  for (const image of images) {
    if (image.localPath) {
      const filePath = path.join(process.cwd(), 'public', image.localPath);
      await fs.unlink(filePath).catch(() => {});
    }
  }

  // Keep the credit ledger intact; just detach it from the generation.
  await db
    .update(creditTransactions)
    .set({ generationId: null })
    .where(eq(creditTransactions.generationId, generation.id));

  // Cascade deletes generation_images rows.
  await db.delete(generations).where(eq(generations.id, generation.id));
}
