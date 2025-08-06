import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  Database,
  HardDrive,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Trash2,
  Download,
  Upload,
  Search,
  Filter,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  FolderOpen,
  File,
  Calendar,
  User,
  Building2,
  MoreHorizontal,
  Zap,
  Shield,
  Globe
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface StorageFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  mime_type: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  owner_name: string;
  project_id?: string;
  project_name?: string;
  is_orphaned: boolean;
  last_accessed: string;
  download_count: number;
  source: 'deliverable' | 'input_attachment';
}

interface StorageStats {
  total_size: number;
  used_size: number;
  available_size: number;
  total_files: number;
  orphaned_files: number;
  file_types: Record<string, number>;
  largest_files: StorageFile[];
  oldest_files: StorageFile[];
}

const AdminFileStorage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('files');
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    setIsLoading(true);
    try {
      // Load files from Supabase Storage
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from('deliverables')
        .list('', {
          limit: 1000,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (storageError) {
        console.error('Error loading storage files:', storageError);
        throw storageError;
      }

      // Get file metadata and associated project/user info
      const filesWithMetadata: StorageFile[] = [];

      if (storageFiles && storageFiles.length > 0) {
        for (const file of storageFiles) {
          // Try to find associated deliverable record
          const { data: deliverable } = await supabase
            .from('deliverables')
            .select(`
              id,
              project_id,
              projects (
                id,
                name,
                user_id,
                users (
                  id,
                  full_name
                )
              )
            `)
            .eq('file_path', file.name)
            .single();

          // Try to find associated input attachment record
          const { data: inputAttachment } = await supabase
            .from('input_attachments')
            .select(`
              id,
              folder_input_id,
              file_name,
              file_path,
              file_size,
              file_type,
              uploaded_at,
              folder_inputs (
                id,
                folders (
                  id,
                  name,
                  project_id,
                  projects (
                    id,
                    name,
                    user_id,
                    users (
                      id,
                      full_name
                    )
                  )
                )
              )
            `)
            .eq('file_path', file.name)
            .single();

          const fileType = getFileType(file.metadata?.mimetype || '');

          // Determine owner and project info from either deliverable or input attachment
          let ownerId = 'unknown';
          let ownerName = 'Unknown';
          let projectId = undefined;
          let projectName = undefined;
          let isOrphaned = true;
          let source: 'deliverable' | 'input_attachment' = 'deliverable';

          if (deliverable) {
            ownerId = deliverable.projects?.users?.id || 'unknown';
            ownerName = deliverable.projects?.users?.full_name || 'Unknown';
            projectId = deliverable.project_id;
            projectName = deliverable.projects?.name;
            isOrphaned = false;
            source = 'deliverable';
          } else if (inputAttachment) {
            ownerId = inputAttachment.folder_inputs?.folders?.projects?.users?.id || 'unknown';
            ownerName = inputAttachment.folder_inputs?.folders?.projects?.users?.full_name || 'Unknown';
            projectId = inputAttachment.folder_inputs?.folders?.project_id;
            projectName = inputAttachment.folder_inputs?.folders?.projects?.name;
            isOrphaned = false;
            source = 'input_attachment';
          }

          filesWithMetadata.push({
            id: file.id || file.name,
            name: file.name,
            path: file.name,
            size: file.metadata?.size || 0,
            type: fileType,
            mime_type: file.metadata?.mimetype || 'application/octet-stream',
            created_at: file.created_at,
            updated_at: file.updated_at,
            owner_id: ownerId,
            owner_name: ownerName,
            project_id: projectId,
            project_name: projectName,
            is_orphaned: isOrphaned,
            last_accessed: file.last_accessed_at || file.created_at,
            download_count: 0, // Would need separate tracking table
            source: source
          });
        }
      }

      // Calculate real storage statistics
      const totalSize = filesWithMetadata.reduce((sum, file) => sum + file.size, 0);
      const orphanedFiles = filesWithMetadata.filter(f => f.is_orphaned).length;

      // Group files by type
      const fileTypes = filesWithMetadata.reduce((acc, file) => {
        acc[file.type] = (acc[file.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const stats: StorageStats = {
        total_size: 10737418240, // 10GB limit (would come from Supabase plan)
        used_size: totalSize,
        available_size: 10737418240 - totalSize,
        total_files: filesWithMetadata.length,
        orphaned_files: orphanedFiles,
        file_types: {
          document: fileTypes.document || 0,
          archive: fileTypes.archive || 0,
          image: fileTypes.image || 0,
          video: fileTypes.video || 0,
          audio: fileTypes.audio || 0,
          other: fileTypes.other || 0
        },
        largest_files: [...filesWithMetadata].sort((a, b) => b.size - a.size).slice(0, 5),
        oldest_files: [...filesWithMetadata].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).slice(0, 5)
      };

      setFiles(filesWithMetadata);
      setStats(stats);
    } catch (error) {
      console.error('Error loading storage data:', error);
      toast({
        title: "Error",
        description: "Failed to load storage data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to determine file type from MIME type
  const getFileType = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return 'archive';
    return 'other';
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || file.type === typeFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'orphaned' && file.is_orphaned) ||
      (statusFilter === 'active' && !file.is_orphaned);
    const matchesSource = sourceFilter === 'all' || file.source === sourceFilter;

    let matchesSize = true;
    if (sizeFilter !== 'all') {
      const sizeMB = file.size / (1024 * 1024);
      switch (sizeFilter) {
        case 'small':
          matchesSize = sizeMB < 1;
          break;
        case 'medium':
          matchesSize = sizeMB >= 1 && sizeMB < 10;
          break;
        case 'large':
          matchesSize = sizeMB >= 10;
          break;
      }
    }

    return matchesSearch && matchesType && matchesStatus && matchesSize && matchesSource;
  });

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const selectAllFiles = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.id)));
    }
  };

  const bulkDeleteFiles = async () => {
    setIsBulkOperating(true);
    try {
      const selectedIds = Array.from(selectedFiles);
      const filesToDelete = files.filter(f => selectedIds.includes(f.id));
      
      // In a real implementation, this would delete from Supabase Storage
      for (const file of filesToDelete) {
        const { error } = await supabase.storage
          .from('deliverables')
          .remove([file.path]);
        
        if (error) {
          console.error('Error deleting file:', file.path, error);
        }
      }

      setFiles(prev => prev.filter(f => !selectedIds.includes(f.id)));
      setSelectedFiles(new Set());

      toast({
        title: "Files Deleted",
        description: `${selectedIds.length} files deleted successfully`,
      });

    } catch (error) {
      console.error('Error bulk deleting files:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsBulkOperating(false);
    }
  };

  const cleanupOrphanedFiles = async () => {
    setIsBulkOperating(true);
    try {
      const orphanedFiles = files.filter(f => f.is_orphaned);
      
      for (const file of orphanedFiles) {
        const { error } = await supabase.storage
          .from('deliverables')
          .remove([file.path]);
        
        if (error) {
          console.error('Error deleting orphaned file:', file.path, error);
        }
      }

      setFiles(prev => prev.filter(f => !f.is_orphaned));

      toast({
        title: "Cleanup Complete",
        description: `${orphanedFiles.length} orphaned files removed`,
      });

      setIsCleanupModalOpen(false);

    } catch (error) {
      console.error('Error cleaning up orphaned files:', error);
      toast({
        title: "Error",
        description: "Failed to cleanup orphaned files",
        variant: "destructive",
      });
    } finally {
      setIsBulkOperating(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'image': return <Image className="h-4 w-4 text-green-500" />;
      case 'video': return <Video className="h-4 w-4 text-purple-500" />;
      case 'audio': return <Music className="h-4 w-4 text-orange-500" />;
      case 'archive': return <Archive className="h-4 w-4 text-yellow-500" />;
      default: return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'document': return 'bg-blue-100 text-blue-800';
      case 'image': return 'bg-green-100 text-green-800';
      case 'video': return 'bg-purple-100 text-purple-800';
      case 'audio': return 'bg-orange-100 text-orange-800';
      case 'archive': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">File & Storage Management</h2>
          <p className="text-muted-foreground">
            Monitor and manage file storage, cleanup orphaned files
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadStorageData}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          
          <AlertDialog open={isCleanupModalOpen} onOpenChange={setIsCleanupModalOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Cleanup
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cleanup Orphaned Files</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {stats?.orphaned_files || 0} orphaned files that are no longer associated with any project. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={cleanupOrphanedFiles}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Orphaned Files
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'files' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('files')}
          className="flex items-center gap-2"
        >
          <FolderOpen className="h-4 w-4" />
          Files
        </Button>
        <Button
          variant={activeTab === 'storage' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('storage')}
          className="flex items-center gap-2"
        >
          <HardDrive className="h-4 w-4" />
          Storage
        </Button>
      </div>

      {activeTab === 'storage' && stats && (
        <div className="space-y-6">
          {/* Storage Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{formatFileSize(stats.used_size)}</p>
                    <p className="text-sm text-muted-foreground">Used Storage</p>
                  </div>
                  <HardDrive className="h-8 w-8 text-blue-600" />
                </div>
                <div className="mt-4">
                  <Progress 
                    value={(stats.used_size / stats.total_size) * 100} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatFileSize(stats.available_size)} available
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.total_files}</p>
                    <p className="text-sm text-muted-foreground">Total Files</p>
                  </div>
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
                <div className="flex items-center mt-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">
                    {stats.total_files - stats.orphaned_files} active
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.orphaned_files}</p>
                    <p className="text-sm text-muted-foreground">Orphaned Files</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
                <div className="flex items-center mt-2">
                  <Trash2 className="h-4 w-4 text-orange-500 mr-1" />
                  <span className="text-sm text-orange-600">Need cleanup</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* File Types Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>File Types Distribution</CardTitle>
              <CardDescription>
                Breakdown of files by type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(stats.file_types).map(([type, count]) => (
                  <div key={type} className="text-center">
                    <div className="flex justify-center mb-2">
                      {getFileIcon(type)}
                    </div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-muted-foreground capitalize">{type}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Largest Files */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Largest Files</CardTitle>
                <CardDescription>
                  Files taking up the most storage space
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.largest_files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.type)}
                        <div>
                          <p className="font-medium text-sm">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{file.owner_name}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{formatFileSize(file.size)}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Oldest Files</CardTitle>
                <CardDescription>
                  Files that haven't been accessed recently
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.oldest_files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.type)}
                        <div>
                          <p className="font-medium text-sm">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(file.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {file.is_orphaned && (
                        <Badge variant="destructive">Orphaned</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files by name, owner, or project..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Filter Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="File type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="document">Documents</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="archive">Archives</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="deliverable">Deliverables</SelectItem>
                    <SelectItem value="input_attachment">Input Uploads</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Files</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="orphaned">Orphaned</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sizeFilter} onValueChange={setSizeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="File size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sizes</SelectItem>
                    <SelectItem value="small">Small (&lt; 1MB)</SelectItem>
                    <SelectItem value="medium">Medium (1-10MB)</SelectItem>
                    <SelectItem value="large">Large (&gt; 10MB)</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {filteredFiles.length} of {files.length} files
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Operations */}
          {selectedFiles.size > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedFiles.size === filteredFiles.length}
                      onCheckedChange={selectAllFiles}
                    />
                    <span className="text-sm font-medium">
                      {selectedFiles.size} selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isBulkOperating}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Selected
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Selected Files</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {selectedFiles.size} selected files? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={bulkDeleteFiles}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete All
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFiles(new Set())}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Files Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Files</CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
                    onCheckedChange={selectAllFiles}
                  />
                  <span className="text-sm text-muted-foreground">Select All</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredFiles.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No files found
                  </h3>
                  <p className="text-muted-foreground">
                    {files.length === 0
                      ? "No files have been uploaded yet"
                      : "No files match your current filters"
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={selectedFiles.has(file.id)}
                          onCheckedChange={() => toggleFileSelection(file.id)}
                          className="mt-1"
                        />

                        <div className="flex-1 space-y-2">
                          {/* Header Row */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {getFileIcon(file.type)}
                              <h3 className="font-semibold text-foreground">
                                {file.name}
                              </h3>
                              <Badge className={getTypeColor(file.type)}>
                                {file.type}
                              </Badge>
                              <Badge variant="outline">
                                {formatFileSize(file.size)}
                              </Badge>
                              <Badge variant={file.source === 'input_attachment' ? 'default' : 'secondary'}>
                                {file.source === 'input_attachment' ? 'Input Upload' : 'Deliverable'}
                              </Badge>
                              {file.is_orphaned && (
                                <Badge variant="destructive">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Orphaned
                                </Badge>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>

                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete File</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{file.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>

                          {/* File Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span>{file.owner_name}</span>
                            </div>
                            {file.project_name && (
                              <div className="flex items-center gap-1">
                                <FolderOpen className="h-4 w-4" />
                                <span>{file.project_name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Created {new Date(file.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              <span>{file.download_count} downloads</span>
                            </div>
                          </div>

                          {/* File Path */}
                          <div className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded">
                            {file.path}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminFileStorage;
