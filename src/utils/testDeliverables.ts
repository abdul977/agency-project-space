// Test utility for deliverables functionality
import { supabase } from '@/integrations/supabase/client';

export const testDeliverableUpload = async () => {
  try {
    // Create a test file blob
    const testContent = `This is a test deliverable file for testing the download functionality.

Project: Test Project
Date: ${new Date().toISOString()}
Status: Test Complete

This file is used to verify that the deliverable download system is working correctly.`;

    const testFile = new File([testContent], 'test-deliverable.txt', {
      type: 'text/plain'
    });

    // Generate unique filename
    const fileName = `test-${Date.now()}-deliverable.txt`;
    const filePath = `deliverables/test/${fileName}`;

    console.log('Uploading test file to:', filePath);

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('deliverables')
      .upload(filePath, testFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading test file:', uploadError);
      return { success: false, error: uploadError };
    }

    console.log('File uploaded successfully:', uploadData);

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('deliverables')
      .getPublicUrl(filePath);

    console.log('File URL:', urlData.publicUrl);

    // Test creating signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('deliverables')
      .createSignedUrl(filePath, 3600);

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError);
      return { success: false, error: signedUrlError };
    }

    console.log('Signed URL created successfully:', signedUrlData.signedUrl);

    return {
      success: true,
      filePath,
      publicUrl: urlData.publicUrl,
      signedUrl: signedUrlData.signedUrl
    };

  } catch (error) {
    console.error('Error in test upload:', error);
    return { success: false, error };
  }
};

export const createTestDeliverable = async (projectId: string, filePath: string) => {
  try {
    const { data: deliverable, error } = await supabase
      .from('deliverables')
      .insert({
        project_id: projectId,
        title: 'Test Deliverable',
        description: 'This is a test deliverable for testing download functionality',
        deliverable_type: 'file',
        file_path: filePath,
        is_sent: true,
        sent_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating test deliverable:', error);
      return { success: false, error };
    }

    console.log('Test deliverable created:', deliverable);
    return { success: true, deliverable };

  } catch (error) {
    console.error('Error creating test deliverable:', error);
    return { success: false, error };
  }
};

export const testFullDeliverableFlow = async () => {
  console.log('Starting full deliverable test flow...');
  
  // Step 1: Upload test file
  const uploadResult = await testDeliverableUpload();
  if (!uploadResult.success) {
    console.error('Upload failed:', uploadResult.error);
    return uploadResult;
  }

  // Step 2: Create deliverable record
  const projectId = '545ca16d-3d92-4bd4-bd6e-1099abdb8b22'; // Use existing project
  const deliverableResult = await createTestDeliverable(projectId, uploadResult.filePath!);
  
  if (!deliverableResult.success) {
    console.error('Deliverable creation failed:', deliverableResult.error);
    return deliverableResult;
  }

  console.log('Full test flow completed successfully!');
  return {
    success: true,
    uploadResult,
    deliverableResult
  };
};

// Function to run from browser console
(window as any).testDeliverables = {
  testUpload: testDeliverableUpload,
  createDeliverable: createTestDeliverable,
  testFullFlow: testFullDeliverableFlow
};
