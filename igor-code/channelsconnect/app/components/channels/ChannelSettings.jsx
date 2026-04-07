import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings, Save, Trash2, RefreshCw } from "lucide-react";

export default function ChannelSettings({ channel, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    commission_rate: channel.commission_rate || 0,
    auto_sync: true,
    send_notifications: true,
    ...channel.connection_details
  });

  const handleSave = async () => {
    const { auto_sync, send_notifications, ...connection_details } = formData;
    
    await onUpdate(channel.id, {
      commission_rate: formData.commission_rate,
      connection_details,
      last_sync: new Date().toISOString()
    });
    onClose();
  };

  const handleSync = async () => {
    await onUpdate(channel.id, {
      last_sync: new Date().toISOString()
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <Settings className="w-6 h-6" />
            {channel.name} Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Channel Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Channel Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Status</span>
                <Badge variant={channel.status === 'connected' ? 'default' : 'secondary'}>
                  {channel.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Type</span>
                <span className="font-medium capitalize">{channel.type}</span>
              </div>
              <div>
                <Label htmlFor="commission">Commission Rate (%)</Label>
                <Input
                  id="commission"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.commission_rate}
                  onChange={(e) => setFormData({...formData, commission_rate: parseFloat(e.target.value)})}
                />
              </div>
            </CardContent>
          </Card>

          {/* Connection Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Connection Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="api_key">API Key</Label>
                <Input
                  id="api_key"
                  type="password"
                  value={formData.api_key || ''}
                  onChange={(e) => setFormData({...formData, api_key: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="property_id">Property ID</Label>
                <Input
                  id="property_id"
                  value={formData.property_id || ''}
                  onChange={(e) => setFormData({...formData, property_id: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username || ''}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sync Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sync Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto_sync">Auto Sync</Label>
                  <p className="text-sm text-slate-500">Automatically sync rates and inventory</p>
                </div>
                <Switch
                  id="auto_sync"
                  checked={formData.auto_sync}
                  onCheckedChange={(checked) => setFormData({...formData, auto_sync: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifications">Notifications</Label>
                  <p className="text-sm text-slate-500">Receive booking notifications</p>
                </div>
                <Switch
                  id="notifications"
                  checked={formData.send_notifications}
                  onCheckedChange={(checked) => setFormData({...formData, send_notifications: checked})}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="destructive"
              onClick={() => onUpdate(channel.id, { status: 'disconnected' })}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Disconnect Channel
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleSync}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </Button>
              <Button onClick={handleSave} className="bg-slate-900 hover:bg-slate-800">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}