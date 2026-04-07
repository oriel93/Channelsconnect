import React, { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChannelConnection } from '@/api/entities';
import { User } from '@/api/entities';

export default function ConnectionSuccess() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateConnection = async () => {
      try {
        const user = await User.me();
        if (!user) return;

        // Mark the connection as successful
        const connections = await ChannelConnection.filter({ 
          user_id: user.id, 
          channel_type: 'channel_manager' 
        });

        if (connections.length > 0) {
          await ChannelConnection.update(connections[0].id, {
            connection_status: 'connected',
            connected_at: new Date().toISOString()
          });
        } else {
          await ChannelConnection.create({
            user_id: user.id,
            channel_type: 'channel_manager',
            connection_status: 'connected',
            connected_at: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error updating connection:', error);
      } finally {
        setLoading(false);
      }
    };

    updateConnection();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Processing connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
        
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          Airbnb Connected Successfully!
        </h1>
        
        <p className="text-slate-600 mb-6">
          Your Airbnb account has been securely connected via Channex. You can now import your properties and start managing them through Channels Connect.
        </p>
        
        <Link to={createPageUrl('ImportListings')}>
          <Button className="w-full bg-green-600 hover:bg-green-700">
            Continue to Import Properties
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
        
        <Link to={createPageUrl('Dashboard')} className="block mt-3">
          <Button variant="outline" className="w-full">
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}