'use client';

import { usePushNotifications } from '@/lib/use-push-notifications';

export function PushNotificationButton() {
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) return null;

  return (
    <button
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={isLoading}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 transition-colors disabled:opacity-50 text-sm"
    >
      {isLoading ? 'Processing...' : isSubscribed ? '🔔 Notifications On' : '🔔 Enable Notifications'}
    </button>
  );
}
