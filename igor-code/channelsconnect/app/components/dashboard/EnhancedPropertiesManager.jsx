import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Plus, ImageOff, MapPin, Bed, Bath, Edit, Users, Upload, FileSpreadsheet } from 'lucide-react';
import { enhancedImportBeds24Properties } from '@/api/functions';
import { enhancedExcelImport } from '@/api/functions';
import { toast } from 'sonner';

export default function EnhancedPropertiesManager({ initialListings, onSelectListing, selectedListingId, onSyncComplete }) {
    const [listings, setListings] = useState(initialListings || []);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isExcelUploading, setIsExcelUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => {
        setListings(initialListings);
    }, [initialListings]);

    const handleSyncFromChannex = async () => {
        setIsSyncing(true);
        toast.info("Syncing your properties, calendar data, and bookings...");
        try {
            const { data } = await enhancedImportBeds24Properties({});
            if (data.success) {
                toast.success(data.message || 'Enhanced sync completed!');
                if (onSyncComplete) {
                    onSyncComplete(); // Notify parent that sync is done to refetch all data
                }
            } else {
                throw new Error(data.error || 'Enhanced sync failed');
            }
        } catch (error) {
            console.error('Enhanced sync error:', error);
            toast.error(error.message || 'Failed to sync properties with enhanced features.');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleExcelUpload = async () => {
        if (!selectedFile) {
            toast.error("Please select an Excel file first.");
            return;
        }

        setIsExcelUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);

        toast.info("Uploading and processing Excel file...");
        
        try {
            const { data } = await enhancedExcelImport(formData);
            if (data.success) {
                toast.success(data.message || 'Excel import completed!');
                if (data.data.summary.errorRows > 0) {
                    toast.warning(`${data.data.summary.errorRows} rows had errors. Check console for details.`);
                    console.warn('Excel import errors:', data.data.errors);
                }
                if (onSyncComplete) {
                    onSyncComplete(); // Refresh dashboard data
                }
            } else {
                throw new Error(data.error || 'Excel import failed');
            }
        } catch (error) {
            console.error('Excel import error:', error);
            toast.error(error.message || 'Failed to import Excel file.');
        } finally {
            setIsExcelUploading(false);
            setSelectedFile(null);
        }
    };

    return (
        <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Your Properties ({listings.length})</h2>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleSyncFromChannex}
                        disabled={isSyncing}
                    >
                        {isSyncing ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enhanced Sync...</>
                        ) : (
                            <><RefreshCw className="w-4 h-4 mr-2" />Enhanced Sync</>
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

            {/* Enhanced Excel Upload Section */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center">
                    <FileSpreadsheet className="w-5 h-5 mr-2" />
                    Bulk Import from Excel
                </h3>
                <p className="text-blue-700 text-sm mb-3">
                    Upload an Excel file to create multiple properties and sync them to Channels Connect automatically.
                </p>
                
                <div className="flex items-center gap-3">
                    <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                        className="block w-full text-sm text-blue-900 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                        disabled={isExcelUploading}
                    />
                    <Button
                        onClick={handleExcelUpload}
                        disabled={!selectedFile || isExcelUploading}
                        variant="default"
                    >
                        {isExcelUploading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                        ) : (
                            <><Upload className="w-4 h-4 mr-2" />Import Properties</>
                        )}
                    </Button>
                </div>

                <div className="mt-3 text-xs text-blue-600">
                    <p><strong>Required columns:</strong> property_name, property_type, currency, address, city, country, room_name, max_occupancy, base_price</p>
                    <p><strong>Optional columns:</strong> description, bedrooms, bathrooms, room_size, airbnb_listing_id</p>
                </div>
            </div>

            {listings.length === 0 ? (
                 <div className="text-center py-12 bg-slate-50 rounded-lg">
                    <ImageOff className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Properties Found</h3>
                    <p className="text-slate-500 mb-4">
                        Use "Enhanced Sync" to import properties from your Channex account, or use "Add Property" to import from Airbnb.
                    </p>
                    <div className="space-y-2 text-sm text-slate-600">
                        <p>✅ Enhanced Sync imports: Properties + Calendar + Pricing + Bookings</p>
                        <p>✅ Excel Import creates and syncs your properties</p>
                        <p>✅ Two-way sync keeps everything synchronized</p>
                    </div>
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
                            
                            {/* Enhanced Property Info */}
                            <div className="mb-3 text-xs">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        listing.sync_status === 'success' ? 'bg-green-100 text-green-800' :
                                        listing.sync_status === 'syncing' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {listing.external_source || 'Local'} {listing.sync_status === 'success' ? '✓' : ''}
                                    </span>
                                    {listing.last_synced_at && (
                                        <span className="text-gray-500">
                                            Synced: {new Date(listing.last_synced_at).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </div>

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