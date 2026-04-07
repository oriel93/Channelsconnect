
import React from 'react';
import { Button } from '@/components/ui/button';
import { Zap, ShieldOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function BulkChannelActions({ onBulkAction }) {
  // Note: onBulkAction would trigger a backend function to perform these actions.
  // The current implementation is a UI placeholder.
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Bulk Actions</CardTitle>
        <CardDescription>Enable or disable all channels for all properties at once.</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-4">
        <Button onClick={() => onBulkAction('enable_all')}>
          <Zap className="w-4 h-4 mr-2" /> Enable All Channels
        </Button>
        <Button variant="destructive" onClick={() => onBulkAction('disable_all')}>
          <ShieldOff className="w-4 h-4 mr-2" /> Disable All Channels
        </Button>
      </CardContent>
    </Card>
  );
}
