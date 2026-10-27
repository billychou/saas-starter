import { getUser } from '@/lib/db/queries';
import { isAdminUser } from '@/lib/auth/admin';

export async function GET() {
  const user = await getUser();
  return Response.json(user ? { ...user, isAdmin: isAdminUser(user) } : null);
}
