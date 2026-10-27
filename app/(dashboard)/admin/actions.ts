'use server';

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { aiModels, generations } from '@/lib/db/schema';
import { isAdminUser } from '@/lib/auth/admin';
import { validatedActionWithUser } from '@/lib/auth/middleware';

const modelSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().min(1).max(100),
  provider: z.string().min(1).max(50),
  modelId: z.string().min(1).max(100),
  apiBase: z.string().max(500).optional().or(z.literal('')),
  sizes: z.string().min(1),
  maxImages: z.coerce.number().int().min(1).max(4),
  creditCost: z.coerce.number().int().min(0).max(10000),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  description: z.string().max(2000).optional().or(z.literal(''))
});

function parseSizes(raw: string): string[] | null {
  const sizes = raw
    .split(/[,\n]/)
    .map((s) => s.trim().replace(/×/g, '*'))
    .filter(Boolean);
  if (sizes.length === 0) return null;
  if (!sizes.every((s) => /^\d{2,5}\*\d{2,5}$/.test(s))) return null;
  return Array.from(new Set(sizes));
}

export const saveModelAction = validatedActionWithUser(
  modelSchema,
  async (data, formData, user) => {
    if (!isAdminUser(user)) {
      return { error: 'Forbidden: admin access required.' };
    }

    const sizes = parseSizes(data.sizes);
    if (!sizes) {
      return {
        error:
          'Invalid sizes. Use comma-separated WxH values, e.g. 1024*1024, 720*1280.'
      };
    }

    const enabled = formData.get('enabled') === 'on';
    const isDefault = formData.get('isDefault') === 'on';
    // Blank API key on edit means "keep existing"; a dedicated clear flag wipes it.
    const apiKeyRaw = String(formData.get('apiKey') ?? '');
    const clearApiKey = formData.get('clearApiKey') === 'on';

    if (isDefault && !enabled) {
      return { error: 'The default model must be enabled.' };
    }

    if (isDefault) {
      await db.update(aiModels).set({ isDefault: false });
    }

    const values = {
      name: data.name,
      provider: data.provider,
      modelId: data.modelId,
      apiBase: data.apiBase || null,
      sizes,
      maxImages: data.maxImages,
      creditCost: data.creditCost,
      sortOrder: data.sortOrder,
      description: data.description || null,
      enabled,
      isDefault
    };

    if (data.id) {
      const [existing] = await db
        .select()
        .from(aiModels)
        .where(eq(aiModels.id, data.id))
        .limit(1);
      if (!existing) {
        return { error: 'Model not found.' };
      }
      const updateValues: Partial<typeof values> & {
        apiKey?: string | null;
        updatedAt?: Date;
      } = { ...values, updatedAt: new Date() };
      if (clearApiKey) {
        updateValues.apiKey = null;
      } else if (apiKeyRaw) {
        updateValues.apiKey = apiKeyRaw;
      }
      await db.update(aiModels).set(updateValues).where(eq(aiModels.id, data.id));
    } else {
      await db.insert(aiModels).values({
        ...values,
        apiKey: apiKeyRaw || null
      });
    }

    revalidatePath('/admin/models');
    revalidatePath('/studio');
    return { success: 'Model saved.' };
  }
);

const deleteModelSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const deleteModelAction = validatedActionWithUser(
  deleteModelSchema,
  async (data, _, user) => {
    if (!isAdminUser(user)) {
      return { error: 'Forbidden: admin access required.' };
    }

    // Keep generation history intact: drop the FK reference, snapshots remain.
    await db
      .update(generations)
      .set({ aiModelId: null })
      .where(eq(generations.aiModelId, data.id));
    await db.delete(aiModels).where(eq(aiModels.id, data.id));

    revalidatePath('/admin/models');
    revalidatePath('/studio');
    return { success: 'Model deleted.' };
  }
);
