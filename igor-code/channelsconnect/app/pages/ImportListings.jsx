import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/app/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Loader2,
  Home,
  RefreshCw,
  CheckCircle,
  FileSpreadsheet,
  Zap,
} from 'lucide-react';
import NewLoginRequired from '../components/auth/NewLoginRequired';
import { User } from '@/api/entities';
import { Listing } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { importChannexProperties } from '@/api/functions';
import { api } from '@/lib/apiClient';

const Breadcrumb = ({ crumbs }) => (
  <nav className="flex" aria-label="Breadcrumb">
    <ol className="inline-flex items-center space-x-1 md:space-x-2">
      {crumbs.map((crumb, index) => (
        <li key={index} className="inline-flex items-center">
          {index > 0 && (
            <svg className="w-3 h-3 text-gray-400 mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
            </svg>
          )}
          {crumb.path ? (
            <Link to={crumb.path} className="text-sm font-medium text-gray-700 hover:text-blue-600">
              {crumb.name}
            </Link>
          ) : (
            <span className="text-sm font-medium text-gray-500">{crumb.name}</span>
          )}
        </li>
      ))}
    </ol>
  </nav>
);

const ChannexSync = ({ onSyncComplete }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);

  const handleSync = async () => {
    setIsSyncing(true);
    toast.info('Syncing your properties from the channel manager...');
    try {
      const response = await api.channex.syncProperties();
      const count = response.data?.count ?? response.data?.properties?.length ?? 0;
      toast.success(`Sync complete! ${count > 0 ? `${count} properties imported.` : 'Properties updated.'}`);
      setLastSynced(new Date());
      if (onSyncComplete) onSyncComplete();
    } catch (error) {
      const msg = error?.response?.data?.message || error.message || 'Sync failed';
      toast.error(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">Sync Properties</CardTitle>
            {lastSynced && (
              <p className="text-xs text-slate-500 mt-0.5">
                Last synced: {lastSynced.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            Connected
          </div>
        </div>
        <CardDescription className="mt-2">
          Pull in all your properties, rates, and availability from your channel manager. Run this whenever you add new properties.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleSync}
          disabled={isSyncing}
          className="w-full"
          size="lg"
        >
          {isSyncing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing Properties...</>
          ) : (
            <><RefreshCw className="w-4 h-4 mr-2" />Sync All Properties</>
          )}
        </Button>
        <p className="text-xs text-slate-400 text-center mt-3">
          Properties, rates, and availability will be imported automatically.
        </p>
      </CardContent>
    </Card>
  );
};

const ImportListings = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sync');
  const [importedListings, setImportedListings] = useState([]);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      const listings = await Listing.find();
      setImportedListings(listings || []);
    } catch (error) {
      console.error('Error loading user/listings:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Import Your Listings | Channels Connect";
    loadInitialData();
  }, [loadInitialData]);

  const handleImportComplete = useCallback(() => {
    loadInitialData();
  }, [loadInitialData]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return <NewLoginRequired />;
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <Breadcrumb crumbs={[{ name: 'Import Listings' }]} />
          <h1 className="text-3xl font-bold text-slate-900 mt-4 mb-2">Import Your Listings</h1>
          <p className="text-slate-600">
            Sync your existing properties from your channel manager. Everything will be imported automatically.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('sync')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'sync'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Channel Manager
                </div>
              </button>
              <button
                onClick={() => setActiveTab('excel')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'excel'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel / CSV
                </div>
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'sync' && (
              <ChannexSync onSyncComplete={handleImportComplete} />
            )}

            {activeTab === 'excel' && (
              <div className="text-center py-12">
                <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Excel/CSV Import</h3>
                <p className="text-slate-600 mb-4">
                  Import multiple properties from a spreadsheet
                </p>
                <Button variant="outline" disabled>
                  Coming Soon
                </Button>
              </div>
            )}
          </div>
        </div>

        {importedListings.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Your Properties ({importedListings.length})
            </h2>
            <div className="grid gap-4">
              {importedListings.slice(0, 5).map((listing) => (
                <div key={listing.id} className="bg-white rounded-lg shadow-sm border p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                      <Home className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900 line-clamp-1">{listing.title}</h3>
                      <p className="text-sm text-slate-500">
                        {listing.city}{listing.state ? `, ${listing.state}` : ''}{listing.country ? `, ${listing.country}` : ''}
                      </p>
                      {listing.maxGuests && (
                        <span className="text-xs text-slate-600">{listing.maxGuests} guests</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {listing.beds24PropId && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        Synced
                      </Badge>
                    )}
                    <Badge variant={listing.isActive ? "default" : "secondary"} className="text-xs">
                      {listing.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {importedListings.length > 5 && (
              <div className="text-center mt-4">
                <Link to={createPageUrl('Listings')}>
                  <Button variant="outline">
                    View All Properties ({importedListings.length})
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ImportListings;
