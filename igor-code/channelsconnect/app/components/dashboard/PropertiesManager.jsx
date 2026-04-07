import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Plus, ImageOff, MapPin, Bed, Bath, Edit, Users } from 'lucide-react';
import { importBeds24Properties } from '@/api/functions';
import { toast } from 'sonner';

export default function PropertiesManager({ initialListings, onSelectListing, selectedListingId, onSyncComplete }) {
    const [listings, setListings] = useState(initialListings || []);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        setListings(initialListings);
    }, [initialListings]);

    const handleSyncFromBeds24 = async () => {
        setIsSyncing(true);
        toast.info("Syncing with your channel manager...");
        try {
            const { data } = await importBeds24Properties({});
            if (data.success) {
                toast.success(data.message || 'Sync completed!');
                if (onSyncComplete) {
                    onSyncComplete(); // Notify parent that sync is done to refetch all data
                }
            } else {
                throw new Error(data.error || 'Sync failed');
            }
        } catch (error) {
            console.error('Sync error:', error);
            toast.error(error.message || 'Failed to sync properties.');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Your Properties ({listings.length})</h2>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleSyncFromBeds24}
                        disabled={isSyncing}
                    >
                        {isSyncing ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing...</>
                        ) : (
                            <><RefreshCw className="w-4 h-4 mr-2" />Sync Properties</>
                        )}
                    </Button>
                    <Link to={createPageUrl('ImportListings')}>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Property
                        </Button>
                    </Link>
                </div>
            </div>
            {listings.length === 0 ? (
                 <div className="text-center py-12 bg-slate-50 rounded-lg">
                    <ImageOff className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Syncing might still be in progress</h3>
                    <p className="text-slate-500 mb-4">Click 'Sync Properties' again in a minute to fetch your listings.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {listings.map(listing => (
                        <div
                            key={listing.id}
                            className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedListingId === listing.id ? 'border-blue-500 ring-2 ring-blue-500' : 'hover:border-gray-300'}`}
                            onClick={() => onSelectListing(listing.id)}
                        >
                           <h3 className="font-semibold text-base text-gray-800 truncate">{listing.name}</h3>
                           <p className="text-sm text-gray-500 truncate mb-3 flex items-center gap-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" /> {listing.address || "No address"}
                            </p>
                            <div className="flex justify-between items-center text-xs text-gray-600">
                                <div className="flex gap-3">
                                    <span className="flex items-center gap-1"><Bed className="w-4 h-4" />{listing.bedrooms}</span>
                                    <span className="flex items-center gap-1"><Bath className="w-4 h-4" />{listing.bathrooms}</span>
                                    <span className="flex items-center gap-1"><Users className="w-4 h-4" />{listing.max_guests}</span>
                                </div>
                                <Link to={createPageUrl(`ListingDetail?id=${listing.id}`)} onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="sm"><Edit className="w-3 h-3 mr-1" /> Edit</Button>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
    );
}