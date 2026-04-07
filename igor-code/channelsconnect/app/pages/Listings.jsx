
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NewLoginRequired from '../components/auth/NewLoginRequired';
import AppLayout from '../components/app/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Listing } from '@/api/entities';
import { Loader2, Home, MapPin, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ListingsContent = () => {
    const [listings, setListings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const userListings = await Listing.find();
                setListings(userListings || []);
            } catch (error) {
                console.error("Failed to fetch listings", error);
                setListings([]);
            }
            setIsLoading(false);
        };
        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Your Properties</h1>
                <Link to={createPageUrl('ImportListings')}>
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Import Properties
                    </Button>
                </Link>
            </div>
            
            {listings.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg">
                    <Home className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No properties yet</h3>
                    <p className="text-slate-500 mb-4">Import your first property to get started.</p>
                    <Link to={createPageUrl('ImportListings')}>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Import Properties
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {listings.map(listing => (
                            <Link to={createPageUrl(`ListingDetail?id=${listing.id}`)} key={listing.id} className="block hover:shadow-lg transition-shadow duration-300 rounded-lg">
                                <Card className="h-full flex flex-col overflow-hidden">
                                <div className="aspect-video bg-slate-100 overflow-hidden relative group flex items-center justify-center">
                                    <Home className="w-12 h-12 text-slate-300" />
                                    {listing.beds24RoomId && (
                                        <div className="absolute top-3 right-3 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium shadow-lg">
                                            Synced
                                            </div>
                                        )}
                                    </div>

                                    <CardHeader className="pb-3 flex-grow">
                                    <CardTitle className="text-base line-clamp-2 flex-1">{listing.title}</CardTitle>
                                    {(listing.city || listing.country) && (
                                        <CardDescription className="flex items-center gap-1 text-slate-500 pt-1">
                                            <MapPin className="w-3 h-3 flex-shrink-0" />
                                            <span className="line-clamp-1 text-xs">
                                                {[listing.city, listing.state, listing.country].filter(Boolean).join(', ')}
                                            </span>
                                        </CardDescription>
                                    )}
                                    </CardHeader>

                                    <CardContent className="pt-0">
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-3 text-sm text-slate-600">
                                            {listing.maxGuests && (
                                                <div className="flex items-center gap-1">
                                                    <Users className="w-4 h-4" />
                                                    <span>{listing.maxGuests}</span>
                                            </div>
                                            )}
                                        </div>
                                        <Badge variant={listing.isActive ? "default" : "secondary"} className="text-xs">
                                            {listing.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                            </div>
                                    </CardContent>
                                </Card>
                            </Link>
                    ))}
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
