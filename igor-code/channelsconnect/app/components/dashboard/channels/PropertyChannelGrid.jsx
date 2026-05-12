import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ChevronDown, CheckCircle, XCircle } from 'lucide-react';
import { beds24ApiService } from '@/api/functions'; // no-op stub — channel toggles go through connected channels ARI
import { toast } from 'sonner';

const channelConfig = [
    { name: 'booking.com', displayName: 'Booking.com', icon: '🏨' },
    { name: 'airbnb', displayName: 'Airbnb', icon: '🏠' },
    { name: 'expedia', displayName: 'Expedia', icon: '✈️' },
    { name: 'hotels.com', displayName: 'Hotels.com', icon: '🏩' },
    { name: 'agoda', displayName: 'Agoda', icon: '🌏' }
];

export default function PropertyChannelGrid({ properties, channelStatus, onChannelToggle }) {
  const [updating, setUpdating] = useState({});
  const [expandedProperty, setExpandedProperty] = useState(null);

  const toggleChannel = async (propertyId, channelName, currentStatus) => {
    const key = `${propertyId}-${channelName}`;
    setUpdating(prev => ({ ...prev, [key]: true }));

    try {
      // Channel toggles are managed through our ARI engine — beds24ApiService is a no-op stub
      await beds24ApiService({
          action: 'manageChannelActivation',
          channelName: channelName,
          activate: !currentStatus
      });
      toast.success(`${channelName} ${!currentStatus ? 'enabled' : 'disabled'} successfully!`);
      onChannelToggle(); // Refresh data from parent
    } catch (error) {
      toast.error(`Failed to toggle ${channelName}: ${error.message}`);
    } finally {
      setUpdating(prev => ({ ...prev, [key]: false }));
    }
  };

  const getPropertyChannelStatus = (propertyId) => {
    return channelStatus.find(p => p.propertyId === propertyId)?.channels || {};
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Property Channel Management</CardTitle>
        <CardDescription>Individually manage channel connections for each of your properties.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {properties.map(property => {
          const propertyChannels = getPropertyChannelStatus(property.id);
          const isExpanded = expandedProperty === property.id;

          return (
            <div key={property.id} className="border rounded-lg overflow-hidden">
              <div 
                className="flex items-center p-4 cursor-pointer bg-gray-50 hover:bg-gray-100"
                onClick={() => setExpandedProperty(isExpanded ? null : property.id)}
              >
                <div className="flex-grow">
                  <h4 className="font-semibold">{property.name}</h4>
                  <p className="text-sm text-gray-500">{property.address}</p>
                </div>
                <div className="flex items-center gap-2">
                    {channelConfig.map(c => propertyChannels[c.name] && <span key={c.name} title={c.displayName}>{c.icon}</span>)}
                </div>
                <ChevronDown className={`w-5 h-5 ml-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </div>

              {isExpanded && (
                <div className="p-4 space-y-3">
                  {channelConfig.map(channel => {
                    const isEnabled = !!propertyChannels[channel.name];
                    const isUpdating = updating[`${property.id}-${channel.name}`];

                    return (
                      <div key={channel.name} className="flex items-center justify-between p-3 rounded-md hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                           <span className="text-xl">{channel.icon}</span>
                          <div>
                            <h5 className="font-medium">{channel.displayName}</h5>
                             <p className={`text-xs ${isEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                                {isEnabled ? 'Connected & Syncing' : 'Not Connected'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Switch checked={isEnabled} onCheckedChange={() => toggleChannel(property.id, channel.name, isEnabled)} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}