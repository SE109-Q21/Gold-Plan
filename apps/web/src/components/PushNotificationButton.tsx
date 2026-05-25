'use client';

import { usePushNotifications } from '@/lib/use-push-notifications';
import { cn } from '@/lib/utils';

export function PushNotificationButton() {
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) return null;

  return (
    <button
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={isLoading}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg border font-mono text-[11px] leading-none font-bold tracking-[0.04em] uppercase transition-colors',
        'bg-[rgba(212,175,55,0.1)] border-[rgba(212,175,55,0.3)] text-gold hover:bg-[rgba(212,175,55,0.2)]',
        isLoading && 'opacity-50 cursor-not-allowed',
      )}
    >
      {isLoading ? 'Processing...' : isSubscribed ? '🔔 Notifications On' : '🔔 Enable Notifications'}
    </button>
  );
}
