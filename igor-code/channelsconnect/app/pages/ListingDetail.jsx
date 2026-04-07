
import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NewLoginRequired from '../components/auth/NewLoginRequired';
import AppLayout from '../components/app/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Listing } from '@/api/entities';
import { Loader2, MapPin, Users, Bed, Bath, Calendar, Settings, Home, ArrowLeft } from 'lucide-react';

const ListingDetailContent = () => {
    const [listing, setListing] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const location = useLocation();
    const listingId = new URLSearchParams(location.search).get('id');

    useEffect(() => {
        if (!listingId) {
            setError("No listing ID provided.");
            setIsLoading(false);
            return;
        }

        const fetchListingData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const listingData = await Listing.findOne(listingId);
                setListing(listingData);
                document.title = `${listingData.title} | Channels Connect`;
            } catch (err) {
                console.error("Failed to fetch listing details", err);
                setError("Could not load listing details. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchListingData();
    }, [listingId]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] bg-red-50 rounded-lg">
                <Home className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-xl font-semibold text-red-700">An Error Occurred</h3>
                <p className="text-red-600">{error}</p>
                 <Link to={createPageUrl('Listings')}>
                    <Button variant="outline" className="mt-4">Back to Listings</Button>
                </Link>
            </div>
        );
    }
    
    if (!listing) return null;

    const locationString = [listing.city, listing.state, listing.country].filter(Boolean).join(', ');

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Back Button */}
            <Link to={createPageUrl('Listings')} className="inline-flex items-center text-slate-600 hover:text-slate-900">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Properties
            </Link>

            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Home className="w-8 h-8 text-slate-400" />
                        </div>
            <div>
                            <h1 className="text-2xl font-bold text-slate-900">{listing.title}</h1>
                            {locationString && (
                                <div className="flex items-center gap-2 mt-1 text-slate-600">
                                    <MapPin className="w-4 h-4" />
                                    <span>{locationString}</span>
                    </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                                <Badge variant={listing.isActive ? "default" : "secondary"}>
                                    {listing.isActive ? 'Active' : 'Inactive'}
                </Badge>
                                {listing.beds24RoomId && (
                                    <Badge variant="outline">Beds24</Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Property Details */}
                    <Card>
                        <CardHeader>
                        <CardTitle className="text-lg">Property Details</CardTitle>
                        </CardHeader>
                    <CardContent className="space-y-4">
                        <DetailItem icon={Home} label="Property Type" value={listing.propertyType || 'Not specified'} />
                        <DetailItem icon={Users} label="Max Guests" value={listing.maxGuests || 'Not specified'} />
                        <DetailItem icon={Bed} label="Bedrooms" value={listing.bedrooms || 'Not specified'} />
                        <DetailItem icon={Bath} label="Bathrooms" value={listing.bathrooms || 'Not specified'} />
                        </CardContent>
                    </Card>

                {/* Beds24 Info */}
                {(listing.beds24PropId || listing.beds24RoomId) && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Beds24 Integration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {listing.beds24PropId && (
                                <div>
                                    <p className="text-sm text-slate-500">Property ID</p>
                                    <p className="font-mono text-slate-900">{listing.beds24PropId}</p>
                                </div>
                            )}
                            {listing.beds24RoomId && (
                                <div>
                                    <p className="text-sm text-slate-500">Room ID</p>
                                    <p className="font-mono text-slate-900">{listing.beds24RoomId}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Location */}
                {listing.address && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Location</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p className="text-slate-700">{listing.address}</p>
                            {listing.postalCode && (
                                <p className="text-slate-600">{listing.postalCode}</p>
                            )}
                            {(listing.latitude && listing.longitude) && (
                                <p className="text-sm text-slate-500">
                                    Coordinates: {listing.latitude}, {listing.longitude}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}
                    
                {/* Management Actions */}
                    <Card>
                        <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Settings className="w-5 h-5" />
                            Management
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                        <Link to={createPageUrl('Dashboard')} className="block">
                                <Button className="w-full justify-start gap-2">
                                    <Calendar className="w-4 h-4" /> View Calendar
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
            </div>

            {/* Description */}
            {listing.description && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-700 whitespace-pre-wrap">{listing.description}</p>
                    </CardContent>
                </Card>
            )}

            {/* Additional Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Additional Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-slate-500">Currency</p>
                            <p className="font-medium text-slate-900">{listing.currency || 'USD'}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Minimum Nights</p>
                            <p className="font-medium text-slate-900">{listing.minNights || 1}</p>
                        </div>
                        {listing.maxNights && (
                            <div>
                                <p className="text-slate-500">Maximum Nights</p>
                                <p className="font-medium text-slate-900">{listing.maxNights}</p>
                            </div>
                        )}
                        {listing.checkInTime && (
                            <div>
                                <p className="text-slate-500">Check-in Time</p>
                                <p className="font-medium text-slate-900">{listing.checkInTime}</p>
                            </div>
                        )}
                        {listing.checkOutTime && (
                            <div>
                                <p className="text-slate-500">Check-out Time</p>
                                <p className="font-medium text-slate-900">{listing.checkOutTime}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-slate-500">Created</p>
                            <p className="font-medium text-slate-900">
                                {new Date(listing.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const DetailItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3">
        <div className="bg-slate-100 p-2 rounded-lg">
            <Icon className="w-4 h-4 text-slate-600" />
        </div>
        <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="font-medium text-slate-900">{value}</p>
        </div>
    </div>
);

export default function ListingDetail() {
    return (
        <NewLoginRequired>
            <AppLayout>
                <ListingDetailContent />
            </AppLayout>
        </NewLoginRequired>
    );
}
