import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  Archive, 
  X, 
  Check,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FileUploadProps {
  onFileUploaded?: (fileData: UploadedFile) => void;
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
  multiple?: boolean;
  projectId?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploaded_at: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileUploaded,
  maxFileSize = 10,
  allowedTypes = ['image/*', 'application/pdf', 'text/*', '.zip', '.rar'],
  multiple = false,
  projectId
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />;
    if (type === 'application/pdf') return <FileText className="h-8 w-8 text-red-500" />;
    if (type.includes('zip') || type.includes('rar')) return <Archive className="h-8 w-8 text-yellow-500" />;
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size must be less than ${maxFileSize}MB`;
    }

    // Check file type
    const isAllowed = allowedTypes.some(type => {
      if (type.includes('*')) {
        return file.type.startsWith(type.replace('*', ''));
      }
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      return file.type === type;
    });

    if (!isAllowed) {
      return `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`;
    }

    return null;
  };

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    try {
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        toast({
          title: "Upload Error",
          description: validationError,
          variant: "destructive",
        });
        return null;
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // Simulate upload progress
      const fileId = Math.random().toString(36);
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const currentProgress = prev[fileId] || 0;
          if (currentProgress >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, [fileId]: currentProgress + 10 };
        });
      }, 200);

      // In a real implementation, you would upload to Supabase Storage:
      // const { data, error } = await supabase.storage
      //   .from('files')
      //   .upload(filePath, file);

      // For demo purposes, we'll simulate the upload
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Complete progress
      setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));

      // Create file record in database
      const { data: fileRecord, error } = await supabase
        .from('file_uploads')
        .insert({
          project_id: projectId,
          filename: file.name,
          file_size: file.size,
          file_type: file.type,
          file_path: filePath,
          uploaded_by: 'current_user' // This should be the actual user ID
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving file record:', error);
        toast({
          title: "Upload Error",
          description: "Failed to save file information",
          variant: "destructive",
        });
        return null;
      }

      const uploadedFile: UploadedFile = {
        id: fileRecord.id,
        name: file.name,
        size: file.size,
        type: file.type,
        url: `#${filePath}`, // In real implementation, this would be the actual URL
        uploaded_at: fileRecord.created_at
      };

      // Clean up progress
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }, 1000);

      return uploadedFile;

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleFiles = async (files: FileList) => {
    if (!files.length) return;

    setIsUploading(true);
    const filesToUpload = Array.from(files);

    try {
      const uploadPromises = filesToUpload.map(uploadFile);
      const results = await Promise.all(uploadPromises);
      
      const successfulUploads = results.filter((result): result is UploadedFile => result !== null);
      
      setUploadedFiles(prev => [...prev, ...successfulUploads]);
      
      successfulUploads.forEach(file => {
        onFileUploaded?.(file);
      });

      if (successfulUploads.length > 0) {
        toast({
          title: "Upload Successful",
          description: `${successfulUploads.length} file(s) uploaded successfully`,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-border-light hover:border-primary/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-8 text-center">
          <Upload className={`h-12 w-12 mx-auto mb-4 ${
            isDragging ? 'text-primary' : 'text-muted-foreground'
          }`} />
          
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {isDragging ? 'Drop files here' : 'Upload Files'}
          </h3>
          
          <p className="text-muted-foreground mb-4">
            Drag and drop files here, or click to select files
          </p>
          
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Select Files
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple={multiple}
            accept={allowedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="mt-4 text-xs text-muted-foreground">
            <p>Max file size: {maxFileSize}MB</p>
            <p>Allowed types: {allowedTypes.join(', ')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Uploading...</h4>
            {Object.entries(uploadProgress).map(([fileId, progress]) => (
              <div key={fileId} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading file...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Uploaded Files</h4>
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)} • {new Date(file.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <Check className="h-3 w-3 mr-1" />
                    Uploaded
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileUpload;
