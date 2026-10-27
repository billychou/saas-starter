'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Coins, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { creditPackCheckoutAction } from '@/lib/payments/actions';
import type { CreditPackInfo } from './types';

export function BuyCreditsDialog({
  packs,
  trigger
}: {
  packs: CreditPackInfo[];
  trigger?: React.ReactNode;
}) {
  const t = useTranslations('Credits');
  const [open, setOpen] = useState(false);
  const [pendingPack, setPendingPack] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="bg-brand text-white hover:bg-brand/90 gap-1.5 rounded-full">
            <Coins className="size-3.5" />
            {t('buyCredits')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('buyTitle')}</DialogTitle>
          <DialogDescription>{t('buyDescription')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {packs.map((pack) => (
            <form
              key={pack.id}
              action={async (formData) => {
                setPendingPack(pack.id);
                await creditPackCheckoutAction(formData);
              }}
              className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:border-brand/50"
            >
              <input type="hidden" name="packId" value={pack.id} />
              <div>
                <p className="text-foreground text-sm font-semibold">
                  {t('packCredits', { count: pack.credits })}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t('packPrice', { price: pack.amountUsd })}
                </p>
              </div>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={pendingPack !== null}
                className="rounded-full"
              >
                {pendingPack === pack.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  t('purchase')
                )}
              </Button>
            </form>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          {t('checkoutNote')}
        </p>
      </DialogContent>
    </Dialog>
  );
}
