'use client';

import { useState } from 'react';
import { DashboardShell, type Tab } from '@/components/dashboard/DashboardShell';
import { OverviewPage } from '@/components/dashboard/OverviewPage';
import { MarketsPage } from '@/components/dashboard/MarketsPage';
import { AlertsPage } from '@/components/dashboard/AlertsPage';
import { AccountPage } from '@/components/dashboard/AccountPage';
import { AddAlertModal } from '@/components/dashboard/AddAlertModal';
import { AiChatWidget } from '@/components/AiChatWidget';
import { useAuth } from '@/contexts/auth-context';

const PROTECTED_TABS: Tab[] = ['alerts', 'profile'];

export default function Page() {
  const [tab, setTab] = useState<Tab>('home');
  const [currency] = useState('VND');
  const [alertOpen, setAlertOpen] = useState(false);
  const { user } = useAuth();

  const safeTab = (!user && PROTECTED_TABS.includes(tab)) ? 'home' : tab;

  return (
    <>
      <DashboardShell tab={safeTab} onTab={setTab}>
        {safeTab === 'home'    && <OverviewPage currency={currency} onNavigateAlerts={() => setTab('alerts')}/>}
        {safeTab === 'chart'   && <MarketsPage currency={currency}/>}
        {safeTab === 'alerts'  && <AlertsPage onOpenAdd={() => setAlertOpen(true)}/>}
        {safeTab === 'profile' && <AccountPage />}
      </DashboardShell>
      <AddAlertModal open={alertOpen} onClose={() => setAlertOpen(false)}/>
      <AiChatWidget />
    </>
  );
}
