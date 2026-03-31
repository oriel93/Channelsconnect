
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import AppLayout from '../components/app/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Listing } from '@/api/entities';
import CloudinaryImageManager from '../components/dashboard/CloudinaryImageManager';
import { UploadCloud, CheckCircle, AlertCircle, Loader2, FileWarning, X, Hourglass, Building2, Image as ImageIcon } from 'lucide-react';
import NewLoginRequired from '../components/auth/NewLoginRequired';
import { toast } from 'sonner';

const ImageManagerContent = () => {
    const [selectedListingId, setSelectedListingId] = useState('');
    const [listings, setListings] = useState([]);
    const [isLoadingListings, setIsLoadingListings] = useState(true);
    const [error, setError] = useState(null);

    const fetchListings = useCallback(async () => {
        setIsLoadingListings(true);
        try {
            const userListings = await Listing.list('-created_date');
            setListings(userListings);
            if (userListings.length > 0 && !selectedListingId) {
                setSelectedListingId(userListings[0].id);
            }
        } catch (err) {
            console.error("Failed to fetch listings:", err);
            setError("Failed to load your properties. Please try refreshing the page.");
        } finally {
            setIsLoadingListings(false);
        }
    }, [selectedListingId]);

    useEffect(() => {
        document.title = "Image Manager | Channels Connect";
        fetchListings();
    }, [fetchListings]);

    const selectedListing = listings.find(l => l.id === selectedListingId);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Image Manager</h1>
                    <p className="text-slate-600 mt-2">
                        Upload and manage photos for your properties with automatic distribution to booking channels.
                    </p>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    <ImageIcon className="w-4 h-4 mr-1" />
                    Direct to Cloudinary
                </Badge>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {isLoadingListings ? (
                <Card>
                    <CardContent className="flex justify-center items-center h-64">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    </CardContent>
                </Card>
            ) : listings.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-12">
                        <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                        <h3 className="text-lg font-medium mb-2">No Properties Found</h3>
                        <p className="text-slate-600 mb-4">
                            You need to import some properties before you can manage their images.
                        </p>
                        <Button onClick={() => window.location.href = '/ImportListings'}>
                            Import Properties
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Property</CardTitle>
                            <CardDescription>
                                Choose which property you want to manage images for.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4 items-center">
                                <Label htmlFor="property-select" className="min-w-fit">Property:</Label>
                                <Select value={selectedListingId} onValueChange={setSelectedListingId}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Choose a property..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {listings.map(listing => (
                                            <SelectItem key={listing.id} value={listing.id}>
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4" />
                                                    <span>{listing.name}</span>
                                                    {listing.address && (
                                                        <span className="text-slate-500 text-sm">
                                                            • {listing.address.split(',')[0]}
                                                        </span>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            {selectedListing && (
                                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                                    <h4 className="font-medium mb-2">{selectedListing.name}</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600">
                                        {selectedListing.address && (
                                            <div>
                                                <span className="font-medium">Address:</span>
                                                <p>{selectedListing.address}</p>
                                            </div>
                                        )}
                                        {selectedListing.property_type && (
                                            <div>
                                                <span className="font-medium">Type:</span>
                                                <p>{selectedListing.property_type}</p>
                                            </div>
                                        )}
                                        {selectedListing.bedrooms && (
                                            <div>
                                                <span className="font-medium">Bedrooms:</span>
                                                <p>{selectedListing.bedrooms}</p>
                                            </div>
                                        )}
                                        {selectedListing.max_guests && (
                                            <div>
                                                <span className="font-medium">Max Guests:</span>
                                                <p>{selectedListing.max_guests}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {selectedListingId && (
                        <CloudinaryImageManager listingId={selectedListingId} />
                    )}
                </>
            )}
        </div>
    );
};

export default function ImageManager() {
    return (
        <NewLoginRequired>
            <AppLayout>
                <ImageManagerContent />
            </AppLayout>
        </NewLoginRequired>
    );
}
