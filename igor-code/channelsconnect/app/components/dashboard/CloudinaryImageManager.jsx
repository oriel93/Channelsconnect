/**
 * CloudinaryImageManager.jsx (renamed in spirit — now uses Supabase Storage)
 *
 * Handles multi-image upload with:
 *  - Hi-res OTA conversion (min 2048px, max 4096px, JPEG 92%)
 *  - Direct Supabase Storage upload
 *  - property_images table persistence
 *  - Cover photo + reordering
 *
 * SAFE: Zero changes to channex-http.client.ts, webhook controllers, or ARI sync.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  uploadImageToSupabase,
  saveImageRecord,
  fetchListingImages,
  deleteImageRecord,
  updateImageRecord,
} from '../../lib/imageUpload';

// ─── Image Card ───────────────────────────────────────────────────────────────

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
            <Button size="sm" variant="secondary" onClick={() => onSetCover(image.id)} title="Set as cover photo">
              <Star className="w-4 h-4" />
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => window.open(image.url, '_blank')} title="View full size">
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(image.id, image.storage_path)}
            disabled={isDeleting === image.id}
            title="Delete image"
          >
            {isDeleting === image.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
    <div className="p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium truncate pr-2">{image.filename}</p>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => onMoveUp(index)} disabled={index === 0} title="Move up">
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
        #{index + 1} · {new Date(image.created_at || image.created_date || Date.now()).toLocaleDateString()}
      </p>
    </div>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CloudinaryImageManager({ listingId }) {
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle | uploading | completed
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [uploadStats, setUploadStats] = useState({ total: 0, completed: 0, failed: 0 });

  // ── Fetch existing images ──────────────────────────────────────────────────
  const fetchImages = useCallback(async () => {
    if (!listingId) return;
    setIsLoadingImages(true);
    try {
      const images = await fetchListingImages(listingId);
      setExistingImages(images);
    } catch (err) {
      toast.error('Failed to load images: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoadingImages(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // ── Add files to queue ─────────────────────────────────────────────────────
  const addFiles = (newFiles) => {
    const valid = Array.from(newFiles)
      .filter((file) => {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file.`);
          return false;
        }
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 50MB limit.`);
          return false;
        }
        return true;
      })
      .map((file) => ({
        file,
        status: 'pending',
        progress: 0,
        error: null,
        id: crypto.randomUUID(),
        preview: URL.createObjectURL(file),
      }));

    setFilesToUpload((prev) => [...prev, ...valid]);
  };

  const removeFile = (id) => {
    setFilesToUpload((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const clearAllFiles = () => {
    filesToUpload.forEach((item) => { if (item.preview) URL.revokeObjectURL(item.preview); });
    setFilesToUpload([]);
    setUploadStatus('idle');
  };

  // ── Upload handler ─────────────────────────────────────────────────────────
  const handleUpload = async () => {
    const pending = filesToUpload.filter((f) => f.status === 'pending');
    if (pending.length === 0) return;

    setUploadStatus('uploading');
    setUploadStats({ total: pending.length, completed: 0, failed: 0 });

    for (const fileItem of pending) {
      // Mark as uploading
      setFilesToUpload((prev) => prev.map((f) => f.id === fileItem.id ? { ...f, status: 'uploading', progress: 5 } : f));

      try {
        // 1. Upload to Supabase Storage (with hi-res conversion inside)
        const { publicUrl, storagePath } = await uploadImageToSupabase({
          file: fileItem.file,
          listingId,
          onProgress: (pct) => {
            setFilesToUpload((prev) => prev.map((f) => f.id === fileItem.id ? { ...f, progress: pct } : f));
          },
        });

        // 2. Save metadata to DB
        const sortOrder = existingImages.length + filesToUpload.filter((f) => f.status === 'success').length;
        const isCover = existingImages.length === 0 && sortOrder === 0;

        await saveImageRecord({
          listingId,
          filename: fileItem.file.name,
          url: publicUrl,
          storagePath,
          sortOrder,
          isCover,
        });

        // Mark success
        setFilesToUpload((prev) => prev.map((f) => f.id === fileItem.id ? { ...f, status: 'success', progress: 100 } : f));
        setUploadStats((prev) => ({ ...prev, completed: prev.completed + 1 }));

      } catch (err) {
        console.error(`Upload error for ${fileItem.file.name}:`, err);
        setFilesToUpload((prev) => prev.map((f) => f.id === fileItem.id ? { ...f, status: 'error', error: err.message || 'Upload failed' } : f));
        setUploadStats((prev) => ({ ...prev, failed: prev.failed + 1 }));
      }
    }

    await fetchImages();
    setUploadStatus('completed');

    // Auto-clear successful uploads
    setTimeout(() => {
      setFilesToUpload((prev) => prev.filter((f) => f.status !== 'success'));
      setUploadStatus('idle');
    }, 3500);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (imageId, storagePath) => {
    if (!window.confirm('Delete this image?')) return;
    setDeletingId(imageId);
    try {
      await deleteImageRecord(imageId, storagePath);
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success('Image deleted.');
    } catch (err) {
      toast.error('Failed to delete: ' + (err.message || 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  // ── Set cover ──────────────────────────────────────────────────────────────
  const handleSetCover = async (imageId) => {
    try {
      const current = existingImages.find((img) => img.is_cover);
      if (current) await updateImageRecord(current.id, { is_cover: false });
      await updateImageRecord(imageId, { is_cover: true });
      toast.success('Cover photo updated.');
      await fetchImages();
    } catch (err) {
      toast.error('Failed to update cover: ' + (err.message || ''));
    }
  };

  // ── Reorder ────────────────────────────────────────────────────────────────
  const handleMoveImage = async (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= existingImages.length) return;
    try {
      const a = existingImages[index];
      const b = existingImages[newIndex];
      await updateImageRecord(a.id, { sort_order: b.sort_order });
      await updateImageRecord(b.id, { sort_order: a.sort_order });
      await fetchImages();
    } catch (err) {
      toast.error('Reorder failed: ' + (err.message || ''));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

      {/* ── Upload Section ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <UploadCloud className="w-5 h-5" />
              Upload Photos
            </span>
            {uploadStatus === 'uploading' && (
              <Badge variant="secondary">
                {uploadStats.completed}/{uploadStats.total} uploading…
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            Auto-converted to OTA hi-res spec (min 2048px, JPEG 92%) for Expedia &amp; Booking.com
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {uploadStatus === 'completed' && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {uploadStats.completed} uploaded successfully
                {uploadStats.failed > 0 && `, ${uploadStats.failed} failed`}.
              </AlertDescription>
            </Alert>
          )}

          {/* Drop Zone */}
          <Label
            htmlFor={`img-upload-${listingId}`}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            onDragOver={(e) => e.preventDefault()}
            className="w-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 text-center border-slate-300 cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <UploadCloud className="w-12 h-12 text-slate-400 mb-3" />
            <span className="font-semibold text-blue-600">Click to browse or drag &amp; drop</span>
            <span className="text-slate-500 mt-1 text-sm">PNG, JPG, WebP · up to 50MB · multiple files OK</span>
            <Input
              id={`img-upload-${listingId}`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => addFiles(e.target.files)}
              multiple
              className="hidden"
            />
          </Label>

          {/* Queue */}
          {filesToUpload.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-sm">Queue ({filesToUpload.length})</h4>
                <Button variant="ghost" size="sm" onClick={clearAllFiles} disabled={uploadStatus === 'uploading'}>
                  Clear all
                </Button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filesToUpload.map((item) => (
                  <div key={item.id} className="bg-slate-50 p-3 rounded-md space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img src={item.preview} alt="preview" className="w-12 h-12 object-cover rounded border flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {item.status === 'pending'   && <Hourglass className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                            {item.status === 'uploading' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />}
                            {item.status === 'success'   && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                            {item.status === 'error'     && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                            <span className="truncate text-sm font-medium">{item.file.name}</span>
                          </div>
                          <p className="text-xs text-slate-500">{(item.file.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => removeFile(item.id)}
                        disabled={item.status === 'uploading'}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    {item.status === 'uploading' && <Progress value={item.progress} className="h-1.5" />}
                    {item.status === 'error' && (
                      <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{item.error}</p>
                    )}
                  </div>
                ))}
              </div>

              <Button
                onClick={handleUpload}
                disabled={uploadStatus === 'uploading' || filesToUpload.filter(f => f.status === 'pending').length === 0}
                size="lg"
                className="w-full"
              >
                {uploadStatus === 'uploading' ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Uploading &amp; converting…</>
                ) : (
                  <><UploadCloud className="w-5 h-5 mr-2" />Upload {filesToUpload.filter(f => f.status === 'pending').length} Photo{filesToUpload.filter(f => f.status === 'pending').length !== 1 ? 's' : ''}</>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Existing Images ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Property Photos ({existingImages.length})</span>
            {existingImages.length > 0 && (
              <Badge variant="outline">{existingImages.filter(i => i.is_cover).length} cover</Badge>
            )}
          </CardTitle>
          <CardDescription>Star to set cover · arrows to reorder · hover to delete</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingImages ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : existingImages.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="font-medium mb-1">No photos yet</h3>
              <p className="text-sm">Upload photos using the panel on the left.</p>
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
