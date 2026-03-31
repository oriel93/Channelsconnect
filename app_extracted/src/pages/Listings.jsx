
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NewLoginRequired from '../components/auth/NewLoginRequired';
import AppLayout from '../components/app/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Listing } from '@/api/entities';
import { PropertyImage } from '@/api/entities';
import { Loader2, ImageOff, Eye, MapPin, Users, Bed, Bath, ExternalLink } from 'lucide-react';

const ListingsContent = () => {
    const [listings, setListings] = useState([]);
    const [images, setImages] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [userListings, userImages] = await Promise.all([
                    Listing.list('-created_date'),
                    PropertyImage.list()
                ]);
                
                setListings(userListings);

                const imagesByListing = userImages.reduce((acc, image) => {
                    if (!acc[image.listing_id]) acc[image.listing_id] = [];
                    acc[image.listing_id].push(image);
                    return acc;
                }, {});

                // Sort images within each listing group by cover status and sort order
                Object.keys(imagesByListing).forEach(listingId => {
                    imagesByListing[listingId].sort((a, b) => {
                        if (a.is_cover && !b.is_cover) return -1;
                        if (!a.is_cover && b.is_cover) return 1;
                        return (a.sort_order || 0) - (b.sort_order || 0);
                    });
                });
                setImages(imagesByListing);

            } catch (error) {
                console.error("Failed to fetch listings and images", error);
            }
            setIsLoading(false);
        };
        fetchData();
    }, []);

    const getCoverImageUrl = (listing) => {
        const listingImages = images[listing.id] || [];
        if (listingImages.length > 0) {
            // The images are pre-sorted, so the first one is the cover or the highest-ordered one.
            return listingImages[0].url;
        }
        if (listing.photos_sample && listing.photos_sample.length > 0) {
            return listing.photos_sample[0];
        }
        return null; // No image found
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
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Your Properties</h1>
            {listings.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg">
                    <ImageOff className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No listings yet</h3>
                    <p className="text-slate-500">Import your first listing to get started.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {listings.map(listing => {
                        const coverImageUrl = getCoverImageUrl(listing);
                        return (
                            <Link to={createPageUrl(`ListingDetail?id=${listing.id}`)} key={listing.id} className="block hover:shadow-lg transition-shadow duration-300 rounded-lg">
                                <Card className="h-full flex flex-col overflow-hidden">
                                    <div className="aspect-video bg-slate-100 overflow-hidden relative group">
                                        {coverImageUrl ? (
                                            <img 
                                                src={coverImageUrl} 
                                                alt={listing.name} 
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                                                <ImageOff className="w-12 h-12 mb-2" />
                                                <p className="text-sm font-medium">No Image</p>
                                            </div>
                                        )}
                                        {listing.external_source === 'airbnb' && (
                                            <div className="absolute top-3 right-3 bg-red-500 text-white w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold shadow-lg">A</div>
                                        )}
                                        {listing.external_source === 'booking' && (
                                            <div className="absolute top-3 right-3 bg-blue-600 text-white w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold shadow-lg">B</div>
                                        )}
                                    </div>

                                    <CardHeader className="pb-3 flex-grow">
                                        <CardTitle className="text-lg line-clamp-1 flex-1">{listing.name}</CardTitle>
                                        <CardDescription className="flex items-center gap-1 text-slate-600 pt-1">
                                            <MapPin className="w-4 h-4 flex-shrink-0" />
                                            <span className="line-clamp-1">{listing.address || "Address not available"}</span>
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="pt-0">
                                        <div className="flex justify-between items-center text-sm text-slate-600 mb-3">
                                            <div className="flex gap-4">
                                                {listing.bedrooms && <div className="flex items-center gap-1"><Bed className="w-4 h-4" /><span>{listing.bedrooms}</span></div>}
                                                {listing.bathrooms && <div className="flex items-center gap-1"><Bath className="w-4 h-4" /><span>{listing.bathrooms}</span></div>}
                                                {listing.max_guests && <div className="flex items-center gap-1"><Users className="w-4 h-4" /><span>{listing.max_guests}</span></div>}
                                            </div>
                                            {listing.sync_status === 'success' && <div className="w-2.5 h-2.5 bg-green-500 rounded-full" title={`Synced ${new Date(listing.last_synced_at).toLocaleDateString()}`}></div>}
                                            {listing.sync_status === 'error' && <div className="w-2.5 h-2.5 bg-red-500 rounded-full" title={`Sync Error: ${listing.sync_error}`}></div>}
                                        </div>
                                        
                                        {listing.default_net_rate && (
                                            <div className="text-right">
                                                <span className="text-lg font-bold text-slate-800">
                                                    ${listing.default_net_rate}
                                                </span>
                                                <span className="text-sm text-slate-500"> / night</span>
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
        document.title = "My Listings | Channels Connect";
    }, []);

    return (
        <NewLoginRequired>
            <AppLayout>
                <ListingsContent />
            </AppLayout>
        </NewLoginRequired>
    );
}
