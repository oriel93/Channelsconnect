/**
 * imageUpload.js — Fault-Tolerant Bulk Media Pipeline
 *
 * Pipeline stages per image:
 *   1. CLIENT COMPRESSION  — Canvas API, max 1920px, WebP/JPEG, target <900 KB
 *   2. SESSION PREFLIGHT   — Explicit Supabase session refresh before batch
 *   3. STORAGE UPLOAD      — supabase.storage.from('property-media').upload(...)
 *   4. PUBLIC URL          — supabase.storage.from('property-media').getPublicUrl(...)
 *   5. DB INSERT           — property_images table, explicit column names
 *
 * DB column mapping (table has both camelCase Prisma cols AND snake_case DBA cols):
 *   listing_id    (uuid, nullable)  — DBA-added snake_case column
 *   storage_path  (text, nullable)  — DBA-added snake_case column
 *   listingId     (integer, NOT NULL) — Prisma-managed camelCase column
 *   storagePath   (text, nullable)  — Prisma-managed camelCase column
 *   userId        (text, NOT NULL)  — Prisma-managed
 *   url           (text, NOT NULL)  — shared
 *
 * We write all columns so the record is queryable via either convention.
 *
 * SAFE: Zero dependency on Channex sync, webhook, or ARI logic.
 */

import { supabase } from './supabase';

const BUCKET = 'property-media';

// ─── Compression constants ────────────────────────────────────────────────────

const COMPRESS_MAX_PX      = 1920;
const COMPRESS_MAX_BYTES   = 900_000; // 900 KB — safely under 1 MB
const COMPRESS_QUALITY     = 0.88;
const COMPRESS_MIN_QUALITY = 0.65;

/**
 * STAGE 1 — Client-side compression.
 *
 * - Resizes to max 1920px on the longest side
 * - Prefers WebP (better ratio), falls back to JPEG
 * - Iteratively reduces quality until output < 900 KB
 *
 * @returns {Promise<Blob>} WebP or JPEG blob
 */
export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img       = new Image();
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

      const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
      const mimeType     = supportsWebP ? 'image/webp' : 'image/jpeg';

      const tryQuality = (quality) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Canvas compression failed')); return; }
            if (blob.size <= COMPRESS_MAX_BYTES || quality <= COMPRESS_MIN_QUALITY) {
              resolve(blob);
            } else {
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
 * STAGE 2 — Session preflight.
 *
 * Refreshes the Supabase auth session before a batch upload.
 * Prevents 401 errors from stale JWT tokens (tokens expire after 1 hour).
 *
 * @throws {Error} if no valid session can be established
 */
export async function refreshSessionPreflight() {
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

  if (refreshError || !refreshData?.session) {
    // Token might still be fresh — fall back to getSession
    const { data: existingData, error: getError } = await supabase.auth.getSession();
    if (getError || !existingData?.session) {
      throw new Error('Session expired. Please sign in again before uploading.');
    }
    return existingData.session;
  }
  return refreshData.session;
}

/**
 * STAGE 3+4+5 — Upload a single compressed Blob to Supabase Storage,
 * retrieve the public URL, and insert into property_images.
 *
 * @param {object} params
 * @param {Blob}   params.blob        - Compressed image blob
 * @param {File}   params.file        - Original File (for name/type metadata)
 * @param {number}   params.listingId   - Integer listing ID
 * @param {function} [params.onProgress]  - Progress callback (0–100)
 *
 * @returns {{ publicUrl: string, storagePath: string }}
 */
/**
 * STAGE 3+4 — Upload a single compressed Blob to Supabase Storage
 * and retrieve the public URL. DB insert is handled separately in bulk
 * by bulkSaveImageRecords after the entire batch finishes.
 *
 * Exactly follows the directive:
 *   await supabase.storage.from('property-media').upload(filePath, file)
 *   const { data } = supabase.storage.from('property-media').getPublicUrl(filePath)
 *
 * @returns {{ publicUrl: string, storagePath: string }}
 */
export async function uploadBlobToSupabase({ blob, file, listingId, onProgress }) {
  onProgress?.(10);

  const ext      = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_').replace(/\.[^.]+$/, '');
  const filePath = `listings/${listingId}/${Date.now()}_${safeName}.${ext}`;

  // ── STAGE 3: upload ────────────────────────────────────────────────────────
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, blob, { contentType: blob.type, upsert: false });

  onProgress?.(85);

  if (uploadError) {
    const msg = uploadError.message || JSON.stringify(uploadError);
    if (
      msg.toLowerCase().includes('bucket not found') ||
      msg.toLowerCase().includes('resource was not found') ||
      uploadError.statusCode === 404 ||
      uploadError.error === 'Bucket not found'
    ) {
      throw new Error(
        "Storage bucket 'property-media' not found. " +
        'Create a public bucket with this name in Supabase Dashboard → Storage → New Bucket → toggle Public.'
      );
    }
    console.error('[imageUpload] Storage upload failed:', uploadError);
    throw new Error(`Storage upload failed: ${msg}`);
  }

  // ── STAGE 4: get public URL ────────────────────────────────────────────────
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(uploadData.path);

  onProgress?.(100);

  return { publicUrl: urlData.publicUrl, storagePath: uploadData.path };
}

export async function uploadImageToSupabase({ file, listingId, userId, onProgress }) {
  onProgress?.(5);

  let blob;
  try {
    blob = await compressImage(file);
  } catch {
    blob = file; // fallback: upload original if compression fails
  }
  onProgress?.(30);

  return uploadBlobToSupabase({
    blob,
    file,
    listingId,
    onProgress: (p) => onProgress?.(30 + p * 0.7),
  });
}

/**
 * Bulk save: insert multiple image records via the BACKEND (service-role).
 *
 * The frontend used to insert directly into property_images using the anon key.
 * That hit RLS (policy requires auth.role()='authenticated') and silently failed
 * when the Supabase session wasn't propagating on the request — result: file
 * landed in the bucket, no row in the table, image vanished from the manager.
 *
 * Now: POST /listings/:id/images on our backend, which uses service-role Prisma
 * to insert (and verifies listing ownership against the requesting user). The
 * controller does its own auth via the global Supabase JWT guard.
 *
 * @param {Array<{listingId, filename, url, storagePath, sortOrder, isCover, userId}>} records
 * @returns {Array} inserted rows
 */
export async function bulkSaveImageRecords(records) {
  if (records.length === 0) return [];

  // Group by listingId since the backend endpoint is per-listing.
  const byListing = new Map();
  for (const r of records) {
    if (!byListing.has(r.listingId)) byListing.set(r.listingId, []);
    byListing.get(r.listingId).push({
      url: r.url,
      storagePath: r.storagePath,
      filename: r.filename,
      sortOrder: r.sortOrder,
      isCover: r.isCover,
      caption: r.caption,
    });
  }

  // Lazy import apiClient to avoid a circular dep at module init.
  const { default: apiClient } = await import('./apiClient.js');

  const saved = [];
  for (const [listingId, listingRecords] of byListing) {
    const res = await apiClient.post(`/listings/${listingId}/images`, {
      records: listingRecords,
    });
    const rows = res?.data?.saved || res?.saved || [];
    saved.push(...rows);
  }
  return saved;
}

/**
 * Single-image DB record save (backward-compat).
 */
export async function saveImageRecord({ listingId, filename, url, storagePath, sortOrder, isCover }) {
  const { data: { user } } = await supabase.auth.getUser();
  const saved = await bulkSaveImageRecords([{
    listingId, filename, url, storagePath, sortOrder, isCover,
    userId: user?.id,
  }]);
  return saved[0];
}

/**
 * Fetch all images for a listing, ordered by sortOrder.
 * Tries camelCase column first (Prisma path), falls back to snake_case.
 */
export async function fetchListingImages(listingId) {
  // Go through the backend (service-role) so RLS can't filter rows out from
  // under us. Backend verifies ownership before returning.
  try {
    const { default: apiClient } = await import('./apiClient.js');
    const res = await apiClient.get(`/listings/${listingId}/images`);
    return res?.data?.images || [];
  } catch (err) {
    console.error('[imageUpload] fetchListingImages backend error:', err?.response?.data || err?.message || err);
    // Fallback: try anon-key query so the page doesn't go fully blank if the API
    // is unreachable. RLS may still hide some rows but it's better than nothing.
    const { data, error } = await supabase
      .from('property_images')
      .select('*')
      .eq('listingId', listingId)
      .order('sortOrder', { ascending: true });
    if (error) {
      console.error('[imageUpload] fetchListingImages fallback error:', error);
      throw new Error(error.message);
    }
    return data || [];
  }
}

/**
 * Delete an image record and best-effort remove from Storage.
 */
export async function deleteImageRecord(imageId, storagePath) {
  const { error } = await supabase.from('property_images').delete().eq('id', imageId);
  if (error) {
    console.error('[imageUpload] deleteImageRecord error:', error);
    throw new Error(error.message);
  }
  if (storagePath) {
    await supabase.storage.from(BUCKET).remove([storagePath]).catch((e) => {
      console.warn('[imageUpload] Storage remove failed (non-fatal):', e?.message);
    });
  }
}

/**
 * Update a single image record field(s).
 */
export async function updateImageRecord(imageId, fields) {
  const { error } = await supabase.from('property_images').update(fields).eq('id', imageId);
  if (error) {
    console.error('[imageUpload] updateImageRecord error:', error);
    throw new Error(error.message);
  }
}
