import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Paperclip,
  X,
  Image,
  FileText,
  File,
  Download,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface InputAttachment {
  id: string;
  folder_input_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
}

interface FileUploadIconProps {
  inputId: string;
  attachments?: InputAttachment[];
  onAttachmentsChange?: (attachments: InputAttachment[]) => void;
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
}

const FileUploadIcon: React.FC<FileUploadIconProps> = ({
  inputId,
  attachments = [],
  onAttachmentsChange,
  maxFileSize = 10,
  allowedTypes = ['image/*', 'application/pdf', 'text/*']
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4 text-blue-500" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-4 w-4 text-red-500" />;
    } else {
      return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `File size must be less than ${maxFileSize}MB`,
        variant: "destructive",
      });
      return false;
    }

    // Check file type
    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isAllowed) {
      toast({
        title: "File type not allowed",
        description: "Please select an image, PDF, or text file",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!validateFile(file)) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Check authentication
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to upload files",
          variant: "destructive",
        });
        return;
      }

      // Generate unique file path
      const fileExtension = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
      const filePath = `input-attachments/${inputId}/${fileName}`;



      // Upload to Supabase Storage

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('deliverables')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        console.error('Upload error details:', {
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          error: uploadError.error
        });
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${file.name}: ${uploadError.message}`,
          variant: "destructive",
        });
        return;
      }

      setUploadProgress(50);

      // Save attachment record to database
      const { data: attachment, error: dbError } = await supabase
        .from('input_attachments')
        .insert({
          folder_input_id: inputId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        // Clean up uploaded file
        await supabase.storage.from('deliverables').remove([filePath]);
        toast({
          title: "Upload Failed",
          description: "Failed to save file information",
          variant: "destructive",
        });
        return;
      }

      setUploadProgress(100);

      // Update attachments list
      const newAttachments = [...attachments, attachment];
      onAttachmentsChange?.(newAttachments);

      toast({
        title: "File Uploaded",
        description: `${file.name} has been uploaded successfully`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAttachment = async (attachment: InputAttachment) => {
    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('input_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) {
        console.error('Database delete error:', dbError);
        toast({
          title: "Delete Failed",
          description: "Failed to delete file record",
          variant: "destructive",
        });
        return;
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('deliverables')
        .remove([attachment.file_path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Don't show error to user as the database record is already deleted
      }

      // Update attachments list
      const newAttachments = attachments.filter(a => a.id !== attachment.id);
      onAttachmentsChange?.(newAttachments);

      toast({
        title: "File Deleted",
        description: `${attachment.file_name} has been deleted`,
      });

    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleDownloadAttachment = async (attachment: InputAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('deliverables')
        .download(attachment.file_path);

      if (error) {
        console.error('Download error:', error);
        toast({
          title: "Download Failed",
          description: "Failed to download file",
          variant: "destructive",
        });
        return;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 relative"
            disabled={isUploading || !user}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
            {attachments.length > 0 && (
              <Badge 
                variant="secondary" 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
              >
                {attachments.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-3" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Attachments</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || !user}
                className="h-7 text-xs"
              >
                {!user ? 'Login Required' : 'Add File'}
              </Button>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Uploading...</div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {attachments.length === 0 && !isUploading && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No files attached
              </p>
            )}

            {attachments.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center space-x-2 p-2 bg-muted/30 rounded-lg">
                    {getFileIcon(attachment.file_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{attachment.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.file_size)}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadAttachment(attachment)}
                        className="h-6 w-6 p-0"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAttachment(attachment)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default FileUploadIcon;
