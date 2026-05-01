/**
 * CloudinaryImageManager.jsx — Fault-Tolerant Bulk Media Pipeline
 *
 * Implements the 5-step enterprise upload spec:
 *   Step 1  Client-side compression (max 1920px, <1MB, WebP/JPEG)
 *   Step 2  Session preflight (refresh token before batch starts)
 *   Step 3  Concurrency limiter (max 3 workers, Promise.allSettled — never aborts batch)
 *   Step 4  Partial-success handling + atomic bulk DB INSERT for fulfilled uploads
 *   Step 5  UI lock during upload + granular progress + beforeunload guard
 *
 * SAFE: Zero dependency on Channex sync, webhook, or ARI logic.
 */

const MAX_CONCURRENT = 3;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  UploadCloud, CheckCircle, AlertCircle, Loader2, Image as ImageIcon,
  Trash2, Star, ArrowUp, ArrowDown, Eye, X, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  compressImage,
  refreshSessionPreflight,
  uploadBlobToSupabase,
  bulkSaveImageRecords,
  fetchListingImages,
  deleteImageRecord,
  updateImageRecord,
} from '../../lib/imageUpload';

// ─── Per-Image Status ─────────────────────────────────────────────────────────
// idle | compressing | uploading | success | error

// ─── Image Card ───────────────────────────────────────────────────────────────
const ImageCard = ({ image, index, total, onDelete, onSetCover, onMoveUp, onMoveDown, isDeleting }) => (
  <div className="relative group bg-white rounded-lg border shadow-sm overflow-hidden">
    <div className="aspect-video relative bg-slate-100">
      <img
        src={image.highResUrl || image.url}
        alt={image.filename}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {(image.isCover || image.is_cover) && (
        <Badge className="absolute top-2 left-2 bg-yellow-500 text-white text-xs">
          <Star className="w-3 h-3 mr-1" />Cover
        </Badge>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
        {!(image.isCover || image.is_cover) && (
          <Button size="sm" variant="secondary" onClick={() => onSetCover(image.id)} title="Set as cover">
            <Star className="w-4 h-4" />
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => window.open(image.highResUrl || image.url, '_blank')}>
          <Eye className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onDelete(image.id, image.storagePath || image.storage_path)}
          disabled={isDeleting === image.id}
        >
          {isDeleting === image.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </Button>
      </div>
    </div>
    <div className="p-2 flex items-center justify-between gap-1">
      <p className="text-xs font-medium truncate flex-1">{image.filename}</p>
      <div className="flex gap-1 flex-shrink-0">
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onMoveUp(index)} disabled={index === 0}>
          <ArrowUp className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onMoveDown(index)} disabled={index === total - 1}>
          <ArrowDown className="w-3 h-3" />
        </Button>
      </div>
    </div>
  </div>
);

// ─── Pending File Row ─────────────────────────────────────────────────────────
const PendingFileRow = ({ item, onRemove, isUploading }) => {
  const statusIcon = {
    idle:        <ImageIcon className="w-4 h-4 text-slate-400" />,
    compressing: <Loader2  className="w-4 h-4 text-blue-500 animate-spin" />,
    uploading:   <Loader2  className="w-4 h-4 text-blue-500 animate-spin" />,
    success:     <CheckCircle className="w-4 h-4 text-emerald-500" />,
    error:       <AlertCircle className="w-4 h-4 text-red-500" />,
  }[item.status] ?? null;

  const statusLabel = {
    idle:        'Queued',
    compressing: 'Compressing…',
    uploading:   `Uploading ${item.progress}%`,
    success:     'Done',
    error:       item.error || 'Failed',
  }[item.status] ?? '';

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm
      ${item.status === 'success' ? 'bg-emerald-50 border-emerald-200' :
        item.status === 'error'   ? 'bg-red-50 border-red-200' :
        'bg-slate-50 border-slate-200'}`}
    >
      {item.preview ? (
        <img src={item.preview} alt="" className="w-10 h-10 object-cover rounded flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 bg-slate-200 rounded flex-shrink-0 flex items-center justify-center">
          {statusIcon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-xs">{item.file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {statusIcon}
          <span className={`text-xs ${item.status === 'error' ? 'text-red-600' : 'text-slate-500'}`}>
            {statusLabel}
          </span>
        </div>
        {(item.status === 'compressing' || item.status === 'uploading') && (
          <Progress value={item.progress} className="h-1 mt-1" />
        )}
      </div>
      {!isUploading && item.status !== 'success' && (
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 flex-shrink-0" onClick={() => onRemove(item.id)}>
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CloudinaryImageManager({ listingId }) {
  const [queue, setQueue]               = useState([]);          // files to upload
  const [existingImages, setExisting]   = useState([]);
  const [isLoadingImages, setLoadingImg]= useState(false);
  const [deletingId, setDeletingId]     = useState(null);

  // Upload phase state
  const [phase, setPhase]               = useState('idle'); // idle | preflight | uploading | done
  const [phaseLabel, setPhaseLabel]     = useState('');
  const [uploadedCount, setUploadedCount] = useState(0);
  const [failedCount, setFailedCount]   = useState(0);
  const [failedItems, setFailedItems]   = useState([]); // items to show in retry alert

  const fileInputRef = useRef(null);
  const isUploading  = phase === 'preflight' || phase === 'uploading';

  // ── beforeunload guard ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!isUploading) return;
      e.preventDefault();
      e.returnValue = 'Upload in progress. Leaving now will cancel remaining uploads.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isUploading]);

  // ── Load existing images ───────────────────────────────────────────────────
  const fetchImages = useCallback(async () => {
    if (!listingId) return;
    setLoadingImg(true);
    try {
      setExisting(await fetchListingImages(listingId));
    } catch (err) {
      toast.error('Could not load images: ' + err.message);
    } finally {
      setLoadingImg(false);
    }
  }, [listingId]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  // ── Add files to queue ─────────────────────────────────────────────────────
  const addFiles = (fileList) => {
    const valid = Array.from(fileList)
      .filter((f) => {
        if (!f.type.startsWith('image/')) { toast.error(`${f.name}: not an image`); return false; }
        if (f.size > 50 * 1024 * 1024)    { toast.error(`${f.name}: exceeds 50MB`); return false; }
        return true;
      })
      .map((f) => ({
        id:       crypto.randomUUID(),
        file:     f,
        status:   'idle',
        progress: 0,
        error:    null,
        preview:  URL.createObjectURL(f),
        blob:     null, // set after compression
        result:   null, // set after upload { publicUrl, storagePath }
      }));

    if (valid.length === 0) return;
    setQueue((q) => [...q, ...valid]);
    setPhase('idle');
    setFailedItems([]);
  };

  const removeFromQueue = (id) => {
    setQueue((q) => {
      const item = q.find((f) => f.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return q.filter((f) => f.id !== id);
    });
  };

  const updateItem = (id, patch) =>
    setQueue((q) => q.map((f) => f.id === id ? { ...f, ...patch } : f));

  // ── Main upload handler ────────────────────────────────────────────────────
  const handleUpload = async () => {
    const pending = queue.filter((f) => f.status === 'idle' || f.status === 'error');
    if (pending.length === 0 || isUploading) return;

    setPhase('preflight');
    setPhaseLabel('Establishing secure session…');
    setUploadedCount(0);
    setFailedCount(0);
    setFailedItems([]);

    // STEP 2: Session preflight — refresh token once before batch
    try {
      await refreshSessionPreflight();
    } catch (err) {
      setPhase('idle');
      toast.error(err.message);
      return;
    }

    setPhase('uploading');
    const total = pending.length;
    let doneCount = 0;

    // Per-item pipeline: compress → upload
    const processOne = async (item) => {
      // STEP 1: Compress
      updateItem(item.id, { status: 'compressing', progress: 5 });
      setPhaseLabel(`Compressing… (${++doneCount} of ${total})`);

      let blob;
      try {
        blob = await compressImage(item.file);
        updateItem(item.id, { blob, progress: 30 });
      } catch {
        blob = item.file; // fallback: use original
        updateItem(item.id, { blob: item.file, progress: 30 });
      }

      // STEP 3: Upload
      updateItem(item.id, { status: 'uploading' });
      setPhaseLabel(`Uploading ${doneCount} of ${total}…`);

      const result = await uploadBlobToSupabase({
        blob,
        file: item.file,
        listingId,
        onProgress: (p) => updateItem(item.id, { progress: 30 + Math.round(p * 0.7) }),
      });

      return result;
    };

    // STEP 3: Semaphore worker pool — max MAX_CONCURRENT, Promise.allSettled
    const workQueue  = [...pending];
    const results    = new Array(pending.length);
    let   workIndex  = 0;

    const worker = async () => {
      while (workIndex < pending.length) {
        const i    = workIndex++;
        const item = pending[i];
        try {
          results[i] = { status: 'fulfilled', value: { item, result: await processOne(item) } };
          updateItem(item.id, { status: 'success', progress: 100 });
        } catch (err) {
          results[i] = { status: 'rejected', reason: { item, error: err } };
          updateItem(item.id, { status: 'error', progress: 0, error: err.message || 'Upload failed' });
        }
      }
    };

    const workers = Array.from({ length: Math.min(MAX_CONCURRENT, pending.length) }, worker);
    await Promise.allSettled(workers);

    // STEP 4: Separate fulfilled vs rejected
    const fulfilled = results.filter((r) => r?.status === 'fulfilled').map((r) => r.value);
    const rejected  = results.filter((r) => r?.status === 'rejected').map((r) => r.reason);

    const successCount = fulfilled.length;
    const failCount    = rejected.length;

    // Atomic bulk INSERT for all successful uploads in a single DB call
    if (fulfilled.length > 0) {
      try {
        const currentCount = existingImages.length;
        const records = fulfilled.map(({ item, result }, idx) => ({
          listingId,
          filename:    item.file.name,
          url:         result.publicUrl,
          storagePath: result.storagePath,
          sortOrder:   currentCount + idx,
          isCover:     currentCount === 0 && idx === 0,
        }));

        await bulkSaveImageRecords(records);
      } catch (err) {
        toast.error('Images uploaded but failed to save metadata: ' + err.message);
      }
    }

    setUploadedCount(successCount);
    setFailedCount(failCount);
    setFailedItems(rejected.map((r) => ({ id: r.item.id, name: r.item.file.name, error: r.error.message })));
    setPhase('done');

    if (failCount === 0) {
      toast.success(`${successCount} image${successCount !== 1 ? 's' : ''} uploaded successfully ✓`);
    } else if (successCount > 0) {
      toast.warning(`${successCount} uploaded, ${failCount} failed — see retry below`);
    } else {
      toast.error(`All ${failCount} uploads failed`);
    }

    await fetchImages();

    // Auto-clear successful items after 4 s (keep failed ones for retry)
    setTimeout(() => {
      setQueue((q) => q.filter((f) => f.status !== 'success'));
      if (failCount === 0) setPhase('idle');
    }, 4000);
  };

  // ── Retry failed items ─────────────────────────────────────────────────────
  const retryFailed = () => {
    setQueue((q) => q.map((f) =>
      f.status === 'error' ? { ...f, status: 'idle', progress: 0, error: null } : f
    ));
    setPhase('idle');
    setFailedItems([]);
  };

  // ── Reorder existing images ────────────────────────────────────────────────
  const moveImage = useCallback(async (index, direction) => {
    const images = [...existingImages];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= images.length) return;
    [images[index], images[target]] = [images[target], images[index]];
    setExisting(images);
    try {
      await Promise.all([
        updateImageRecord(images[index].id, { sortOrder: index }),
        updateImageRecord(images[target].id, { sortOrder: target }),
      ]);
    } catch {
      await fetchImages(); // revert on failure
    }
  }, [existingImages, fetchImages]);

  // ── Set cover ─────────────────────────────────────────────────────────────
  const handleSetCover = useCallback(async (imageId) => {
    try {
      await Promise.all(
        existingImages.map((img) =>
          updateImageRecord(img.id, { isCover: img.id === imageId })
        )
      );
      await fetchImages();
      toast.success('Cover photo updated');
    } catch (err) {
      toast.error('Could not update cover: ' + err.message);
    }
  }, [existingImages, fetchImages]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (imageId, storagePath) => {
    if (!confirm('Delete this image? This cannot be undone.')) return;
    setDeletingId(imageId);
    try {
      await deleteImageRecord(imageId, storagePath);
      await fetchImages();
      toast.success('Image deleted');
    } catch (err) {
      toast.error('Delete failed: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  }, [fetchImages]);

  // ─────────────────────────────────────────────────────────────────────────
  const pendingQueue = queue.filter((f) => f.status !== 'success');
  const hasQueue     = pendingQueue.length > 0;
  const idleItems    = queue.filter((f) => f.status === 'idle').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-500" />
            Property Media
            {existingImages.length > 0 && (
              <Badge variant="secondary">{existingImages.length} uploaded</Badge>
            )}
          </span>
          <Button variant="outline" size="sm" onClick={fetchImages} disabled={isLoadingImages}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoadingImages ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          Upload up to 30 images. Images are compressed to max 1920px before upload.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* ── Drop Zone ─────────────────────────────────────────────────── */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors
            ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 hover:border-blue-400'}
            ${hasQueue ? 'border-blue-300 bg-blue-50/30' : 'border-slate-300'}`}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); if (!isUploading) addFiles(e.dataTransfer.files); }}
          onDragOver={(e) => e.preventDefault()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
            disabled={isUploading}
          />
          <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          {hasQueue ? (
            <p className="text-sm font-medium text-blue-700">
              {queue.length} image{queue.length !== 1 ? 's' : ''} queued — click to add more
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-blue-600">Click to browse or drag &amp; drop</p>
              <p className="text-xs text-slate-500 mt-1">JPEG, PNG, WebP, HEIC — max 50MB per file</p>
            </>
          )}
        </div>

        {/* ── Phase progress banner ──────────────────────────────────────── */}
        {isUploading && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-800">{phaseLabel}</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Do not close this tab — upload in progress.
              </p>
            </div>
          </div>
        )}

        {/* ── Partial failure alert with Retry ──────────────────────────── */}
        {phase === 'done' && failedCount > 0 && (
          <Alert className="border-amber-300 bg-amber-50">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm">
                <strong>{uploadedCount}</strong> image{uploadedCount !== 1 ? 's' : ''} uploaded
                successfully. <strong className="text-red-600">{failedCount} failed</strong>:&nbsp;
                {failedItems.slice(0, 3).map((f) => f.name).join(', ')}
                {failedItems.length > 3 && ` +${failedItems.length - 3} more`}
              </span>
              <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-100" onClick={retryFailed}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Retry Failed
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* ── Queue list ─────────────────────────────────────────────────── */}
        {pendingQueue.length > 0 && (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {pendingQueue.map((item) => (
              <PendingFileRow
                key={item.id}
                item={item}
                onRemove={removeFromQueue}
                isUploading={isUploading}
              />
            ))}
          </div>
        )}

        {/* ── Upload button ──────────────────────────────────────────────── */}
        {idleItems > 0 && (
          <Button
            className="w-full"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{phaseLabel}</>
              : <><UploadCloud className="w-4 h-4 mr-2" />Upload {idleItems} Image{idleItems !== 1 ? 's' : ''}</>
            }
          </Button>
        )}

        {/* ── Existing images grid ───────────────────────────────────────── */}
        {isLoadingImages ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : existingImages.length > 0 ? (
          <div>
            <p className="text-sm font-medium text-slate-600 mb-3">
              Uploaded Images ({existingImages.length})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {existingImages.map((img, i) => (
                <ImageCard
                  key={img.id}
                  image={img}
                  index={i}
                  total={existingImages.length}
                  onDelete={handleDelete}
                  onSetCover={handleSetCover}
                  onMoveUp={(idx) => moveImage(idx, 'up')}
                  onMoveDown={(idx) => moveImage(idx, 'down')}
                  isDeleting={deletingId}
                />
              ))}
            </div>
          </div>
        ) : (
          !isLoadingImages && !hasQueue && (
            <div className="text-center py-8 text-slate-400">
              <ImageIcon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No images uploaded yet</p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
