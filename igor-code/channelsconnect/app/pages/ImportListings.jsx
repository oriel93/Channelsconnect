import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/app/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Loader2,
  Home,
  FileSpreadsheet
} from 'lucide-react';
import AirbnbPlatformConnect from '../components/channels/AirbnbPlatformConnect';
import NewLoginRequired from '../components/auth/NewLoginRequired';
import { User } from '@/api/entities';
import { Listing } from '@/api/entities';
import { createPageUrl } from '@/utils';

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

const ImportListings = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('airbnb');
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
    toast.success("Sync complete! Refreshing your property list...");
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
            Connect your existing properties in minutes. We'll automatically sync everything for you.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('airbnb')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'airbnb'
                    ? 'border-[#FF5A5F] text-[#FF5A5F]'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Airbnb
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
            {activeTab === 'airbnb' && (
              <AirbnbPlatformConnect onImportComplete={handleImportComplete} />
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
              Recently Imported Properties ({importedListings.length})
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
                      <div className="flex items-center gap-2 mt-1">
                        {listing.maxGuests && (
                          <span className="text-xs text-slate-600">{listing.maxGuests} guests</span>
                        )}
                        {listing.beds24RoomId && (
                          <Badge variant="outline" className="text-xs">Beds24</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
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