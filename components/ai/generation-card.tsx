'use client';

import { useFormatter, useTranslations } from 'next-intl';
import {
  AlertCircle,
  Download,
  Loader2,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { GenerationInfo } from './types';

function StatusBadge({ status }: { status: GenerationInfo['status'] }) {
  const t = useTranslations('Studio');
  if (status === 'pending' || status === 'running') {
    return (
      <Badge variant="secondary" className="text-brand bg-brand/10 gap-1">
        <Loader2 className="size-3 animate-spin" />
        {status === 'pending' ? t('statusPending') : t('statusRunning')}
      </Badge>
    );
  }
  if (status === 'succeeded') {
    return (
      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1">
        {t('statusSucceeded')}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-destructive/10 text-destructive gap-1">
      <AlertCircle className="size-3" />
      {t('statusFailed')}
    </Badge>
  );
}

export function GenerationCard({
  generation,
  canDelete,
  onDelete,
  onRegenerate,
  deleting
}: {
  generation: GenerationInfo;
  canDelete: boolean;
  onDelete?: (id: number) => void;
  onRegenerate?: (generation: GenerationInfo) => void;
  deleting?: boolean;
}) {
  const t = useTranslations('Studio');
  const format = useFormatter();

  return (
    <div className="bg-card rounded-2xl border p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={generation.status} />
        <Badge variant="outline" className="text-muted-foreground font-normal">
          {generation.modelName}
        </Badge>
        <Badge variant="outline" className="text-muted-foreground font-normal">
          {generation.size.replace('*', '×')}
        </Badge>
        <Badge variant="outline" className="text-muted-foreground font-normal">
          {t('creditsUsed', { count: generation.creditsUsed })}
        </Badge>
        <span className="text-muted-foreground ml-auto text-xs">
          {generation.user?.name || generation.user?.email}
          {generation.user ? ' · ' : ''}
          {format.dateTime(new Date(generation.createdAt), 'short')}
        </span>
      </div>

      <p className="text-foreground mb-3 line-clamp-2 text-sm" title={generation.prompt}>
        {generation.prompt}
      </p>

      {generation.status === 'failed' && generation.error && (
        <p className="text-destructive bg-destructive/5 mb-3 rounded-lg p-2 text-xs">
          {generation.error}
        </p>
      )}

      {(generation.status === 'pending' || generation.status === 'running') && (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${Math.min(generation.imageCount, 2)}, minmax(0, 1fr))`
          }}
        >
          {Array.from({ length: generation.imageCount }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-xl" />
          ))}
        </div>
      )}

      {generation.status === 'succeeded' && (
        <>
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${Math.min(generation.images.length || 1, 2)}, minmax(0, 1fr))`
            }}
          >
            {generation.images.map((image) => (
              <a
                key={image.id}
                href={image.localPath ?? image.url}
                target="_blank"
                rel="noreferrer"
                className="group relative block overflow-hidden rounded-xl border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.localPath ?? image.url}
                  alt={generation.prompt}
                  className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  loading="lazy"
                />
              </a>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {generation.images.map((image) => (
              <Button
                key={image.id}
                asChild
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-8 px-2 text-xs"
              >
                <a href={image.localPath ?? image.url} download target="_blank" rel="noreferrer">
                  <Download className="size-3.5" />
                </a>
              </Button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              {onRegenerate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-brand h-8 gap-1 text-xs"
                  onClick={() => onRegenerate(generation)}
                >
                  <RefreshCw className="size-3.5" />
                  {t('regenerate')}
                </Button>
              )}
              {canDelete && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive h-8 gap-1 text-xs"
                  disabled={deleting}
                  onClick={() => onDelete(generation.id)}
                >
                  {deleting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                  {t('delete')}
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function GenerationCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border p-5">
      <div className="mb-3 flex gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <Skeleton className="mb-3 h-4 w-3/4" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <Skeleton className="aspect-square w-full rounded-xl" />
      </div>
    </div>
  );
}

