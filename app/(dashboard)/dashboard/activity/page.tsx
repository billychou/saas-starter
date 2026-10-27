import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Settings,
  LogOut,
  UserPlus,
  Lock,
  UserCog,
  AlertCircle,
  UserMinus,
  Mail,
  CheckCircle,
  ImageIcon,
  type LucideIcon
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { ActivityType } from '@/lib/db/schema';
import { getActivityLogs } from '@/lib/db/queries';

const iconMap: Record<ActivityType, LucideIcon> = {
  [ActivityType.SIGN_UP]: UserPlus,
  [ActivityType.SIGN_IN]: UserCog,
  [ActivityType.SIGN_OUT]: LogOut,
  [ActivityType.UPDATE_PASSWORD]: Lock,
  [ActivityType.DELETE_ACCOUNT]: UserMinus,
  [ActivityType.UPDATE_ACCOUNT]: Settings,
  [ActivityType.CREATE_TEAM]: UserPlus,
  [ActivityType.REMOVE_TEAM_MEMBER]: UserMinus,
  [ActivityType.INVITE_TEAM_MEMBER]: Mail,
  [ActivityType.ACCEPT_INVITATION]: CheckCircle,
  [ActivityType.IMAGE_GENERATED]: ImageIcon
};

type ActivityTranslations = Awaited<
  ReturnType<typeof getTranslations<'Activity'>>
>;

function getRelativeTime(date: Date, t: ActivityTranslations) {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return t('justNow');
  if (diffInSeconds < 3600)
    return t('minutesAgo', { count: Math.floor(diffInSeconds / 60) });
  if (diffInSeconds < 86400)
    return t('hoursAgo', { count: Math.floor(diffInSeconds / 3600) });
  if (diffInSeconds < 604800)
    return t('daysAgo', { count: Math.floor(diffInSeconds / 86400) });
  return date.toLocaleDateString();
}

function formatAction(action: ActivityType, t: ActivityTranslations): string {
  const key = `actions.${action}` as Parameters<typeof t>[0];
  return t.has(`actions.${action}`) ? t(key) : t('actions.UNKNOWN');
}

export default async function ActivityPage() {
  const t = await getTranslations('Activity');
  const logs = await getActivityLogs();

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-foreground mb-6">
        {t('title')}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{t('recent')}</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <ul className="space-y-4">
              {logs.map((log) => {
                const Icon = iconMap[log.action as ActivityType] || Settings;
                const formattedAction = formatAction(
                  log.action as ActivityType,
                  t
                );

                return (
                  <li key={log.id} className="flex items-center space-x-4">
                    <div className="bg-brand/10 rounded-full p-2">
                      <Icon className="w-5 h-5 text-brand" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {formattedAction}
                        {log.ipAddress && t('fromIp', { ip: log.ipAddress })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getRelativeTime(new Date(log.timestamp), t)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <AlertCircle className="h-12 w-12 text-brand mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('noTitle')}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {t('noBody')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
