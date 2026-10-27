'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Zap } from 'lucide-react';
import { signIn, signUp } from './actions';
import { ActionState } from '@/lib/auth/middleware';

export function Login({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const t = useTranslations('Login');
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const priceId = searchParams.get('priceId');
  const inviteId = searchParams.get('inviteId');
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    mode === 'signin' ? signIn : signUp,
    { error: '' }
  );

  return (
    <div className="bg-background relative flex min-h-[100dvh] flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div
        aria-hidden
        className="from-brand/10 pointer-events-none absolute inset-x-0 top-0 mx-auto h-72 max-w-2xl bg-gradient-to-b to-transparent blur-3xl"
      />
      <div className="relative mx-auto w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-brand-gradient flex size-10 items-center justify-center rounded-xl">
              <Zap className="size-5 fill-white text-white" />
            </span>
            <span className="text-2xl font-bold tracking-tight">ACME</span>
          </Link>
          <h2 className="mt-6 text-2xl font-bold tracking-tight">
            {mode === 'signin' ? t('signInTitle') : t('signUpTitle')}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {mode === 'signin' ? t('signInSubtitle') : t('signUpSubtitle')}
          </p>
        </div>

        <div className="bg-card mt-8 rounded-2xl border p-8 shadow-sm">
          <form className="space-y-5" action={formAction}>
            <input type="hidden" name="redirect" value={redirect || ''} />
            <input type="hidden" name="priceId" value={priceId || ''} />
            <input type="hidden" name="inviteId" value={inviteId || ''} />
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                {t('email')}
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={state.email}
                required
                maxLength={50}
                className="h-10 rounded-lg"
                placeholder={t('emailPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                {t('password')}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  mode === 'signin' ? 'current-password' : 'new-password'
                }
                defaultValue={state.password}
                required
                minLength={8}
                maxLength={100}
                className="h-10 rounded-lg"
                placeholder={t('passwordPlaceholder')}
              />
            </div>

            {state?.error && (
              <div className="text-destructive text-sm">{state.error}</div>
            )}

            <Button
              type="submit"
              disabled={pending}
              className="bg-brand hover:bg-brand/90 h-10 w-full rounded-full text-sm font-semibold text-white"
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('loading')}
                </>
              ) : mode === 'signin' ? (
                t('signIn')
              ) : (
                t('signUp')
              )}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="border-border w-full border-t" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card text-muted-foreground px-2">
                  {mode === 'signin' ? t('newHere') : t('haveAccount')}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Button
                asChild
                variant="outline"
                className="h-10 w-full rounded-full"
              >
                <Link
                  href={`${mode === 'signin' ? '/sign-up' : '/sign-in'}${
                    redirect ? `?redirect=${redirect}` : ''
                  }${priceId ? `&priceId=${priceId}` : ''}`}
                >
                  {mode === 'signin'
                    ? t('createAccount')
                    : t('signInExisting')}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
