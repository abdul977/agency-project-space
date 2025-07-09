import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  FolderPlus,
  Folder,
  FileText,
  Calendar,
  User,
  Building2,
  AlertTriangle,
  Edit,
  Check,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { notifyAdminOfClientUpdate } from "@/lib/notifications";
import SecurityManager from "@/lib/security";

interface Project {
  id: string;
  name: string;
  status: 'starting' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface Folder {
  id: string;
  name: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  inputs: FolderInput[];
}

interface FolderInput {
  id: string;
  folder_id: string;
  content: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [editingInputId, setEditingInputId] = useState<string | null>(null);
  const [editingInputContent, setEditingInputContent] = useState('');

  // Fetch project and folders
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId || !user) return;

      try {
        // Fetch project
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .eq('user_id', user.id)
          .single();

        if (projectError || !projectData) {
          toast({
            title: "Error",
            description: "Project not found or access denied",
            variant: "destructive",
          });
          navigate('/dashboard');
          return;
        }

        setProject(projectData as Project);

        // Fetch folders with inputs
        const { data: foldersData, error: foldersError } = await supabase
          .from('folders')
          .select(`
            *,
            folder_inputs (
              id,
              content,
              order_index,
              created_at,
              updated_at
            )
          `)
          .eq('project_id', projectId)
          .order('created_at', { ascending: true });

        if (foldersError) {
          console.error('Error fetching folders:', foldersError);
          toast({
            title: "Error",
            description: "Failed to load project folders",
            variant: "destructive",
          });
        } else {
          const foldersWithInputs = foldersData?.map(folder => ({
            ...folder,
            inputs: folder.folder_inputs?.map(input => ({
              ...input,
              folder_id: folder.id
            })).sort((a, b) => a.order_index - b.order_index) || []
          })) || [];
          setFolders(foldersWithInputs);
        }
      } catch (error) {
        console.error('Error fetching project data:', error);
        toast({
          title: "Error",
          description: "Failed to load project",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId, user, navigate, toast]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'starting':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'starting':
        return 'Starting';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const createFolder = async () => {
    if (!newFolderName.trim() || !projectId) return;

    setIsCreatingFolder(true);
    try {
      const { data: folder, error } = await supabase
        .from('folders')
        .insert({
          project_id: projectId,
          name: newFolderName.trim()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating folder:', error);
        toast({
          title: "Error",
          description: "Failed to create folder",
          variant: "destructive",
        });
      } else {
        const newFolder: Folder = {
          ...folder,
          inputs: []
        };
        setFolders(prev => [...prev, newFolder]);
        setNewFolderName("");
        toast({
          title: "Folder created",
          description: `${newFolderName} has been created successfully.`,
        });

        // Notify admin of new folder
        if (project && user) {
          await notifyAdminOfClientUpdate(
            user.full_name || 'Client',
            project.name,
            'folder_created'
          );
        }
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const addInput = async (folderId: string) => {
    try {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return;

      const nextOrderIndex = folder.inputs.length;

      const { data: input, error } = await supabase
        .from('folder_inputs')
        .insert({
          folder_id: folderId,
          content: '',
          order_index: nextOrderIndex
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding input:', error);
        toast({
          title: "Error",
          description: "Failed to add input field",
          variant: "destructive",
        });
      } else {
        setFolders(prev => prev.map(f => 
          f.id === folderId 
            ? { ...f, inputs: [...f.inputs, input] }
            : f
        ));
      }
    } catch (error) {
      console.error('Error adding input:', error);
    }
  };

  const updateInput = async (inputId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('folder_inputs')
        .update({ content })
        .eq('id', inputId);

      if (error) {
        console.error('Error updating input:', error);
        toast({
          title: "Error",
          description: "Failed to save input",
          variant: "destructive",
        });
      } else {
        setFolders(prev => prev.map(folder => ({
          ...folder,
          inputs: folder.inputs.map(input =>
            input.id === inputId ? { ...input, content } : input
          )
        })));

        // Notify admin of content update
        if (project && user) {
          await notifyAdminOfClientUpdate(
            user.full_name || 'Client',
            project.name,
            'content_updated'
          );
        }
      }
    } catch (error) {
      console.error('Error updating input:', error);
    }
  };

  const removeInput = async (inputId: string, folderId: string) => {
    try {
      const { error } = await supabase
        .from('folder_inputs')
        .delete()
        .eq('id', inputId);

      if (error) {
        console.error('Error removing input:', error);
        toast({
          title: "Error",
          description: "Failed to remove input",
          variant: "destructive",
        });
      } else {
        setFolders(prev => prev.map(f => 
          f.id === folderId 
            ? { ...f, inputs: f.inputs.filter(input => input.id !== inputId) }
            : f
        ));
        toast({
          title: "Input removed",
          description: "Input field has been removed successfully.",
        });
      }
    } catch (error) {
      console.error('Error removing input:', error);
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (!user || !projectId) return;

    setIsDeleting(true);
    try {
      // Security check: Verify user has access to this folder
      const canAccess = await SecurityManager.canAccessFolder(user.id, folderId);
      if (!canAccess) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to delete this folder",
          variant: "destructive",
        });
        return;
      }
      // First delete all folder inputs
      const { error: inputsError } = await supabase
        .from('folder_inputs')
        .delete()
        .eq('folder_id', folderId);

      if (inputsError) {
        console.error('Error deleting folder inputs:', inputsError);
        throw new Error('Failed to delete folder inputs');
      }

      // Then delete the folder
      const { error: folderError } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId)
        .eq('project_id', projectId); // Extra security check

      if (folderError) {
        console.error('Error deleting folder:', folderError);
        throw new Error('Failed to delete folder');
      }

      // Update local state
      setFolders(prev => prev.filter(f => f.id !== folderId));

      toast({
        title: "Folder deleted",
        description: "Folder and all its content have been deleted successfully.",
      });

      // Notify admin of folder deletion
      if (project && user) {
        await notifyAdminOfClientUpdate(
          user.full_name || 'Client',
          project.name,
          'folder_deleted'
        );
      }

    } catch (error) {
      console.error('Error deleting folder:', error);
      toast({
        title: "Error",
        description: "Failed to delete folder. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteFolderId(null);
    }
  };

  const startEditingFolder = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const cancelEditingFolder = () => {
    setEditingFolderId(null);
    setEditingFolderName('');
  };

  const saveFolderName = async (folderId: string) => {
    if (!user || !editingFolderName.trim()) return;

    try {
      const { error } = await supabase
        .from('folders')
        .update({
          name: editingFolderName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', folderId);

      if (error) {
        console.error('Error updating folder name:', error);
        toast({
          title: "Error",
          description: "Failed to update folder name",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setFolders(prev => prev.map(f =>
        f.id === folderId
          ? { ...f, name: editingFolderName.trim() }
          : f
      ));

      setEditingFolderId(null);
      setEditingFolderName('');

      toast({
        title: "Folder updated",
        description: "Folder name has been updated successfully",
      });

    } catch (error) {
      console.error('Error updating folder name:', error);
      toast({
        title: "Error",
        description: "Failed to update folder name",
        variant: "destructive",
      });
    }
  };

  const startEditingInput = (input: FolderInput) => {
    setEditingInputId(input.id);
    setEditingInputContent(input.content);
  };

  const cancelEditingInput = () => {
    setEditingInputId(null);
    setEditingInputContent('');
  };

  const saveInputContent = async (inputId: string) => {
    if (!user || !editingInputContent.trim()) return;

    try {
      const { error } = await supabase
        .from('folder_inputs')
        .update({
          content: editingInputContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', inputId);

      if (error) {
        console.error('Error updating input content:', error);
        toast({
          title: "Error",
          description: "Failed to update input content",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setFolders(prev => prev.map(folder => ({
        ...folder,
        inputs: folder.inputs.map(input =>
          input.id === inputId
            ? { ...input, content: editingInputContent.trim() }
            : input
        )
      })));

      setEditingInputId(null);
      setEditingInputContent('');

      toast({
        title: "Input updated",
        description: "Input content has been updated successfully",
      });

      // Notify admin of client update
      if (project && user) {
        await notifyAdminOfClientUpdate(
          user.full_name || 'Client',
          project.name,
          'input_updated'
        );
      }

    } catch (error) {
      console.error('Error updating input content:', error);
      toast({
        title: "Error",
        description: "Failed to update input content",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Project not found</h2>
          <Button asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-border-light bg-card">
        <div className="container mx-auto px-4 py-3 sm:py-4 lg:py-6 max-w-full overflow-x-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <Button variant="ghost" size="sm" asChild className="flex-shrink-0 self-start">
                <Link to="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                  <span className="sm:hidden">Back</span>
                </Link>
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg lg:text-xl font-bold text-foreground text-wrap break-words">
                  {project.name}
                </h1>
                <div className="flex flex-col xs:flex-row xs:items-center gap-2 mt-1">
                  <Badge className={`${getStatusColor(project.status)} text-xs`}>
                    {getStatusText(project.status)}
                  </Badge>
                  <span className="text-xs sm:text-sm text-muted-foreground text-wrap">
                    Created {formatDate(project.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8 max-w-full overflow-x-hidden">
        <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
          {/* Create New Folder */}
          <Card className="border-border-light">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg lg:text-xl">
                <FolderPlus className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <span className="truncate">Create New Folder</span>
              </CardTitle>
              <CardDescription className="text-sm">
                Organize your project requirements into folders
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                <Input
                  placeholder="Enter folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createFolder()}
                  className="flex-1 text-wrap-anywhere text-sm sm:text-base"
                />
                <Button
                  onClick={createFolder}
                  disabled={!newFolderName.trim() || isCreatingFolder}
                  className="bg-primary hover:bg-primary-hover w-full sm:w-auto flex-shrink-0 text-sm"
                >
                  {isCreatingFolder ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      <span className="hidden xs:inline">Create</span>
                      <span className="xs:hidden">Add</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Folders */}
          {folders.length === 0 ? (
            <Card className="border-border-light">
              <CardContent className="py-8 sm:py-12 text-center px-4 sm:px-6">
                <Folder className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                  No folders yet
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Create your first folder to start organizing your project requirements.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {folders.map((folder) => (
                <Card key={folder.id} className="border-border-light">
                  <CardHeader className="pb-4 sm:pb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Folder className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                        {editingFolderId === folder.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editingFolderName}
                              onChange={(e) => setEditingFolderName(e.target.value)}
                              className="flex-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  saveFolderName(folder.id);
                                } else if (e.key === 'Escape') {
                                  cancelEditingFolder();
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => saveFolderName(folder.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditingFolder}
                              className="text-gray-600 hover:text-gray-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <CardTitle className="text-wrap text-base sm:text-lg lg:text-xl flex-1 min-w-0">
                              <span className="text-wrap break-words">{folder.name}</span>
                            </CardTitle>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditingFolder(folder)}
                              className="text-gray-600 hover:text-gray-700 p-1"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteFolderId(folder.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription className="text-wrap text-sm">
                      {folder.inputs.length} input field{folder.inputs.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 text-container-safe px-4 sm:px-6">
                    {/* Input Fields */}
                    {folder.inputs.map((input, index) => (
                      <div key={input.id} className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                        <div className="flex-1 min-w-0 container-safe">
                          {editingInputId === input.id ? (
                            <div className="space-y-2">
                              <Textarea
                                placeholder={`Requirement ${index + 1}...`}
                                value={editingInputContent}
                                onChange={(e) => setEditingInputContent(e.target.value)}
                                className="min-h-[60px] sm:min-h-[80px] w-full max-w-full resize-none border-input-border focus:border-ring text-wrap-anywhere text-sm sm:text-base"
                                style={{
                                  wordWrap: 'break-word',
                                  overflowWrap: 'break-word',
                                  wordBreak: 'break-word',
                                  whiteSpace: 'pre-wrap',
                                  overflow: 'hidden',
                                  maxWidth: '100%'
                                }}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => saveInputContent(input.id)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEditingInput}
                                  className="text-gray-600 hover:text-gray-700"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="relative group">
                              <Textarea
                                placeholder={`Requirement ${index + 1}...`}
                                value={input.content}
                                onChange={(e) => updateInput(input.id, e.target.value)}
                                className="min-h-[60px] sm:min-h-[80px] w-full max-w-full resize-none border-input-border focus:border-ring text-wrap-anywhere text-sm sm:text-base"
                                style={{
                                  wordWrap: 'break-word',
                                  overflowWrap: 'break-word',
                                  wordBreak: 'break-word',
                                  whiteSpace: 'pre-wrap',
                                  overflow: 'hidden',
                                  maxWidth: '100%'
                                }}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEditingInput(input)}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-gray-700 p-1"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeInput(input.id, folder.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto flex-shrink-0 text-xs sm:text-sm"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-0" />
                          <span className="sm:hidden">Remove</span>
                        </Button>
                      </div>
                    ))}

                    {/* Add Input Button */}
                    <Button
                      variant="outline"
                      onClick={() => addInput(folder.id)}
                      className="w-full border-dashed text-sm sm:text-base py-2 sm:py-3"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      <span className="hidden xs:inline">Add Input Field</span>
                      <span className="xs:hidden">Add Field</span>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Folder Confirmation Dialog */}
      <Dialog open={!!deleteFolderId} onOpenChange={() => setDeleteFolderId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete Folder
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this folder? This action will permanently delete:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The folder and all its content</li>
                <li>All input fields within this folder</li>
              </ul>
              <strong className="text-red-600 block mt-2">This action cannot be undone.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteFolderId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteFolderId && deleteFolder(deleteFolderId)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDetail;
