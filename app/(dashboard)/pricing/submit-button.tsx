'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFormStatus } from 'react-dom';

export function SubmitButton({ highlighted = false }: { highlighted?: boolean }) {
  const { pending } = useFormStatus();
  const t = useTranslations('Pricing');

  return (
    <Button
      type="submit"
      disabled={pending}
      variant={highlighted ? 'default' : 'outline'}
      className={`h-11 w-full rounded-full text-sm font-semibold ${
        highlighted ? 'bg-brand text-white hover:bg-brand/90' : ''
      }`}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t('loading')}
        </>
      ) : (
        <>
          {t('getStarted')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}
