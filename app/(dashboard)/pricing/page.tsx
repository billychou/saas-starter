import { checkoutAction } from '@/lib/payments/actions';
import { Check, Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';
import { Badge } from '@/components/ui/badge';
import { SubmitButton } from './submit-button';

// Prices are fresh for one hour max
export const revalidate = 3600;

export default async function PricingPage() {
  const t = await getTranslations('Pricing');
  const [prices, products] = await Promise.all([
    getStripePrices(),
    getStripeProducts()
  ]);

  const basePlan = products.find((product) => product.name === 'Base');
  const plusPlan = products.find((product) => product.name === 'Plus');

  const basePrice = prices.find((price) => price.productId === basePlan?.id);
  const plusPrice = prices.find((price) => price.productId === plusPlan?.id);

  return (
    <main className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <Badge
          variant="outline"
          className="border-brand/30 bg-brand/5 text-brand rounded-full px-4 py-1 text-xs font-medium"
        >
          <Sparkles className="size-3.5" />
          {t('badge')}
        </Badge>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
          {t.rich('title', {
            gradient: (chunks) => <span className="text-gradient">{chunks}</span>
          })}
        </h1>
        <p className="text-muted-foreground mt-4 text-lg">
          {t('subtitle', {
            trialDays: basePrice?.trialPeriodDays || 7
          })}
        </p>
      </div>

      <div className="mx-auto mt-16 grid max-w-3xl gap-8 md:grid-cols-2">
        <PricingCard
          name={basePlan?.name || 'Base'}
          price={basePrice?.unitAmount || 800}
          interval={basePrice?.interval || 'month'}
          trialDays={basePrice?.trialPeriodDays || 7}
          features={t.raw('baseFeatures') as string[]}
          priceId={basePrice?.id}
        />
        <PricingCard
          highlighted
          name={plusPlan?.name || 'Plus'}
          price={plusPrice?.unitAmount || 1200}
          interval={plusPrice?.interval || 'month'}
          trialDays={plusPrice?.trialPeriodDays || 7}
          features={t.raw('plusFeatures') as string[]}
          priceId={plusPrice?.id}
        />
      </div>

      <p className="text-muted-foreground mt-12 text-center text-sm">
        {t('footnote')}
      </p>
    </main>
  );
}

async function PricingCard({
  name,
  price,
  interval,
  trialDays,
  features,
  priceId,
  highlighted = false
}: {
  name: string;
  price: number;
  interval: string;
  trialDays: number;
  features: string[];
  priceId?: string;
  highlighted?: boolean;
}) {
  const t = await getTranslations('Pricing');

  return (
    <div
      className={`bg-card relative flex flex-col rounded-2xl border p-8 ${
        highlighted
          ? 'border-brand/60 shadow-xl shadow-brand/10'
          : 'border-border'
      }`}
    >
      {highlighted && (
        <span className="bg-brand-gradient absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-semibold whitespace-nowrap text-white">
          {t('mostPopular')}
        </span>
      )}
      <h2 className="text-lg font-semibold">{name}</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        {t('trialNote', { trialDays })}
      </p>
      <p className="mt-6 text-5xl font-extrabold tracking-tight">
        ${price / 100}
        <span className="text-muted-foreground ml-2 text-base font-normal">
          {t('perUser', {
            interval:
              interval === 'year' ? t('intervalYear') : t('intervalMonth')
          })}
        </span>
      </p>
      <ul className="mt-8 flex-1 space-y-3.5">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start text-sm">
            <span className="bg-brand/10 text-brand mr-3 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
              <Check className="size-3" />
            </span>
            {feature}
          </li>
        ))}
      </ul>
      <form action={checkoutAction} className="mt-8">
        <input type="hidden" name="priceId" value={priceId} />
        <SubmitButton highlighted={highlighted} />
      </form>
    </div>
  );
}
