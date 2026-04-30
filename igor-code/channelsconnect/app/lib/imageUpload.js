/**
 * imageUpload.js — Supabase Storage image upload with hi-res conversion
 *
 * Converts images to the correct resolution for hotel channel distribution
 * (Expedia, Booking.com, etc.) before uploading to Supabase Storage.
 *
 * Target spec (OTA standard):
 *   - Min 2048px on the longest side
 *   - Max 4096px (avoid oversized)
 *   - JPEG, quality 92
 *   - Aspect ratio preserved
 *
 * Does NOT touch channex-http.client.ts, webhook controllers, or ARI sync.
 */

import { supabase } from './supabase';

// ⚠️ Canonical bucket name — must match Supabase Storage bucket exactly.
// If you see "Bucket not found", create a PUBLIC bucket named 'property-media' in
// Supabase Dashboard → Storage → New Bucket.
const BUCKET = 'property-media';

// OTA channel target resolution
const OTA_MAX_PX = 4096;
const OTA_MIN_PX = 2048;
const OTA_QUALITY = 0.92;

/**
 * Convert a File/Blob to a hi-res OTA-ready JPEG using Canvas.
 * Returns a new Blob (JPEG).
 */
export async function convertToOtaResolution(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      const longest = Math.max(width, height);

      // Scale up if below minimum
      if (longest < OTA_MIN_PX) {
        const scale = OTA_MIN_PX / longest;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      // Scale down if above maximum
      if (longest > OTA_MAX_PX) {
        const scale = OTA_MAX_PX / longest;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      // Improve quality with imageSmoothingQuality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Canvas conversion failed'));
          resolve(blob);
        },
        'image/jpeg',
        OTA_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for conversion'));
    };

    img.src = objectUrl;
  });
}

/**
 * Upload a single image file to Supabase Storage.
 * Converts to OTA resolution first.
 * Returns { publicUrl } on success, throws on failure.
 */
export async function uploadImageToSupabase({ file, listingId, onProgress }) {
  // Step 1: Convert to hi-res OTA JPEG
  onProgress?.(10);
  let blob;
  try {
    blob = await convertToOtaResolution(file);
  } catch {
    // If conversion fails (e.g. unsupported format), use original
    blob = file;
  }
  onProgress?.(30);

  // Step 2: Build storage path
  const ext = 'jpg';
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_').replace(/\.[^.]+$/, '');
  const timestamp = Date.now();
  const storagePath = `listings/${listingId}/${timestamp}_${safeName}.${ext}`;

  // Step 3: Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, blob, {
      contentType: 'image/jpeg',
      upsert: false,
      duplex: 'half',
    });

  onProgress?.(85);

  if (error) {
    // Surface a clear, actionable message for the "Bucket not found" case
    if (
      error.message?.toLowerCase().includes('bucket not found') ||
      error.message?.toLowerCase().includes('the resource was not found') ||
      error.statusCode === 404 ||
      error.error === 'Bucket not found'
    ) {
      const msg =
        "Admin setup required: Create a public bucket named 'property-media' in Supabase.";
      console.error('[ImageUpload]', msg, error);
      throw new Error(msg);
    }
    throw new Error(error.message || 'Storage upload failed');
  }

  // Step 4: Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path);

  onProgress?.(100);

  return { publicUrl: urlData.publicUrl, storagePath: data.path };
}

/**
 * Save image metadata to the property_images table via Supabase directly.
 * Returns the inserted row.
 */
export async function saveImageRecord({ listingId, filename, url, storagePath, sortOrder, isCover }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('property_images')
    .insert({
      listing_id: listingId,
      user_id: user.id,
      filename,
      url,
      storage_path: storagePath,
      sort_order: sortOrder ?? 0,
      is_cover: isCover ?? false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to save image record');
  return data;
}

/**
 * Fetch all images for a listing from Supabase, ordered by sort_order.
 */
export async function fetchListingImages(listingId) {
  const { data, error } = await supabase
    .from('property_images')
    .select('*')
    .eq('listing_id', listingId)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Delete an image record (and optionally the storage file).
 */
export async function deleteImageRecord(imageId, storagePath) {
  const { error } = await supabase
    .from('property_images')
    .delete()
    .eq('id', imageId);

  if (error) throw new Error(error.message);

  // Best-effort storage deletion
  if (storagePath) {
    await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
  }
}

/**
 * Update a single image record field(s).
 */
export async function updateImageRecord(imageId, fields) {
  const { error } = await supabase
    .from('property_images')
    .update(fields)
    .eq('id', imageId);

  if (error) throw new Error(error.message);
}
