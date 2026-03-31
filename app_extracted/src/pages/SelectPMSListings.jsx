import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import NewLoginRequired from '@/components/auth/NewLoginRequired';
import AppLayout from '@/components/app/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, Home, Calendar, Users, ArrowRight } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const PMS_LOGOS = {
  guesty: '🏠',
  hostaway: '🏡',
  hostfully: '🏘️',
  lodgify: '🏖️',
  track: '📊',
  ownerrez: '🏗️',
  rentalsunited: '🌍'
};

export default function SelectPMSListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(new Set());
  const [imported, setImported] = useState(new Set());
  const [errors, setErrors] = useState({});
  
  const location = useLocation();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(location.search);
  const pms = urlParams.get('pms') || '';

  useEffect(() => {
    if (!pms) {
      navigate(createPageUrl('ImportListings'));
      return;
    }
    document.title = `Import from ${pms.charAt(0).toUpperCase() + pms.slice(1)} | Channels Connect`;
    fetchPMSListings();
  }, [pms, navigate]);

  const fetchPMSListings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/functions/getPMSListings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ pms })
      });
      
      const result = await response.json();
      if (response.ok && result.success) {
        setListings(result.listings || []);
      } else {
        throw new Error(result.error || 'Failed to fetch listings');
      }
    } catch (error) {
      console.error('Failed to fetch PMS listings:', error);
      setErrors({ general: error.message });
      toast.error(`Error fetching listings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const importListing = async (pmsListingId, listingName) => {
    setImporting(prev => new Set([...prev, pmsListingId]));
    setErrors(prev => ({ ...prev, [pmsListingId]: null }));
    
    try {
      const response = await fetch(`/functions/importFromPMS`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ pms, pmsListingId })
      });
      
      const result = await response.json();
      if (response.ok && result.success) {
        setImported(prev => new Set([...prev, pmsListingId]));
        toast.success(`Successfully imported "${listingName}"`);
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (error) {
      console.error(`Failed to import ${listingName}:`, error);
      setErrors(prev => ({ ...prev, [pmsListingId]: error.message }));
      toast.error(`Failed to import "${listingName}": ${error.message}`);
    } finally {
      setImporting(prev => {
        const newSet = new Set(prev);
        newSet.delete(pmsListingId);
        return newSet;
      });
    }
  };

  const importAll = async () => {
    const unimportedListings = listings.filter(l => !imported.has(l.id));
    toast.info(`Starting import of ${unimportedListings.length} listings...`);
    for (const listing of unimportedListings) {
      await importListing(listing.id, listing.name);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    toast.info("Bulk import complete.");
  };

  if (loading) {
    return (
      <NewLoginRequired>
        <AppLayout>
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-slate-600">Loading your {pms} listings...</p>
            </div>
          </div>
        </AppLayout>
      </NewLoginRequired>
    );
  }

  return (
    <NewLoginRequired>
      <AppLayout>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                {PMS_LOGOS[pms]} Import from {pms.charAt(0).toUpperCase() + pms.slice(1)}
              </h1>
              <p className="text-slate-600 mt-2">
                Select the listings you want to import into Channels Connect
              </p>
            </div>
            
            {listings.length > 0 && (
              <div className="flex gap-3">
                <Button 
                  onClick={importAll}
                  disabled={importing.size > 0 || listings.every(l => imported.has(l.id))}
                >
                  {importing.size > 0 ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : null}
                  Import All
                </Button>
                <Button variant="secondary" onClick={() => navigate(createPageUrl('Dashboard'))}>
                  Go to Dashboard <ArrowRight className="w-4 h-4 ml-2"/>
                </Button>
              </div>
            )}
          </div>

          {errors.general && (
            <Card className="bg-red-50 border-red-200 mb-6">
                <CardContent className="p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600"/>
                    <p className="text-red-800">{errors.general}</p>
                </CardContent>
            </Card>
          )}

          {listings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Home className="w-12 h-12 text-slate-400 mx-auto mb-4"/>
                <h3 className="text-xl font-semibold text-slate-700">No Listings Found</h3>
                <p className="text-slate-500 mt-2">We couldn't find any listings in your {pms} account. Please check your PMS and try again.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map(listing => (
                <Card key={listing.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{listing.name}</CardTitle>
                    <CardDescription>{listing.address}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-sm text-slate-600">
                        <Badge variant="outline" className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3"/>
                            {listing.icalUrl ? 'Calendar Found' : 'No Calendar'}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1.5">
                            <Users className="w-3 h-3"/>
                            {listing.maxGuests || 'N/A'} Guests
                        </Badge>
                    </div>

                    {errors[listing.id] && <p className="text-xs text-red-500 mt-3">{errors[listing.id]}</p>}
                  </CardContent>
                  <CardContent>
                     <Button
                        className="w-full"
                        onClick={() => importListing(listing.id, listing.name)}
                        disabled={importing.has(listing.id) || imported.has(listing.id)}
                      >
                        {importing.has(listing.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : imported.has(listing.id) ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          'Import Listing'
                        )}
                      </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    </NewLoginRequired>
  );
}