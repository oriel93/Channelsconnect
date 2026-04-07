import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const channelLogos = {
    'booking.com': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/channels/bookingcom.png',
    'airbnb': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/channels/airbnb.png',
    'expedia': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/channels/expedia.png',
    'hotels.com': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/channels/hotelscom.png',
    'agoda': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/channels/agoda.png',
};

export default function ChannelStatusCard({ channelStatus, properties }) {
  const stats = useMemo(() => {
    const totalProperties = properties.length;
    const channelStats = {};

    const channels = ['booking.com', 'airbnb', 'expedia', 'hotels.com', 'agoda'];
    
    channels.forEach(channel => {
      const enabled = channelStatus.filter(p => p.channels[channel]).length;
      channelStats[channel] = {
        enabled,
        disabled: totalProperties - enabled,
        percentage: totalProperties > 0 ? Math.round((enabled / totalProperties) * 100) : 0
      };
    });

    return { totalProperties, channelStats };
  }, [channelStatus, properties]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
      <Card className="col-span-1 md:col-span-3 lg:col-span-1 flex flex-col justify-center items-center text-center p-6 bg-blue-50 border-blue-200">
        <CardTitle className="text-4xl font-bold text-blue-800">{stats.totalProperties}</CardTitle>
        <p className="text-sm font-medium text-blue-700">Total Properties</p>
      </Card>

      {Object.entries(stats.channelStats).map(([channel, data]) => (
        <Card key={channel} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm capitalize">{channel.replace('.com', '')}</h4>
            <img src={channelLogos[channel]} alt={channel} className="w-5 h-5 object-contain" />
          </div>
          <div className="text-2xl font-bold">{data.enabled} <span className="text-sm font-normal text-gray-500">/ {stats.totalProperties}</span></div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
            <div 
              className="bg-green-500 h-1.5 rounded-full"
              style={{ width: `${data.percentage}%` }}
            ></div>
          </div>
           <p className="text-xs text-gray-500 text-right mt-1">{data.percentage}% Coverage</p>
        </Card>
      ))}
    </div>
  );
}