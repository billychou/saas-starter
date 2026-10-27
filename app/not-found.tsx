import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap } from 'lucide-react';

export default function NotFound() {
  const t = useTranslations('NotFound');

  return (
    <div className="bg-background flex min-h-[100dvh] items-center justify-center">
      <div className="max-w-md space-y-6 p-4 text-center">
        <div className="flex justify-center">
          <span className="bg-brand-gradient flex size-12 items-center justify-center rounded-xl">
            <Zap className="size-6 fill-white text-white" />
          </span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-base">{t('body')}</p>
        <Button
          asChild
          variant="outline"
          className="mx-auto max-w-48 rounded-full"
        >
          <Link href="/">
            <ArrowLeft className="mr-2 size-4" />
            {t('backHome')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
