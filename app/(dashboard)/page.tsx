import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import {
  ArrowRight,
  CreditCard,
  Database,
  Github,
  Lock,
  ScrollText,
  Sparkles,
  Users,
  Zap,
  type LucideIcon
} from 'lucide-react';
import { Terminal } from './terminal';

const stackLogos: { name: string; icon: LucideIcon }[] = [
  { name: 'Next.js', icon: Zap },
  { name: 'Stripe', icon: CreditCard },
  { name: 'Postgres', icon: Database },
  { name: 'Drizzle', icon: Database },
  { name: 'Tailwind CSS', icon: Sparkles },
  { name: 'shadcn/ui', icon: Lock }
];

// Icons stay in code; copy comes from messages (Home.features.items)
const featureIcons: LucideIcon[] = [
  Lock,
  CreditCard,
  Users,
  Database,
  ScrollText,
  Sparkles
];

export default function HomePage() {
  const t = useTranslations('Home');

  const features = t.raw('features.items') as {
    number: string;
    title: string;
    description: string;
  }[];
  const stats = t.raw('stats.items') as { value: string; label: string }[];
  const testimonials = t.raw('testimonials.items') as {
    quote: string;
    name: string;
    title: string;
  }[];
  const faqs = t.raw('faq.items') as {
    question: string;
    answer: string;
  }[];

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="from-brand/10 pointer-events-none absolute inset-x-0 top-0 mx-auto h-[500px] max-w-3xl bg-gradient-to-b to-transparent blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-16 text-center sm:px-6 lg:px-8 lg:pt-28">
          <Badge
            variant="outline"
            className="border-brand/30 bg-brand/5 text-brand rounded-full px-4 py-1 text-xs font-medium"
          >
            <Sparkles className="size-3.5" />
            {t('hero.badge')}
          </Badge>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold tracking-tight text-balance sm:text-6xl">
            {t.rich('hero.title', {
              gradient: (chunks) => (
                <span className="text-gradient">{chunks}</span>
              )
            })}
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty">
            {t('hero.subtitle')}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-brand text-white hover:bg-brand/90 h-11 rounded-full px-8 text-base"
            >
              <Link href="/sign-up">
                {t('hero.ctaPrimary')}
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 rounded-full px-8 text-base"
            >
              <a href="https://github.com/nextjs/saas-starter" target="_blank">
                <Github className="mr-1 size-4" />
                {t('hero.ctaSecondary')}
              </a>
            </Button>
          </div>
          <div className="mx-auto mt-16 max-w-3xl">
            <Terminal />
          </div>
        </div>
      </section>

      {/* Logo cloud */}
      <section className="border-border/60 border-y">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-muted-foreground text-center text-sm font-medium">
            {t('logos.title')}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
            {stackLogos.map((logo) => (
              <div
                key={logo.name}
                className="text-muted-foreground/70 hover:text-foreground flex items-center gap-2 text-base font-semibold transition-colors"
              >
                <logo.icon className="size-5" />
                {logo.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-brand text-sm font-semibold tracking-wide uppercase">
              {t('features.eyebrow')}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              {t('features.title')}
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              {t('features.subtitle')}
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = featureIcons[index] ?? Sparkles;
              return (
                <div
                  key={feature.number}
                  className="bg-card hover:border-brand/40 group relative rounded-xl border p-6 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="bg-brand/10 text-brand flex size-10 items-center justify-center rounded-lg transition-colors group-hover:bg-brand group-hover:text-white">
                      <Icon className="size-5" />
                    </span>
                    <span className="text-muted-foreground/40 font-mono text-sm font-semibold">
                      {feature.number}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-muted/40 border-y">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-16 sm:px-6 lg:grid-cols-4 lg:px-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-gradient text-4xl font-extrabold tracking-tight sm:text-5xl">
                {stat.value}
              </p>
              <p className="text-muted-foreground mt-2 text-sm font-medium">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-brand text-sm font-semibold tracking-wide uppercase">
            {t('testimonials.eyebrow')}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            {t('testimonials.title')}
          </h2>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <figure
              key={testimonial.name}
              className="bg-card flex flex-col justify-between rounded-xl border p-6"
            >
              <blockquote className="text-sm leading-relaxed">
                “{testimonial.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="bg-brand/10 text-brand flex size-10 items-center justify-center rounded-full text-sm font-semibold">
                  {testimonial.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </span>
                <div>
                  <p className="text-sm font-semibold">{testimonial.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {testimonial.title}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-border/60 scroll-mt-20 border-t">
        <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-brand text-sm font-semibold tracking-wide uppercase">
              {t('faq.eyebrow')}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              {t('faq.title')}
            </h2>
          </div>
          <Accordion type="single" collapsible className="mt-12">
            {faqs.map((faq, index) => (
              <AccordionItem key={faq.question} value={`item-${index}`}>
                <AccordionTrigger className="text-base">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="from-brand/10 via-brand/5 relative overflow-hidden rounded-2xl border bg-gradient-to-b to-transparent px-6 py-20 text-center">
          <div
            aria-hidden
            className="bg-brand/20 pointer-events-none absolute -top-24 left-1/2 h-64 w-[500px] -translate-x-1/2 rounded-full blur-3xl"
          />
          <h2 className="relative mx-auto max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            {t('cta.title')}
          </h2>
          <p className="text-muted-foreground relative mx-auto mt-4 max-w-xl text-lg">
            {t('cta.subtitle')}
          </p>
          <div className="relative mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-brand text-white hover:bg-brand/90 h-11 rounded-full px-8 text-base"
            >
              <Link href="/sign-up">
                {t('cta.primary')}
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 rounded-full px-8 text-base"
            >
              <Link href="/pricing">{t('cta.secondary')}</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
