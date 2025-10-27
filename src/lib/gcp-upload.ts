import { supabase } from '@/lib/supabase';

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
 * Upload REIT metadata to Supabase Storage
 */
export async function uploadReitMetadataToSupabase(
  metadata: ReitMetadata,
  reitId: string,
): Promise<string> {
  try {
    // Use REIT ID as filename
    const filename = `reit-metadata/${reitId}.json`;

    // Convert metadata to blob
    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: 'application/json',
    });

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, metadataBlob, {
        contentType: 'application/json',
        upsert: true, // Allow overwriting if file exists
      });

    if (error) {
      console.error('[SUPABASE UPLOAD] Upload error:', error);
      throw new Error(`Failed to upload metadata to Supabase: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to generate public URL for uploaded metadata');
    }

    const publicUrl = urlData.publicUrl;

    console.log('[SUPABASE UPLOAD] Metadata uploaded to:', publicUrl);
    console.log('[SUPABASE UPLOAD] REIT ID:', reitId);
    console.log('[SUPABASE UPLOAD] Metadata:', metadata);

    return publicUrl;
  } catch (error) {
    console.error('[SUPABASE UPLOAD] Error uploading metadata:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to upload metadata to Supabase: ${errorMessage}`);
  }
}