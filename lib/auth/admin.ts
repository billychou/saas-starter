import type { User } from '@/lib/db/schema';

/**
 * Platform admins are configured via the ADMIN_EMAILS env var
 * (comma-separated list of emails).
 */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user: Pick<User, 'email'> | null | undefined): boolean {
  if (!user?.email) return false;
  return getAdminEmails().includes(user.email.toLowerCase());
}
