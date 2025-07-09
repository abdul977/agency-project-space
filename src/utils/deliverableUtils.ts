// Utility functions for deliverable management
import { supabase } from '@/integrations/supabase/client';

export interface DeliverableValidationResult {
  isValid: boolean;
  fileExists: boolean;
  canCreateSignedUrl: boolean;
  error?: string;
}

/**
 * Validates if a deliverable file exists and can be downloaded
 */
export const validateDeliverableFile = async (filePath: string): Promise<DeliverableValidationResult> => {
  try {
    // Check if file exists by trying to get its metadata
    const { data: fileData, error: fileError } = await supabase.storage
      .from('deliverables')
      .list('', {
        search: filePath.split('/').pop() // Get just the filename
      });

    if (fileError) {
      return {
        isValid: false,
        fileExists: false,
        canCreateSignedUrl: false,
        error: `Error checking file existence: ${fileError.message}`
      };
    }

    const fileExists = fileData && fileData.length > 0;

    // Try to create a signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('deliverables')
      .createSignedUrl(filePath, 60); // Short expiry for validation

    const canCreateSignedUrl = !signedUrlError;

    return {
      isValid: fileExists && canCreateSignedUrl,
      fileExists,
      canCreateSignedUrl,
      error: signedUrlError?.message
    };

  } catch (error) {
    return {
      isValid: false,
      fileExists: false,
      canCreateSignedUrl: false,
      error: `Validation error: ${error}`
    };
  }
};

/**
 * Finds and reports broken deliverable files
 */
export const findBrokenDeliverables = async () => {
  try {
    // Get all file-type deliverables
    const { data: deliverables, error } = await supabase
      .from('deliverables')
      .select('id, title, file_path, project_id')
      .eq('deliverable_type', 'file')
      .not('file_path', 'is', null);

    if (error) {
      console.error('Error fetching deliverables:', error);
      return { success: false, error };
    }

    const brokenDeliverables = [];
    
    for (const deliverable of deliverables || []) {
      if (deliverable.file_path) {
        const validation = await validateDeliverableFile(deliverable.file_path);
        if (!validation.isValid) {
          brokenDeliverables.push({
            ...deliverable,
            validationError: validation.error
          });
        }
      }
    }

    return {
      success: true,
      total: deliverables?.length || 0,
      broken: brokenDeliverables.length,
      brokenDeliverables
    };

  } catch (error) {
    console.error('Error finding broken deliverables:', error);
    return { success: false, error };
  }
};

/**
 * Fixes a broken deliverable by marking it as URL type if it has a deliverable_url
 */
export const fixBrokenDeliverable = async (deliverableId: string) => {
  try {
    // Get the deliverable
    const { data: deliverable, error: fetchError } = await supabase
      .from('deliverables')
      .select('*')
      .eq('id', deliverableId)
      .single();

    if (fetchError || !deliverable) {
      return { success: false, error: 'Deliverable not found' };
    }

    // If it has a deliverable_url, convert it to URL type
    if (deliverable.deliverable_url) {
      const { error: updateError } = await supabase
        .from('deliverables')
        .update({
          deliverable_type: 'url',
          file_path: null // Clear the broken file path
        })
        .eq('id', deliverableId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true, action: 'converted_to_url' };
    } else {
      // No URL available, mark as broken or delete
      return { success: false, error: 'No alternative URL available' };
    }

  } catch (error) {
    return { success: false, error: `Fix error: ${error}` };
  }
};



// Make functions available in browser console for testing
if (typeof window !== 'undefined') {
  (window as any).deliverableUtils = {
    validateFile: validateDeliverableFile,
    findBroken: findBrokenDeliverables,
    fixBroken: fixBrokenDeliverable,
    createTest: createTestDeliverable
  };
}
