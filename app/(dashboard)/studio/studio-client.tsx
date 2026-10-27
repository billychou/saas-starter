'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import { Coins, ImageIcon, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { GenerationCard, GenerationCardSkeleton } from '@/components/ai/generation-card';
import { BuyCreditsDialog } from '@/components/ai/buy-credits-dialog';
import type { AiModelInfo, CreditPackInfo, GenerationInfo } from '@/components/ai/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ModelsResponse {
  models: AiModelInfo[];
  creditBalance: number;
  creditPacks: CreditPackInfo[];
}

export interface StudioPrefill {
  prompt?: string;
  negativePrompt?: string;
  size?: string;
  imageCount?: number;
  modelId?: string; // provider model id (e.g. wanx2.1-t2i-turbo)
}

export function StudioClient({
  initialModels,
  initialCreditBalance,
  creditPacks,
  currentUserId,
  prefill
}: {
  initialModels: AiModelInfo[];
  initialCreditBalance: number;
  creditPacks: CreditPackInfo[];
  currentUserId: number;
  prefill?: StudioPrefill;
}) {
  const t = useTranslations('Studio');

  const defaultModel =
    (prefill?.modelId
      ? initialModels.find((m) => m.modelId === prefill.modelId)
      : undefined) ??
    initialModels.find((m) => m.isDefault) ??
    initialModels[0];

  const [modelId, setModelId] = useState<number | null>(defaultModel?.id ?? null);
  const [prompt, setPrompt] = useState(prefill?.prompt ?? '');
  const [negativePrompt, setNegativePrompt] = useState(prefill?.negativePrompt ?? '');
  const [size, setSize] = useState<string>(
    prefill?.size && defaultModel?.sizes.includes(prefill.size)
      ? prefill.size
      : (defaultModel?.sizes[0] ?? '1024*1024')
  );
  const [imageCount, setImageCount] = useState(
    Math.min(Math.max(prefill?.imageCount ?? 1, 1), defaultModel?.maxImages ?? 4)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const formTopRef = useRef<HTMLDivElement>(null);

  const { data: modelsData, mutate: mutateModels } = useSWR<ModelsResponse>(
    '/api/ai/models',
    fetcher,
    {
      fallbackData: {
        models: initialModels,
        creditBalance: initialCreditBalance,
        creditPacks
      }
    }
  );

  const models = modelsData?.models ?? initialModels;
  const creditBalance = modelsData?.creditBalance ?? initialCreditBalance;
  const packs = modelsData?.creditPacks ?? creditPacks;

  const selectedModel = useMemo(
    () => models.find((m) => m.id === modelId) ?? models[0],
    [models, modelId]
  );

  const { data: generationsData, mutate: mutateGenerations } = useSWR<{
    items: GenerationInfo[];
  }>('/api/ai/generations?scope=mine&limit=30', fetcher, {
    refreshInterval: (latest) =>
      latest?.items.some(
        (g) => g.status === 'pending' || g.status === 'running'
      )
        ? 4000
        : 0
  });

  const generations = generationsData?.items ?? [];

  const cost = selectedModel ? selectedModel.creditCost * imageCount : 0;
  const insufficient = cost > creditBalance;
  const canSubmit =
    !!selectedModel && prompt.trim().length > 0 && !submitting && !insufficient;

  function selectModel(id: number) {
    const model = models.find((m) => m.id === id);
    setModelId(id);
    if (model) {
      setSize(model.sizes[0]);
      setImageCount(Math.min(imageCount, model.maxImages));
    }
  }

  async function handleGenerate() {
    if (!selectedModel || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiModelDbId: selectedModel.id,
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim() || null,
          size,
          imageCount
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === 'insufficient_credits'
            ? t('insufficientCredits', {
                required: data.required ?? cost,
                available: data.available ?? creditBalance
              })
            : (data.error ?? t('generateFailed'))
        );
        return;
      }
      setPrompt('');
      setNegativePrompt('');
      mutateGenerations();
      mutateModels();
    } catch {
      setError(t('generateFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  const handleDelete = useCallback(
    async (id: number) => {
      setDeletingId(id);
      try {
        await fetch(`/api/ai/generations/${id}`, { method: 'DELETE' });
        mutateGenerations();
      } finally {
        setDeletingId(null);
      }
    },
    [mutateGenerations]
  );

  function handleRegenerate(generation: GenerationInfo) {
    const model =
      models.find((m) => m.id === generation.aiModelId) ??
      models.find((m) => m.modelId === generation.modelId);
    if (model) selectModel(model.id);
    setPrompt(generation.prompt);
    setNegativePrompt(generation.negativePrompt ?? '');
    if (model?.sizes.includes(generation.size)) setSize(generation.size);
    setImageCount(generation.imageCount);
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[360px_1fr] lg:px-8">
      {/* Left: parameter panel */}
      <div ref={formTopRef} className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
        <div className="bg-card rounded-2xl border p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="text-brand size-4" />
              <span className="text-foreground text-sm font-semibold">
                {creditBalance}
              </span>
              <span className="text-muted-foreground text-xs">
                {t('creditsAvailable')}
              </span>
            </div>
            <BuyCreditsDialog packs={packs} />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>{t('model')}</Label>
              <Select
                value={selectedModel ? String(selectedModel.id) : undefined}
                onValueChange={(v) => selectModel(Number(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectModel')} />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={String(model.id)}>
                      <span className="flex items-center gap-2">
                        {model.name}
                        <span className="text-muted-foreground text-xs">
                          {t('perImage', { count: model.creditCost })}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedModel?.description && (
                <p className="text-muted-foreground text-xs">
                  {selectedModel.description}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="prompt">{t('prompt')}</Label>
              <Textarea
                id="prompt"
                rows={4}
                maxLength={2000}
                placeholder={t('promptPlaceholder')}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="negative-prompt">{t('negativePrompt')}</Label>
              <Textarea
                id="negative-prompt"
                rows={2}
                maxLength={1000}
                placeholder={t('negativePromptPlaceholder')}
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t('size')}</Label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedModel?.sizes ?? []).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace('*', '×')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t('imageCount')}</Label>
                <div className="flex gap-1.5">
                  {Array.from({
                    length: Math.min(4, selectedModel?.maxImages ?? 4)
                  }).map((_, i) => (
                    <Button
                      key={i}
                      type="button"
                      variant={imageCount === i + 1 ? 'default' : 'outline'}
                      size="sm"
                      className={
                        imageCount === i + 1
                          ? 'bg-brand text-white hover:bg-brand/90 w-9 rounded-lg'
                          : 'w-9 rounded-lg'
                      }
                      onClick={() => setImageCount(i + 1)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>{t('estimatedCost')}</span>
              <span className={insufficient ? 'text-destructive font-medium' : 'text-brand font-medium'}>
                {cost} {t('creditsUnit')}
              </span>
            </div>

            {error && (
              <p className="text-destructive bg-destructive/5 rounded-lg p-2 text-xs">
                {error}
              </p>
            )}
            {insufficient && !error && (
              <p className="text-destructive bg-destructive/5 rounded-lg p-2 text-xs">
                {t('insufficientHint')}
              </p>
            )}

            <Button
              onClick={handleGenerate}
              disabled={!canSubmit}
              className="bg-brand text-white hover:bg-brand/90 w-full gap-2 rounded-full py-5"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {submitting ? t('generating') : t('generate')}
            </Button>
          </div>
        </div>
      </div>

      {/* Right: generation feed */}
      <div className="flex flex-col gap-4">
        <h1 className="text-foreground text-xl font-semibold tracking-tight">
          {t('yourGenerations')}
        </h1>
        {!generationsData && (
          <>
            <GenerationCardSkeleton />
            <GenerationCardSkeleton />
          </>
        )}
        {generationsData && generations.length === 0 && (
          <div className="bg-card flex flex-col items-center gap-3 rounded-2xl border border-dashed py-20 text-center">
            <ImageIcon className="text-muted-foreground size-10" />
            <p className="text-muted-foreground text-sm">{t('emptyFeed')}</p>
          </div>
        )}
        {generations.map((generation) => (
          <GenerationCard
            key={generation.id}
            generation={generation}
            canDelete={generation.userId === currentUserId}
            onDelete={handleDelete}
            onRegenerate={handleRegenerate}
            deleting={deletingId === generation.id}
          />
        ))}
      </div>
    </div>
  );
}
