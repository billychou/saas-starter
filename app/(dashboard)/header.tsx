'use client';

import Link from 'next/link';
import { useState, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  Home,
  ImageIcon,
  LogOut,
  Menu,
  Shield,
  Sparkles,
  CircleHelp,
  Wand2,
  X,
  Zap
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { signOut } from '@/app/(login)/actions';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/db/schema';
import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const navItems = [
  { href: '/#features', labelKey: 'features', icon: Sparkles },
  { href: '/pricing', labelKey: 'pricing', icon: CreditCard },
  { href: '/#faq', labelKey: 'faq', icon: CircleHelp }
] as const;

const authedNavItems = [
  { href: '/studio', labelKey: 'studio', icon: Wand2 },
  { href: '/gallery', labelKey: 'gallery', icon: ImageIcon }
] as const;

type SessionUser = User & { isAdmin?: boolean };

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="bg-brand-gradient flex size-7 items-center justify-center rounded-lg">
        <Zap className="size-4 fill-white text-white" />
      </span>
      <span className="text-lg font-bold tracking-tight">ACME</span>
    </Link>
  );
}

function NavLinks() {
  const t = useTranslations('Header');
  const { data: user } = useSWR<SessionUser>('/api/user', fetcher);
  const items = user ? [...authedNavItems, ...navItems] : [...navItems];
  return (
    <>
      {items.map((item) => (
        <Link
          key={item.labelKey}
          href={item.href}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <item.icon className="size-3.5" />
          {t(item.labelKey)}
        </Link>
      ))}
    </>
  );
}

function UserMenu() {
  const t = useTranslations('Header');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: user } = useSWR<SessionUser>('/api/user', fetcher);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    mutate('/api/user');
    router.push('/');
  }

  if (!user) {
    return (
      <>
        <Button asChild variant="ghost" className="text-foreground px-3">
          <Link href="/sign-in">{t('signIn')}</Link>
        </Button>
        <Button
          asChild
          className="bg-brand text-white hover:bg-brand/90 rounded-full px-5"
        >
          <Link href="/sign-up">{t('getStarted')}</Link>
        </Button>
      </>
    );
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger>
        <Avatar className="cursor-pointer size-9">
          <AvatarImage alt={user.name || ''} />
          <AvatarFallback className="bg-brand/10 text-brand">
            {user.email
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex flex-col gap-1">
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/dashboard" className="flex w-full items-center">
            <Home className="mr-2 h-4 w-4" />
            <span>{t('dashboard')}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/studio" className="flex w-full items-center">
            <Wand2 className="mr-2 h-4 w-4" />
            <span>{t('studio')}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/gallery" className="flex w-full items-center">
            <ImageIcon className="mr-2 h-4 w-4" />
            <span>{t('gallery')}</span>
          </Link>
        </DropdownMenuItem>
        {user.isAdmin && (
          <DropdownMenuItem className="cursor-pointer">
            <Link href="/admin/models" className="flex w-full items-center">
              <Shield className="mr-2 h-4 w-4" />
              <span>{t('admin')}</span>
            </Link>
          </DropdownMenuItem>
        )}
        <form action={handleSignOut} className="w-full">
          <button type="submit" className="flex w-full">
            <DropdownMenuItem className="w-full flex-1 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t('signOut')}</span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileMenu() {
  const t = useTranslations('Header');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setIsOpen(true)}
        aria-label={t('openMenu')}
      >
        <Menu className="size-5" />
      </Button>
      {isOpen && (
        <div className="bg-background/95 fixed inset-0 top-0 z-50 backdrop-blur-sm md:hidden">
          <div className="flex items-center justify-between p-4">
            <Logo />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              aria-label={t('closeMenu')}
            >
              <X className="size-5" />
            </Button>
          </div>
          <nav
            className="flex flex-col gap-1 p-4"
            onClick={() => setIsOpen(false)}
          >
            <NavLinks />
            <div className="mt-4 flex flex-col gap-2">
              <Suspense fallback={<div className="h-9" />}>
                <UserMenu />
              </Suspense>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

export function Header() {
  return (
    <header className="bg-background/80 sticky top-0 z-40 w-full border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 md:flex">
            <NavLinks />
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          <div className="hidden items-center gap-2 md:flex">
            <Suspense fallback={<div className="h-9 w-24" />}>
              <UserMenu />
            </Suspense>
          </div>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
