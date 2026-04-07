import React, { useState, useEffect } from 'react';
import { ImageOff, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PhotoGallery({ images = [] }) {
    const [sortedImages, setSortedImages] = useState([]);
    const [mainImage, setMainImage] = useState(null);

    useEffect(() => {
        if (images.length > 0) {
            const sorted = [...images].sort((a, b) => {
                if (a.is_cover && !b.is_cover) return -1;
                if (!a.is_cover && b.is_cover) return 1;
                return (a.sort_order || 0) - (b.sort_order || 0);
            });
            setSortedImages(sorted);
            setMainImage(sorted[0]);
        } else {
            setSortedImages([]);
            setMainImage(null);
        }
    }, [images]);

    if (!mainImage) {
        return (
            <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-lg border">
                <ImageOff className="w-12 h-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-medium text-slate-600">No photos available for this listing.</h3>
                <p className="text-sm text-slate-500">Please upload images via the Image Manager.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-video w-full bg-slate-100 rounded-lg overflow-hidden relative border">
                <img src={mainImage.url} alt={mainImage.filename} className="w-full h-full object-cover animate-fade-in" />
                {mainImage.is_cover && (
                    <Badge className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 shadow">
                        <Star className="w-4 h-4 mr-2" />
                        Cover Photo
                    </Badge>
                )}
            </div>

            {/* Thumbnails */}
            {sortedImages.length > 1 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                    {sortedImages.map(image => (
                        <div
                            key={image.id}
                            className={`aspect-square rounded-md overflow-hidden cursor-pointer border-2 transition-all duration-200 ${mainImage.id === image.id ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-transparent hover:border-blue-300'}`}
                            onClick={() => setMainImage(image)}
                        >
                            <img src={image.url} alt={image.filename} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}