
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PropertyImage } from '@/api/entities';
import { getCloudinarySignature } from '@/api/functions';
import { saveImageMetadata } from '@/api/functions';
import { 
  UploadCloud, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Image as ImageIcon, 
  Trash2, 
  X, 
  Hourglass,
  Star,
  ArrowUp,
  ArrowDown,
  Eye,
  Download,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';

const ImageCard = ({ image, index, totalImages, onDelete, onSetCover, onMoveUp, onMoveDown, isDeleting }) => (
  <div className="relative group bg-white rounded-lg border shadow-sm overflow-hidden">
    <div className="aspect-video relative">
      <img 
        src={image.url} 
        alt={image.filename} 
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {image.is_cover && (
        <Badge className="absolute top-2 left-2 bg-yellow-500 text-white">
          <Star className="w-3 h-3 mr-1" />
          Cover Photo
        </Badge>
      )}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="flex gap-2">
          {!image.is_cover && (
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => onSetCover(image.id)}
              title="Set as cover photo"
            >
              <Star className="w-4 h-4" />
            </Button>
          )}
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => window.open(image.url, '_blank')}
            title="View full size"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            variant="destructive"
            onClick={() => onDelete(image.id)}
            disabled={isDeleting === image.id}
            title="Delete image"
          >
            {isDeleting === image.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
    <div className="p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium truncate pr-2">{image.filename}</p>
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            title="Move up"
          >
            <ArrowUp className="w-3 h-3" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => onMoveDown(index)}
            disabled={index === totalImages - 1}
            title="Move down"
          >
            <ArrowDown className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Order: {image.sort_order + 1} • {(new Date(image.created_date)).toLocaleDateString()}
      </p>
    </div>
  </div>
);

export default function CloudinaryImageManager({ listingId }) {
    const [filesToUpload, setFilesToUpload] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const [uploadStatus, setUploadStatus] = useState('idle');
    const [isLoadingImages, setIsLoadingImages] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [uploadStats, setUploadStats] = useState({ total: 0, completed: 0, failed: 0 });

    const fetchImages = useCallback(async () => {
        if (!listingId) return;
        setIsLoadingImages(true);
        try {
            const images = await PropertyImage.filter({ listing_id: listingId }, 'sort_order');
            setExistingImages(images);
        } catch (err) {
            toast.error("Failed to load existing images.");
        } finally {
            setIsLoadingImages(false);
        }
    }, [listingId]);

    useEffect(() => {
        fetchImages();
    }, [fetchImages]);

    const addFiles = (newFiles) => {
        const validFiles = Array.from(newFiles).filter(file => {
          if (!file.type.startsWith('image/')) {
            toast.error(`${file.name} is not an image file.`);
            return false;
          }
          if (file.size > 20 * 1024 * 1024) { // 20MB limit
            toast.error(`${file.name} is too large (max 20MB).`);
            return false;
          }
          return true;
        }).map(file => ({ 
          file, 
          status: 'pending', 
          progress: 0, 
          error: null, 
          id: crypto.randomUUID(),
          preview: URL.createObjectURL(file)
        }));
        
        setFilesToUpload(prev => [...prev, ...validFiles]);
    };
    
    const removeFile = (idToRemove) => {
        setFilesToUpload(prev => {
            const fileToRemove = prev.find(item => item.id === idToRemove);
            if (fileToRemove?.preview) {
                URL.revokeObjectURL(fileToRemove.preview);
            }
            return prev.filter(item => item.id !== idToRemove);
        });
    };

    const handleUpload = async () => {
        if (filesToUpload.length === 0) return;
        setUploadStatus('uploading');
        setUploadStats({ total: filesToUpload.length, completed: 0, failed: 0 });

        for (const fileItem of filesToUpload) {
            if (fileItem.status !== 'pending') continue;

            try {
                // Update file status to uploading
                setFilesToUpload(prev => prev.map(f => 
                    f.id === fileItem.id ? {...f, status: 'uploading', progress: 10} : f
                ));

                // 1. Get secure signature from backend
                const { data: sigData } = await getCloudinarySignature({ 
                    listingId, 
                    filename: fileItem.file.name 
                });
                
                if (!sigData.success) throw new Error(sigData.error);
                
                // Update progress
                setFilesToUpload(prev => prev.map(f => 
                    f.id === fileItem.id ? {...f, progress: 30} : f
                ));
                
                // 2. Upload directly to Cloudinary - only include the signed parameters
                const formData = new FormData();
                formData.append('file', fileItem.file);
                formData.append('api_key', sigData.api_key);
                formData.append('timestamp', sigData.timestamp);
                formData.append('signature', sigData.signature);
                formData.append('folder', sigData.folder);
                formData.append('public_id', sigData.public_id);
                formData.append('transformation', sigData.transformation);
                // Note: resource_type is not needed for image uploads, it defaults to 'image'
                
                const xhr = new XMLHttpRequest();
                xhr.open('POST', `https://api.cloudinary.com/v1_1/${sigData.cloud_name}/image/upload`, true);

                // Track upload progress
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const progress = Math.round(30 + (event.loaded / event.total) * 60); // 30-90%
                        setFilesToUpload(prev => prev.map(f => 
                            f.id === fileItem.id ? {...f, progress} : f
                        ));
                    }
                };
                
                await new Promise((resolve, reject) => {
                    xhr.onload = async () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            let cloudinaryResponse;
                            try {
                                cloudinaryResponse = JSON.parse(xhr.responseText);
                            } catch (e) {
                                return reject(new Error('Invalid response from Cloudinary'));
                            }

                            // Update progress to 95%
                            setFilesToUpload(prev => prev.map(f =>
                                f.id === fileItem.id ? {...f, progress: 95} : f
                            ));

                            // 3. Save metadata to database
                            await saveImageMetadata({
                                listingId,
                                filename: fileItem.file.name,
                                url: cloudinaryResponse.secure_url
                            });

                            // Mark as complete
                            setFilesToUpload(prev => prev.map(f =>
                                f.id === fileItem.id ? {...f, status: 'success', progress: 100} : f
                            ));

                            setUploadStats(prev => ({ ...prev, completed: prev.completed + 1 }));
                            resolve(cloudinaryResponse);
                        } else {
                            let errorResponse;
                            try {
                                errorResponse = JSON.parse(xhr.responseText);
                            } catch (e) {
                                errorResponse = {};
                            }
                            reject(new Error(errorResponse.error?.message || 'Upload failed'));
                        }
                    };
                    xhr.onerror = () => reject(new Error("Network error during upload."));
                    xhr.send(formData);
                });

            } catch (error) {
                console.error(`Upload error for ${fileItem.file.name}:`, error);
                setFilesToUpload(prev => prev.map(f => 
                    f.id === fileItem.id ? {...f, status: 'error', error: error.message} : f
                ));
                setUploadStats(prev => ({ ...prev, failed: prev.failed + 1 }));
            }
        }
        
        await fetchImages();
        setUploadStatus('completed');

        // Capture current failed count to avoid stale closure
        const failedCount = filesToUpload.filter(f => f.status === 'error').length;

        // Auto-clear successful uploads after 3 seconds
        setTimeout(() => {
            setFilesToUpload(prev => prev.filter(f => f.status !== 'success'));
            if (failedCount === 0) {
                setUploadStatus('idle');
            }
        }, 3000);
    };
    
    const handleDelete = async (imageId) => {
        if (!window.confirm('Are you sure you want to delete this image?')) return;
        setDeletingId(imageId);
        try {
            await PropertyImage.delete(imageId);
            toast.success("Image deleted successfully.");
            setExistingImages(prev => prev.filter(img => img.id !== imageId));
        } catch(err) {
            toast.error("Failed to delete image.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleSetCover = async (imageId) => {
        try {
            // First, remove cover status from all images
            const currentCover = existingImages.find(img => img.is_cover);
            if (currentCover) {
                await PropertyImage.update(currentCover.id, { is_cover: false });
            }
            
            // Set new cover image
            await PropertyImage.update(imageId, { is_cover: true });
            toast.success("Cover photo updated.");
            await fetchImages();
        } catch(err) {
            toast.error("Failed to update cover photo.");
        }
    };

    const handleMoveImage = async (currentIndex, direction) => {
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= existingImages.length) return;

        try {
            const imageA = existingImages[currentIndex];
            const imageB = existingImages[newIndex];
            
            // Swap sort orders
            await PropertyImage.update(imageA.id, { sort_order: imageB.sort_order });
            await PropertyImage.update(imageB.id, { sort_order: imageA.sort_order });
            
            await fetchImages();
            toast.success("Image order updated.");
        } catch(err) {
            toast.error("Failed to reorder images.");
        }
    };

    const clearAllFiles = () => {
        filesToUpload.forEach(item => {
            if (item.preview) URL.revokeObjectURL(item.preview);
        });
        setFilesToUpload([]);
        setUploadStatus('idle');
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Upload Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Upload New Photos</span>
                        {uploadStatus === 'uploading' && (
                            <Badge variant="secondary">
                                Uploading {Math.min(uploadStats.completed + 1, uploadStats.total)} of {uploadStats.total}
                            </Badge>
                        )}
                    </CardTitle>
                    <CardDescription>
                        Add new images to this property. Direct upload to Cloudinary for optimal performance.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {uploadStatus === 'completed' && (
                        <Alert className="bg-green-50 border-green-200">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                                Upload completed! {uploadStats.completed} successful, {uploadStats.failed} failed.
                                {uploadStats.failed > 0 && " Check failed uploads below."}
                            </AlertDescription>
                        </Alert>
                    )}

                    <Label 
                        htmlFor={`image-upload-${listingId}`} 
                        onDrop={(e) => {e.preventDefault(); addFiles(e.dataTransfer.files);}}
                        onDragOver={(e) => e.preventDefault()}
                        className="w-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 text-center border-slate-300 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                        <UploadCloud className="w-12 h-12 text-slate-400 mb-3" />
                        <span className="font-semibold text-blue-600">Click to browse or drag & drop</span>
                        <span className="text-slate-500 mt-1 text-sm">PNG, JPG, WebP up to 20MB</span>
                        <Input 
                            id={`image-upload-${listingId}`} 
                            type="file" 
                            accept="image/jpeg,image/png,image/webp" 
                            onChange={(e) => addFiles(e.target.files)} 
                            multiple 
                            className="hidden" 
                        />
                    </Label>

                    {filesToUpload.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h4 className="font-medium">Upload Queue ({filesToUpload.length})</h4>
                                <Button variant="ghost" size="sm" onClick={clearAllFiles}>
                                    Clear All
                                </Button>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                {filesToUpload.map((item) => (
                                    <div key={item.id} className="bg-slate-50 p-3 rounded-md space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <img 
                                                    src={item.preview} 
                                                    alt="Preview" 
                                                    className="w-12 h-12 object-cover rounded border"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        {item.status === 'pending' && <Hourglass className="w-4 h-4 text-slate-400" />}
                                                        {item.status === 'uploading' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                                                        {item.status === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                                        {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                                                        <span className="truncate text-sm font-medium">{item.file.name}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500">
                                                        {(item.file.size / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                </div>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8" 
                                                onClick={() => removeFile(item.id)}
                                                disabled={item.status === 'uploading'}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        {item.status === 'uploading' && (
                                            <Progress value={item.progress} className="h-2" />
                                        )}
                                        {item.status === 'error' && (
                                            <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                                {item.error}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <Button 
                                onClick={handleUpload} 
                                disabled={uploadStatus === 'uploading' || filesToUpload.length === 0} 
                                size="lg" 
                                className="w-full"
                            >
                                {uploadStatus === 'uploading' ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Uploading {Math.min(uploadStats.completed + 1, uploadStats.total)} of {uploadStats.total}...
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="w-5 h-5 mr-2" />
                                        Upload {filesToUpload.length} Image{filesToUpload.length > 1 ? 's' : ''}
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Existing Images Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Property Photos ({existingImages.length})</span>
                        {existingImages.length > 0 && (
                            <Badge variant="outline">
                                {existingImages.filter(img => img.is_cover).length} cover
                            </Badge>
                        )}
                    </CardTitle>
                    <CardDescription>
                        Manage photos for this property. Drag to reorder, star to set as cover.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingImages ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : existingImages.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <ImageIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                            <h3 className="font-medium text-lg mb-2">No photos uploaded yet</h3>
                            <p>Upload your first photos using the panel on the left.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[32rem] overflow-y-auto">
                            {existingImages.map((image, index) => (
                                <ImageCard
                                    key={image.id}
                                    image={image}
                                    index={index}
                                    totalImages={existingImages.length}
                                    onDelete={handleDelete}
                                    onSetCover={handleSetCover}
                                    onMoveUp={() => handleMoveImage(index, 'up')}
                                    onMoveDown={() => handleMoveImage(index, 'down')}
                                    isDeleting={deletingId}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
