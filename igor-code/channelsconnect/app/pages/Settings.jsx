import React, { useEffect } from 'react';
import NewLoginRequired from '../components/auth/NewLoginRequired';
import AppLayout from '../components/app/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import PayoutsManager from '../components/dashboard/PayoutsManager';

export default function Settings() {
  useEffect(() => {
    document.title = "Settings | Channels Connect";
  }, []);

  return (
    <NewLoginRequired>
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6 py-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-600 mt-1">Manage your account and payout settings</p>
          </div>

          <PayoutsManager />
        </div>
      </AppLayout>
    </NewLoginRequired>
  );
}