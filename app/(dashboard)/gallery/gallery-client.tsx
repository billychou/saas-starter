'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import useSWR from 'swr';
import {
  Coins,
  Download,
  ImageIcon,
  Loader2,
  Trash2,
  Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BuyCreditsDialog } from '@/components/ai/buy-credits-dialog';
import type { CreditPackInfo, GenerationInfo } from '@/components/ai/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Scope = 'mine' | 'all';

interface GalleryItem {
  key: string;
  src: string;
  generation: GenerationInfo;
}

export function GalleryClient({
  currentUserId,
  isTeamOwner,
  initialCreditBalance,
  creditPacks
}: {
  currentUserId: number;
  isTeamOwner: boolean;
  initialCreditBalance: number;
  creditPacks: CreditPackInfo[];
}) {
  const t = useTranslations('Gallery');
  const format = useFormatter();
  const [scope, setScope] = useState<Scope>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: modelsData, mutate: mutateModels } = useSWR<{
    creditBalance: number;
    creditPacks: CreditPackInfo[];
  }>('/api/ai/models', fetcher, {
    fallbackData: { creditBalance: initialCreditBalance, creditPacks }
  });

  const { data, mutate, isLoading } = useSWR<{ items: GenerationInfo[] }>(
    `/api/ai/generations?scope=${scope}&limit=60`,
    fetcher,
    {
      refreshInterval: (latest) =>
        latest?.items.some(
          (g) => g.status === 'pending' || g.status === 'running'
        )
          ? 5000
          : 0
    }
  );

  const items: GalleryItem[] = useMemo(
    () =>
      (data?.items ?? [])
        .filter((g) => g.status === 'succeeded')
        .flatMap((g) =>
          g.images.map((image) => ({
            key: `${g.id}-${image.id}`,
            src: image.localPath ?? image.url,
            generation: g
          }))
        ),
    [data]
  );

  const handleDelete = useCallback(
    async (generation: GenerationInfo) => {
      setDeletingId(generation.id);
      try {
        await fetch(`/api/ai/generations/${generation.id}`, { method: 'DELETE' });
        mutate();
        mutateModels();
      } finally {
        setDeletingId(null);
      }
    },
    [mutate, mutateModels]
  );

  function remixUrl(g: GenerationInfo) {
    const params = new URLSearchParams({
      prompt: g.prompt,
      model: g.modelId,
      size: g.size,
      count: String(g.imageCount)
    });
    if (g.negativePrompt) params.set('negative', g.negativePrompt);
    return `/studio?${params.toString()}`;
  }

  const creditBalance = modelsData?.creditBalance ?? initialCreditBalance;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Coins className="text-brand size-4" />
            <span className="text-foreground font-semibold">{creditBalance}</span>
            {t('teamCredits')}
          </span>
          <BuyCreditsDialog packs={modelsData?.creditPacks ?? creditPacks} />
        </div>
      </div>

      <div className="mb-6 flex gap-2">
        {(['all', 'mine'] as const).map((s) => (
          <Button
            key={s}
            variant={scope === s ? 'default' : 'outline'}
            size="sm"
            className={
              scope === s
                ? 'bg-brand text-white hover:bg-brand/90 rounded-full'
                : 'rounded-full'
            }
            onClick={() => setScope(s)}
          >
            {s === 'all' ? t('scopeAll') : t('scopeMine')}
          </Button>
        ))}
      </div>

      {isLoading && !data && (
        <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className="mb-4 aspect-square w-full break-inside-avoid rounded-xl"
            />
          ))}
        </div>
      )}

      {data && items.length === 0 && (
        <div className="bg-card flex flex-col items-center gap-3 rounded-2xl border border-dashed py-24 text-center">
          <ImageIcon className="text-muted-foreground size-10" />
          <p className="text-muted-foreground text-sm">{t('empty')}</p>
          <Button asChild className="bg-brand text-white hover:bg-brand/90 rounded-full">
            <Link href="/studio">
              <Wand2 className="size-4" />
              {t('goToStudio')}
            </Link>
          </Button>
        </div>
      )}

      <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
        {items.map((item) => {
          const g = item.generation;
          const canDelete = g.userId === currentUserId || isTeamOwner;
          return (
            <div
              key={item.key}
              className="group relative mb-4 break-inside-avoid overflow-hidden rounded-xl border"
            >
              <Link href={remixUrl(g)} className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={g.prompt}
                  className="w-full object-cover"
                  loading="lazy"
                />
              </Link>
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <p className="pointer-events-auto line-clamp-2 text-xs text-white">
                  {g.prompt}
                </p>
                <div className="pointer-events-auto mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-white/70">
                    {g.user?.name || g.user?.email} · {g.modelName} ·{' '}
                    {format.dateTime(new Date(g.createdAt), 'short')}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <a
                      href={item.src}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                      aria-label={t('download')}
                    >
                      <Download className="size-3.5" />
                    </a>
                    <Link
                      href={remixUrl(g)}
                      className="rounded-md p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                      aria-label={t('remix')}
                    >
                      <Wand2 className="size-3.5" />
                    </Link>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(g)}
                        disabled={deletingId === g.id}
                        className="rounded-md p-1.5 text-white/80 transition-colors hover:bg-destructive hover:text-white"
                        aria-label={t('delete')}
                      >
                        {deletingId === g.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
