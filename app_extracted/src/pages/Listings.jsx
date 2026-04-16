
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NewLoginRequired from '../components/auth/NewLoginRequired';
import AppLayout from '../components/app/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Listing, PropertyImage, User } from '@/api/entities';
import { Loader2, ImageOff, MapPin, Users, Bed, Bath, Plus, RefreshCw } from 'lucide-react';

// Sync status badge helper
const SyncBadge = ({ status }) => {
  if (!status) return null;
  const map = {
    active:  { label: 'Synced',   cls: 'bg-green-100 text-green-700 border-green-300' },
    pending: { label: 'Pending',  cls: 'bg-amber-100 text-amber-700 border-amber-300' },
    error:   { label: 'Error',    cls: 'bg-red-100 text-red-700 border-red-300' },
  };
  const cfg = map[status] || { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-300' };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-amber-400'}`} />
      {cfg.label}
    </span>
  );
};

const ListingsContent = () => {
    const [listings, setListings] = useState([]);
    const [images, setImages] = useState({});
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch user first to ensure we only show their listings
                const me = await User.me();
                setCurrentUser(me);

                const [userListings, userImages] = await Promise.all([
                    // Filter by userId for strict multi-tenancy — backend also enforces this
                    Listing.list('-created_date'),
                    PropertyImage.list(),
                ]);

                // Only show listings belonging to the current user
                const filteredListings = userListings.filter(
                    (l) => !l.user_id || l.user_id === me?.id
                );
                setListings(filteredListings);

                const imagesByListing = userImages.reduce((acc, image) => {
                    if (!acc[image.listing_id]) acc[image.listing_id] = [];
                    acc[image.listing_id].push(image);
                    return acc;
                }, {});

                // Sort images within each listing group: primary first, then by display_order
                Object.keys(imagesByListing).forEach((listingId) => {
                    imagesByListing[listingId].sort((a, b) => {
                        if (a.is_primary && !b.is_primary) return -1;
                        if (!a.is_primary && b.is_primary) return 1;
                        return (a.display_order || 0) - (b.display_order || 0);
                    });
                });
                setImages(imagesByListing);
            } catch (error) {
                console.error('Failed to fetch listings and images', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const getCoverImageUrl = (listing) => {
        const listingImages = images[listing.id] || [];
        if (listingImages.length > 0) {
            return listingImages[0].url;
        }
        // Fallback to any photo sample stored on the listing object
        if (listing.photos_sample && listing.photos_sample.length > 0) {
            return listing.photos_sample[0];
        }
        return null;
    };

    // Determine sync status from the channex_mapping relation if present
    const getSyncStatus = (listing) => {
        return listing.channex_sync_status || listing.sync_status || null;
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Your Properties</h1>
                <Link to={createPageUrl('ImportListings')}>
                    <Button size="sm" className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add Property
                    </Button>
                </Link>
            </div>

            {listings.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <ImageOff className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No listings yet</h3>
                    <p className="text-slate-500 mb-4">Connect your booking channels to import your properties.</p>
                    <Link to={createPageUrl('ImportListings')}>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Import Listings
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {listings.map((listing) => {
                        const coverImageUrl = getCoverImageUrl(listing);
                        const syncStatus = getSyncStatus(listing);
                        const listingImages = images[listing.id] || [];
                        return (
                            <Link
                                to={createPageUrl(`ListingDetail?id=${listing.id}`)}
                                key={listing.id}
                                className="block hover:shadow-lg transition-shadow duration-300 rounded-lg"
                            >
                                <Card className="h-full flex flex-col overflow-hidden">
                                    {/* Cover Image */}
                                    <div className="aspect-video bg-slate-100 overflow-hidden relative group">
                                        {coverImageUrl ? (
                                            <img
                                                src={coverImageUrl}
                                                alt={listing.title || listing.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                                                <ImageOff className="w-12 h-12 mb-2" />
                                                <p className="text-sm font-medium">No Image</p>
                                            </div>
                                        )}

                                        {/* Channel badges */}
                                        {(listing.external_source === 'airbnb' || listing.channel_type === 'airbnb') && (
                                            <div className="absolute top-3 right-3 bg-red-500 text-white w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold shadow-lg">
                                                A
                                            </div>
                                        )}
                                        {(listing.external_source === 'booking' || listing.channel_type === 'booking_com') && (
                                            <div className="absolute top-3 right-3 bg-blue-600 text-white w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold shadow-lg">
                                                B
                                            </div>
                                        )}

                                        {/* Photo count pill */}
                                        {listingImages.length > 1 && (
                                            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                                                {listingImages.length} photos
                                            </div>
                                        )}
                                    </div>

                                    <CardHeader className="pb-2 flex-grow">
                                        <div className="flex items-start justify-between gap-1">
                                            <CardTitle className="text-base line-clamp-1 flex-1">
                                                {listing.title || listing.name}
                                            </CardTitle>
                                            {syncStatus && <SyncBadge status={syncStatus} />}
                                        </div>
                                        <CardDescription className="flex items-center gap-1 text-slate-600 pt-1">
                                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span className="line-clamp-1 text-xs">
                                                {[listing.city, listing.country].filter(Boolean).join(', ') || listing.address || 'Location not set'}
                                            </span>
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="pt-0 pb-4">
                                        <div className="flex justify-between items-center text-sm text-slate-600 mb-2">
                                            <div className="flex gap-3">
                                                {(listing.beds || listing.bedrooms) && (
                                                    <div className="flex items-center gap-1">
                                                        <Bed className="w-4 h-4" />
                                                        <span>{listing.beds || listing.bedrooms}</span>
                                                    </div>
                                                )}
                                                {listing.bathrooms && (
                                                    <div className="flex items-center gap-1">
                                                        <Bath className="w-4 h-4" />
                                                        <span>{listing.bathrooms}</span>
                                                    </div>
                                                )}
                                                {(listing.max_guests || listing.maxGuests) && (
                                                    <div className="flex items-center gap-1">
                                                        <Users className="w-4 h-4" />
                                                        <span>{listing.max_guests || listing.maxGuests}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {(listing.base_price || listing.default_net_rate) && (
                                            <div className="text-right">
                                                <span className="text-lg font-bold text-slate-800">
                                                    {listing.currency || 'USD'} {listing.base_price || listing.default_net_rate}
                                                </span>
                                                <span className="text-xs text-slate-500"> / night</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default function Listings() {
    useEffect(() => {
        document.title = 'My Listings | Channels Connect';
    }, []);

    return (
        <NewLoginRequired>
            <AppLayout>
                <ListingsContent />
            </AppLayout>
        </NewLoginRequired>
    );
}
