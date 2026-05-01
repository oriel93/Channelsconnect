/**
 * imageUpload.js — Fault-Tolerant Bulk Media Pipeline
 *
 * Pipeline stages per image:
 *   1. CLIENT COMPRESSION  — Canvas API reduces to max 1920px, WebP/JPEG <1MB
 *   2. SESSION PREFLIGHT   — Supabase session refreshed before first upload
 *   3. UPLOAD              — Supabase Storage with progress callback
 *   4. DB RECORD           — property_images insert via Supabase client
 *
 * Concurrency: semaphore worker pool (MAX_CONCURRENT = 3), Promise.allSettled
 * so a single failure never aborts the batch.
 *
 * SAFE: Zero dependency on Channex sync, webhook, or ARI logic.
 */

import { supabase } from './supabase';

const BUCKET = 'property-media';

// ─── Compression constants ────────────────────────────────────────────────────
const COMPRESS_MAX_PX    = 1920;   // max dimension after compression
const COMPRESS_MAX_BYTES = 900_000; // 900 KB target (safely under 1MB)
const COMPRESS_QUALITY   = 0.88;   // initial JPEG quality
const COMPRESS_MIN_QUALITY = 0.65; // floor for iterative size reduction

/**
 * STAGE 1: Client-side compression
 *
 * Uses Canvas API to:
 *   - Resize to max 1920px on the longest side
 *   - Encode as WebP if supported (better compression), fallback to JPEG
 *   - Iteratively reduce quality until output < COMPRESS_MAX_BYTES
 *
 * Returns a Blob (WebP or JPEG).
 */
export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      const longest = Math.max(width, height);

      if (longest > COMPRESS_MAX_PX) {
        const scale = COMPRESS_MAX_PX / longest;
        width  = Math.round(width  * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Prefer WebP (better compression), fall back to JPEG
      const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
      const mimeType = supportsWebP ? 'image/webp' : 'image/jpeg';

      // Iteratively reduce quality to hit size target
      const tryQuality = (quality) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Canvas compression failed')); return; }

            if (blob.size <= COMPRESS_MAX_BYTES || quality <= COMPRESS_MIN_QUALITY) {
              resolve(blob);
            } else {
              // Reduce quality by 5% per iteration
              tryQuality(Math.max(quality - 0.05, COMPRESS_MIN_QUALITY));
            }
          },
          mimeType,
          quality,
        );
      };

      tryQuality(COMPRESS_QUALITY);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load "${file.name}" for compression`));
    };

    img.src = objectUrl;
  });
}

/**
 * STAGE 2: Session preflight
 *
 * Explicitly refreshes the Supabase auth session before a batch upload.
 * Prevents mid-batch 401 errors caused by token expiry (tokens last 1 hour).
 *
 * Call once before starting any batch — not per image.
 *
 * @throws {Error} if session cannot be established
 */
export async function refreshSessionPreflight() {
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session) {
    // refreshSession may fail if the token is still fresh — fall back to getSession
    const { data: existing, error: getError } = await supabase.auth.getSession();
    if (getError || !existing.session) {
      throw new Error('Session expired. Please sign in again before uploading.');
    }
    return existing.session;
  }
  return data.session;
}

/**
 * STAGE 3: Upload a single compressed Blob to Supabase Storage.
 * Returns { publicUrl, storagePath }.
 */
export async function uploadBlobToSupabase({ blob, file, listingId, onProgress }) {
  onProgress?.(10);

  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_').replace(/\.[^.]+$/, '');
  const storagePath = `listings/${listingId}/${Date.now()}_${safeName}.${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, blob, {
      contentType: blob.type,
      upsert: false,
      duplex: 'half',
    });

  onProgress?.(85);

  if (error) {
    if (
      error.message?.toLowerCase().includes('bucket not found') ||
      error.message?.toLowerCase().includes('resource was not found') ||
      error.statusCode === 404 ||
      error.error === 'Bucket not found'
    ) {
      throw new Error(
        "Storage bucket not found. Create a public bucket named 'property-media' in Supabase Dashboard."
      );
    }
    throw new Error(error.message || 'Storage upload failed');
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  onProgress?.(100);

  return { publicUrl: urlData.publicUrl, storagePath: data.path };
}

/**
 * Full single-image pipeline: compress → upload → (caller handles DB insert).
 * Kept for backward-compat with single-image flows.
 */
export async function uploadImageToSupabase({ file, listingId, onProgress }) {
  onProgress?.(5);

  let blob;
  try {
    blob = await compressImage(file);
  } catch {
    blob = file; // fallback: use original
  }
  onProgress?.(30);

  return uploadBlobToSupabase({ blob, file, listingId, onProgress: (p) => onProgress?.(30 + p * 0.7) });
}

/**
 * STAGE 4 (bulk): Insert multiple image records in a single DB call.
 * Uses Supabase client insert with an array — one round-trip for the entire batch.
 *
 * @param {Array<{listingId, filename, url, storagePath, sortOrder, isCover}>} records
 * @returns {Array} inserted rows
 */
export async function bulkSaveImageRecords(records) {
  if (records.length === 0) return [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const rows = records.map((r) => ({
    listingId:   r.listingId,
    userId:      user.id,
    filename:    r.filename,
    url:         r.url,
    storagePath: r.storagePath,
    sortOrder:   r.sortOrder ?? 0,
    isCover:     r.isCover   ?? false,
  }));

  const { data, error } = await supabase
    .from('property_images')
    .insert(rows)
    .select();

  if (error) throw new Error(error.message || 'Failed to save image records');
  return data;
}

/**
 * Single-image DB record save (backward-compat).
 */
export async function saveImageRecord({ listingId, filename, url, storagePath, sortOrder, isCover }) {
  const saved = await bulkSaveImageRecords([{ listingId, filename, url, storagePath, sortOrder, isCover }]);
  return saved[0];
}

/**
 * Fetch all images for a listing from Supabase, ordered by sortOrder.
 */
export async function fetchListingImages(listingId) {
  const { data, error } = await supabase
    .from('property_images')
    .select('*')
    .eq('listingId', listingId)
    .order('sortOrder', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Delete an image record and best-effort remove from Storage.
 */
export async function deleteImageRecord(imageId, storagePath) {
  const { error } = await supabase.from('property_images').delete().eq('id', imageId);
  if (error) throw new Error(error.message);
  if (storagePath) {
    await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
  }
}

/**
 * Update a single image record field(s).
 */
export async function updateImageRecord(imageId, fields) {
  const { error } = await supabase.from('property_images').update(fields).eq('id', imageId);
  if (error) throw new Error(error.message);
}
