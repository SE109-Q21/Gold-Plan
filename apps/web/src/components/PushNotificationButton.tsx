'use client';

import { usePushNotifications } from '@/lib/use-push-notifications';
import { Button } from '@/components/ui/button';

export function PushNotificationButton() {
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) return null;

  return (
    <Button
      variant="outline"
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={isLoading}
      className="flex items-center gap-2 bg-[rgba(212,175,55,0.1)] border-[rgba(212,175,55,0.3)] text-gold hover:bg-[rgba(212,175,55,0.2)] hover:text-gold font-mono text-[11px] font-bold tracking-[0.04em] uppercase"
    >
      {isLoading ? 'Processing...' : isSubscribed ? '🔔 Notifications On' : '🔔 Enable Notifications'}
    </Button>
  );
}
