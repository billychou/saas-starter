import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Github, Twitter, Zap } from 'lucide-react';

const footerNav = [
  {
    titleKey: 'product',
    links: [
      { labelKey: 'features', href: '/#features' },
      { labelKey: 'pricing', href: '/pricing' },
      { labelKey: 'faq', href: '/#faq' },
      { labelKey: 'dashboard', href: '/dashboard' }
    ]
  },
  {
    titleKey: 'resources',
    links: [
      {
        labelKey: 'docs',
        href: 'https://github.com/nextjs/saas-starter#readme'
      },
      { labelKey: 'github', href: 'https://github.com/nextjs/saas-starter' },
      {
        labelKey: 'vercelTemplate',
        href: 'https://vercel.com/templates/next.js/next-js-saas-starter'
      }
    ]
  },
  {
    titleKey: 'legal',
    links: [
      { labelKey: 'privacy', href: '#' },
      { labelKey: 'terms', href: '#' }
    ]
  }
] as const;

export function Footer() {
  const t = useTranslations('Footer');

  return (
    <footer className="border-border/60 w-full border-t">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <span className="bg-brand-gradient flex size-7 items-center justify-center rounded-lg">
                <Zap className="size-4 fill-white text-white" />
              </span>
              <span className="text-lg font-bold tracking-tight">ACME</span>
            </Link>
            <p className="text-muted-foreground mt-4 max-w-xs text-sm leading-relaxed">
              {t('tagline')}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://github.com/nextjs/saas-starter"
                target="_blank"
                rel="noreferrer"
                aria-label={t('github')}
                className="text-muted-foreground hover:text-foreground bg-accent/50 flex size-9 items-center justify-center rounded-lg transition-colors"
              >
                <Github className="size-4" />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                aria-label="X (Twitter)"
                className="text-muted-foreground hover:text-foreground bg-accent/50 flex size-9 items-center justify-center rounded-lg transition-colors"
              >
                <Twitter className="size-4" />
              </a>
            </div>
          </div>
          {footerNav.map((column) => (
            <div key={column.titleKey}>
              <h3 className="text-sm font-semibold">{t(column.titleKey)}</h3>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.labelKey}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {t(link.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-border/60 mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
          <p className="text-muted-foreground text-sm">
            {t('rights', { year: new Date().getFullYear() })}
          </p>
          <p className="text-muted-foreground text-sm">
            {t.rich('builtWith', {
              brand: (chunks) => (
                <span className="text-brand font-medium">{chunks}</span>
              )
            })}
          </p>
        </div>
      </div>
    </footer>
  );
}
