'use client';

import { useState } from 'react';
import { DashboardShell, type Tab } from '@/components/dashboard/DashboardShell';
import { OverviewPage } from '@/components/dashboard/OverviewPage';
import { MarketsPage } from '@/components/dashboard/MarketsPage';
import { AlertsPage } from '@/components/dashboard/AlertsPage';
import { AccountPage } from '@/components/dashboard/AccountPage';
import { AddAlertModal } from '@/components/dashboard/AddAlertModal';
import { AiChatWidget } from '@/components/AiChatWidget';

export default function Page() {
  const [tab, setTab] = useState<Tab>('home');
  const [currency, setCurrency] = useState('USD');
  const [alertOpen, setAlertOpen] = useState(false);

  return (
    <>
      <DashboardShell tab={tab} onTab={setTab} currency={currency} onCurrency={setCurrency}>
        {tab === 'home'    && <OverviewPage currency={currency} onNavigateAlerts={() => setTab('alerts')}/>}
        {tab === 'chart'   && <MarketsPage/>}
        {tab === 'alerts'  && <AlertsPage onOpenAdd={() => setAlertOpen(true)}/>}
        {tab === 'profile' && <AccountPage/>}
      </DashboardShell>
      <AddAlertModal open={alertOpen} onClose={() => setAlertOpen(false)}/>
      <AiChatWidget />
    </>
  );
}
