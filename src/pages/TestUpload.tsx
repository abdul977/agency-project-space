import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const TestUpload: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const testUpload = async () => {
    setIsUploading(true);
    
    try {
      // Check authentication
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to test upload",
          variant: "destructive",
        });
        return;
      }

      // Create a simple test file
      const testContent = 'This is a test file for upload functionality';
      const testFile = new File([testContent], 'test-upload.txt', { type: 'text/plain' });
      
      // Generate unique file path
      const fileName = `test-${Date.now()}.txt`;
      const filePath = `test-uploads/${fileName}`;

      console.log('Testing upload with:', {
        fileName,
        filePath,
        fileSize: testFile.size,
        fileType: testFile.type,
        userId: user.id
      });

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('deliverables')
        .upload(filePath, testFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: "Upload Failed",
          description: `Upload failed: ${uploadError.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Upload successful:', uploadData);
      toast({
        title: "Upload Successful",
        description: `Test file uploaded successfully to ${filePath}`,
      });

      // Clean up - delete the test file
      setTimeout(async () => {
        const { error: deleteError } = await supabase.storage
          .from('deliverables')
          .remove([filePath]);
        
        if (deleteError) {
          console.error('Cleanup error:', deleteError);
        } else {
          console.log('Test file cleaned up successfully');
        }
      }, 2000);

    } catch (error) {
      console.error('Test upload error:', error);
      toast({
        title: "Test Failed",
        description: "An unexpected error occurred during test",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">File Upload Test</h2>
      <p className="text-sm text-gray-600 mb-4">
        This will test if file upload to the deliverables bucket works correctly.
      </p>
      <Button
        onClick={testUpload}
        disabled={isUploading || !user}
        className="w-full"
      >
        {!user ? 'Please Login First' : isUploading ? 'Testing Upload...' : 'Test File Upload'}
      </Button>

      {!user && (
        <p className="text-sm text-red-600 mt-2">
          You need to be logged in to test file upload functionality.
        </p>
      )}
    </div>
  );
};

export default TestUpload;
