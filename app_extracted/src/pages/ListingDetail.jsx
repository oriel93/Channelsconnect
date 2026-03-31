
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NewLoginRequired from '../components/auth/NewLoginRequired';
import AppLayout from '../components/app/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Listing } from '@/api/entities';
import { PropertyImage } from '@/api/entities';
import { Loader2, ImageOff, ExternalLink, MapPin, Users, Bed, Bath, DollarSign, Calendar, Settings, Shield, RefreshCw, AlertCircle, Upload, Home } from 'lucide-react';
import PhotoGallery from '../components/listings/PhotoGallery';
import { Link } from 'react-router-dom';

const ListingDetailContent = () => {
    const [listing, setListing] = useState(null);
    const [images, setImages] = useState([]);
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
                const [listingData, imageData] = await Promise.all([
                    Listing.get(listingId),
                    PropertyImage.filter({ listing_id: listingId })
                ]);
                
                setListing(listingData);
                setImages(imageData);
                document.title = `${listingData.name} | Channels Connect`;

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
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-xl font-semibold text-red-700">An Error Occurred</h3>
                <p className="text-red-600">{error}</p>
                 <Link to={createPageUrl('Listings')}>
                    <Button variant="outline" className="mt-4">Back to Listings</Button>
                </Link>
            </div>
        );
    }
    
    if (!listing) return null;

    const hasRealImages = images.length > 0;

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold text-slate-800">{listing.name}</h1>
                <div className="flex items-center gap-4 mt-2 text-slate-600">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        <span>{listing.address}</span>
                    </div>
                    {listing.external_url && (
                        <a href={listing.external_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                            View on {listing.external_source} <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                </div>
            </div>

            {/* Banners & Badges */}
            <div className="flex flex-wrap items-center gap-4">
                <Badge variant="secondary" className="bg-green-100 text-green-800 text-sm py-1 px-3">
                    <Shield className="w-4 h-4 mr-2" /> Rate Guaranteed
                </Badge>
                {listing.external_source === 'airbnb' && (
                    <Badge variant="destructive" className="text-sm py-1 px-3">Airbnb</Badge>
                )}
                <Button variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" /> Re-sync with {listing.external_source}
                </Button>

                {!hasRealImages && listing.is_placeholder_photos && (
                    <div className="w-full bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-4 rounded-r-lg flex justify-between items-center">
                        <div className="flex items-center">
                            <Home className="w-5 h-5 mr-3" />
                            <div>
                                <p className="font-bold">Sample Photos Active</p>
                                <p className="text-sm">These are sample photos. Upload your actual property photos for the best guest experience.</p>
                            </div>
                        </div>
                        <Link to={createPageUrl(`ImageManager?listingId=${listingId}`)}>
                            <Button variant="outline" size="sm">
                                <Upload className="w-4 h-4 mr-2" /> Upload Photos
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            {/* Photo Gallery */}
            <PhotoGallery 
                images={hasRealImages ? images.map(i => i.url) : (listing.photos_sample || [])} 
                isPlaceholder={!hasRealImages && listing.is_placeholder_photos}
            />

            {/* Main Content Grid */}
            <div className="grid md:grid-cols-3 gap-8">
                {/* Left Column - Details */}
                <div className="md:col-span-2 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Property Details</CardTitle>
                        </CardHeader>
                        <CardContent className="grid sm:grid-cols-2 gap-6">
                            <DetailItem icon={Home} label="Property Type" value={listing.property_type || 'N/A'} />
                            <DetailItem icon={Users} label="Max Guests" value={listing.max_guests} />
                            <DetailItem icon={Bed} label="Bedrooms" value={listing.bedrooms} />
                            <DetailItem icon={Bath} label="Bathrooms" value={listing.bathrooms} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-700 whitespace-pre-wrap">{listing.description || 'No description provided.'}</p>
                        </CardContent>
                    </Card>

                </div>

                {/* Right Column - Pricing & Management */}
                <div className="space-y-8">
                    <Card className="bg-blue-50 border-blue-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-800">
                                <DollarSign className="w-6 h-6" />
                                <span>Pricing</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-blue-900">
                                ${listing.default_net_rate.toLocaleString()}
                                <span className="text-lg font-normal text-slate-600">/night</span>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">Default Net Rate</p>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="w-6 h-6" />
                                <span>Management</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Link to={createPageUrl(`Dashboard?listingId=${listingId}`)} className="w-full">
                                <Button className="w-full justify-start gap-2">
                                    <Calendar className="w-4 h-4" /> View Calendar
                                </Button>
                            </Link>
                            <Link to={createPageUrl(`ImageManager?listingId=${listingId}`)} className="w-full">
                                <Button variant="secondary" className="w-full justify-start gap-2">
                                    <Upload className="w-4 h-4" /> Manage Photos
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>

        </div>
    );
};

const DetailItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-4">
        <div className="bg-slate-100 p-2 rounded-lg">
            <Icon className="w-5 h-5 text-slate-600" />
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="text-lg font-semibold text-slate-800">{value}</p>
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
