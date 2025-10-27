import { supabaseAdmin } from '@/lib/supabase';

export interface ReitMetadata {
  name: string;
  symbol: string;
  description: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

// Supabase Storage Configuration
const BUCKET_NAME = 'cad-reit-token-metadata';

/**
 * Upload REIT metadata to Supabase Storage using service role (bypasses RLS)
 * Uses versioned filenames to bypass CDN caching on updates
 */
export async function uploadReitMetadataToSupabase(
  metadata: ReitMetadata,
  reitId: string,
  version?: number,
): Promise<string> {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available. Please check VITE_SUPABASE_SERVICE_ROLE_KEY environment variable.');
    }

    // Use versioned filename to bypass CDN caching
    // If no version provided, use timestamp to ensure uniqueness
    const versionSuffix = version !== undefined ? `v${version}` : `v${Date.now()}`;
    const filename = `reit-metadata/${reitId}-${versionSuffix}.json`;

    // Convert metadata to blob
    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: 'application/json',
    });

    // Upload to Supabase Storage using admin client (bypasses RLS)
    const { error, data } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filename, metadataBlob, {
        contentType: 'application/json',
        upsert: false, // Don't upsert with versioned filename
        cacheControl: '3600', // 1 hour browser cache
      });

    if (error) {
      console.error('[SUPABASE UPLOAD] Upload error:', error);
      throw new Error(`Failed to upload metadata to Supabase: ${error.message}`);
    }

    console.log('[SUPABASE UPLOAD] Upload response data:', data);

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to generate public URL for uploaded metadata');
    }

    const publicUrl = urlData.publicUrl;

    console.log('[SUPABASE UPLOAD] File successfully uploaded with version');
    console.log('[SUPABASE UPLOAD] Public URL:', publicUrl);
    console.log('[SUPABASE UPLOAD] REIT ID:', reitId);
    console.log('[SUPABASE UPLOAD] Version suffix:', versionSuffix);
    console.log('[SUPABASE UPLOAD] Metadata:', metadata);

    return publicUrl;
  } catch (error) {
    console.error('[SUPABASE UPLOAD] Error uploading metadata:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to upload metadata to Supabase: ${errorMessage}`);
  }
}